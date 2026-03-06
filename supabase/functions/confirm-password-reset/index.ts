import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
  let password = "";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  const syms = "!@#$%&*";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += nums[Math.floor(Math.random() * nums.length)];
  password += syms[Math.floor(Math.random() * syms.length)];
  for (let i = 4; i < 14; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

// Simple in-memory rate limiter per token (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ConfirmSchema = z.object({
      token: z.string().min(32).max(128),
    });

    let validated: z.infer<typeof ConfirmSchema>;
    try {
      const body = await req.json();
      validated = ConfirmSchema.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Token inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = validated;

    // Rate limit by token to prevent brute-force attempts
    if (isRateLimited(token)) {
      return new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find and validate token
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !resetToken) {
      return new Response(JSON.stringify({ error: "TOKEN_INVALID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resetToken.used_at) {
      return new Response(JSON.stringify({ error: "TOKEN_USED" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "TOKEN_EXPIRED" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = resetToken.user_id;

    // Get user email from profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    const newPassword = generatePassword();

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) throw updateError;

    // Mark token as used
    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    // Mark is_default_password = true
    await supabaseAdmin
      .from("profiles")
      .update({ is_default_password: true })
      .eq("id", userId);

    // Send email with new temp password
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (brevoKey && profile?.email) {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: "lrodriguesdasilva@gmail.com", name: "Health Coach" },
          to: [{ email: profile.email }],
          subject: "Sua nova senha temporária — Health Coach",
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #2D9B6B;">Health Coach</h2>
              <p>Sua nova senha temporária foi gerada com sucesso. Use-a para acessar o sistema:</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <code style="font-size: 18px; font-weight: bold; color: #15803d; letter-spacing: 2px;">${newPassword}</code>
              </div>
              <p style="color: #666; font-size: 14px;">Você será solicitado a trocar esta senha no próximo acesso.</p>
              <p style="color: #999; font-size: 12px;">Se você não solicitou esta alteração, entre em contato com o suporte.</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("confirm-password-reset error:", err);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

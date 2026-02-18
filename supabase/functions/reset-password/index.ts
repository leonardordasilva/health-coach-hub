import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateSecureToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeHex(bytes);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ResetPasswordSchema = z.object({
      email: z.string().email().max(255).optional(),
      userId: z.string().uuid().optional(),
    });

    let validated: z.infer<typeof ResetPasswordSchema>;
    try {
      const body = await req.json();
      validated = ResetPasswordSchema.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Dados inválidos." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if called by admin (has Authorization header)
    const authHeader = req.headers.get("Authorization");
    let isAdminCall = false;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabaseUser.auth.getClaims(token);
      if (claimsData?.claims) {
        const requesterId = claimsData.claims.sub;
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", requesterId)
          .single();
        isAdminCall = roleRow?.role === "admin";
      }
    }

    const { email, userId } = validated;

    // Find user
    let targetEmail = email;
    let targetUserId = userId;

    if (!targetUserId && email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .single();
      if (profile) {
        targetUserId = profile.id;
        targetEmail = profile.email;
      }
    } else if (targetUserId && !targetEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", targetUserId)
        .single();
      if (profile) targetEmail = profile.email;
    }

    if (!targetUserId) {
      // Neutral response to prevent user enumeration
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--9aba2c63-1002-4782-a134-e620c452e4ca.lovable.app";
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (isAdminCall) {
      // Admin reset: also send link (same flow, just no auth check required for link)
    }

    // Generate a secure token valid for 1 hour
    const token = await generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Invalidate any previous unused tokens for this user
    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", targetUserId)
      .is("used_at", null);

    // Store new token
    await supabaseAdmin.from("password_reset_tokens").insert({
      user_id: targetUserId,
      token,
      expires_at: expiresAt,
    });

    const confirmUrl = `${appUrl}/confirmar-reset?token=${token}`;

    // Send email with confirmation link
    if (resendKey && targetEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Health Coach <onboarding@resend.dev>",
          to: [targetEmail],
          subject: "Redefinição de senha — Health Coach",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #2D9B6B;">Health Coach</h2>
              <p>Recebemos uma solicitação de redefinição de senha para sua conta.</p>
              <p>Clique no botão abaixo para gerar sua nova senha temporária:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${confirmUrl}"
                   style="background: #2D9B6B; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                  Gerar nova senha
                </a>
              </div>
              <p style="color: #666; font-size: 13px;">Este link é válido por <strong>1 hora</strong>. Após isso, será necessário solicitar novamente.</p>
              <p style="color: #999; font-size: 12px;">Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

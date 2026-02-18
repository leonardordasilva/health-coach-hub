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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify the requester is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT and get requester identity
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify requester is an admin
    const requesterId = claimsData.claims.sub;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .single();

    if (roleRow?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ResetPasswordSchema = z.object({
      email: z.string().email().max(255).optional(),
      userId: z.string().uuid().optional(),
    });

    let validated: z.infer<typeof ResetPasswordSchema>;
    try {
      const body = await req.json();
      validated = ResetPasswordSchema.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request data." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, userId } = validated;

    // Find user by email if userId not provided
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
    }

    if (!targetUserId) {
      // User not found — return neutral response for security
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newPassword = generatePassword();

    // Update password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );
    if (updateError) throw updateError;

    // Mark is_default_password = true
    await supabaseAdmin
      .from("profiles")
      .update({ is_default_password: true })
      .eq("id", targetUserId);

    // Send email if RESEND_API_KEY is configured
    const resendKey = Deno.env.get("RESEND_API_KEY");
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
          subject: "Sua nova senha — Health Coach",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #2D9B6B;">Health Coach</h2>
              <p>Sua senha foi redefinida. Use a senha temporária abaixo para acessar o sistema:</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <code style="font-size: 18px; font-weight: bold; color: #15803d; letter-spacing: 2px;">${newPassword}</code>
              </div>
              <p style="color: #666; font-size: 14px;">Você será solicitado a trocar esta senha no próximo acesso.</p>
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
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

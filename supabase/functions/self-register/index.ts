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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RegisterSchema = z.object({
      email: z.string().email().max(255),
    });

    let validated: z.infer<typeof RegisterSchema>;
    try {
      const body = await req.json();
      validated = RegisterSchema.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Dados inválidos." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = validated;

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "EMAIL_EXISTS" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generatePassword();

    // Create user in Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createError) throw createError;

    const userId = newUser.user.id;

    // Mark as default password (profile row created by trigger)
    await supabaseAdmin.from("profiles").update({ is_default_password: true }).eq("id", userId);

    // Insert user role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "user" });

    // Send welcome email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Health Coach <onboarding@resend.dev>",
          to: [email],
          subject: "Bem-vindo ao Health Coach!",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #2D9B6B;">Bem-vindo ao Health Coach! 🌱</h2>
              <p>Sua conta foi criada com sucesso. Use as credenciais abaixo para acessar o sistema:</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>E-mail:</strong> ${email}</p>
                <p style="margin: 4px 0;"><strong>Senha temporária:</strong> <code style="font-weight: bold; color: #15803d;">${tempPassword}</code></p>
              </div>
              <p style="color: #666; font-size: 14px;">Você será solicitado a trocar esta senha e completar seu cadastro no primeiro acesso.</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("self-register error:", err);
    return new Response(JSON.stringify({ error: "Ocorreu um erro. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

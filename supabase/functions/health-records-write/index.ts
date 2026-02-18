import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES-GCM encryption helpers
async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret).slice(0, 32).buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

async function encrypt(data: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(data)
  );
  // Combine iv + ciphertext, base64 encode
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const encryptionKey = Deno.env.get("HEALTH_ENCRYPTION_KEY")!;

    const body = await req.json();
    const { id, record_date, weight, body_fat, water, basal_metabolism, visceral_fat, muscle, protein, bone_mass } = body;

    if (!record_date || weight === undefined || weight === null) {
      return new Response(JSON.stringify({ error: "record_date and weight are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encrypt all sensitive fields including weight
    const sensitiveData = JSON.stringify({ weight: Number(weight), body_fat, water, basal_metabolism, visceral_fat, muscle, protein, bone_mass });
    const encryptedData = await encrypt(sensitiveData, encryptionKey);

    const payload = {
      user_id: userId,
      record_date,
      weight: 0, // placeholder — real value is encrypted
      body_fat: null,
      water: null,
      basal_metabolism: null,
      visceral_fat: null,
      muscle: null,
      protein: null,
      bone_mass: null,
      encrypted_data: encryptedData,
    };

    let error;
    if (id) {
      // Update — verify ownership via RLS
      ({ error } = await supabase.from("health_records").update(payload).eq("id", id).eq("user_id", userId));
    } else {
      ({ error } = await supabase.from("health_records").insert(payload));
    }

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("health-records-write error:", err);
    const code = (err as { code?: string })?.code;
    const isDuplicate = code === "23505";
    return new Response(
      JSON.stringify({ error: isDuplicate ? "health_records_user_date_unique" : "An error occurred. Please try again." }),
      {
        status: isDuplicate ? 409 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

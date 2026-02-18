import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
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

    const encryptionKey = Deno.env.get("HEALTH_ENCRYPTION_KEY")!;

    const { data: rows, error } = await supabase
      .from("health_records")
      .select("id, user_id, record_date, weight, encrypted_data, created_at")
      .order("record_date", { ascending: false });

    if (error) throw error;

    // Decrypt each record
    const records = await Promise.all((rows ?? []).map(async (row) => {
      let decrypted: Record<string, number | null> = {
        body_fat: null, water: null, basal_metabolism: null,
        visceral_fat: null, muscle: null, protein: null, bone_mass: null,
      };

      if (row.encrypted_data) {
        try {
          const plain = await decrypt(row.encrypted_data, encryptionKey);
          decrypted = JSON.parse(plain);
        } catch {
          // If decryption fails (e.g., old plaintext records), keep nulls
        }
      }

      return {
        id: row.id,
        user_id: row.user_id,
        record_date: row.record_date,
        weight: row.weight,
        created_at: row.created_at,
        ...decrypted,
      };
    }));

    return new Response(JSON.stringify({ records }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("health-records-read error:", err);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

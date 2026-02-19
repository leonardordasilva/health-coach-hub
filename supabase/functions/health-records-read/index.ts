import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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

    const records = await Promise.all((rows ?? []).map(async (row) => {
      let decrypted: Record<string, number | null> = {
        weight: null, body_fat: null, water: null, basal_metabolism: null,
        visceral_fat: null, muscle: null, protein: null, bone_mass: null,
      };

      if (row.encrypted_data) {
        try {
          const plain = await decrypt(row.encrypted_data, encryptionKey);
          decrypted = JSON.parse(plain);
        } catch {
          decrypted.weight = row.weight;
        }
      } else {
        decrypted.weight = row.weight;
      }

      return {
        id: row.id,
        user_id: row.user_id,
        record_date: row.record_date,
        weight: decrypted.weight ?? row.weight,
        created_at: row.created_at,
        body_fat: decrypted.body_fat ?? null,
        water: decrypted.water ?? null,
        basal_metabolism: decrypted.basal_metabolism ?? null,
        visceral_fat: decrypted.visceral_fat ?? null,
        muscle: decrypted.muscle ?? null,
        protein: decrypted.protein ?? null,
        bone_mass: decrypted.bone_mass ?? null,
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

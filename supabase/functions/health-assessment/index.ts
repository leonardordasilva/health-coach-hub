import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { record, profile } = body;

    // Build context string for the AI
    const lines: string[] = [];
    lines.push(`Dados do paciente:`);
    if (profile.age) lines.push(`- Idade real: ${profile.age} anos`);
    if (profile.height) lines.push(`- Altura: ${profile.height} cm`);
    if (record.weight) lines.push(`- Peso: ${record.weight} kg`);
    if (record.bmi) lines.push(`- IMC: ${record.bmi} (${record.bmiClassification})`);
    if (record.bodyAge !== null) lines.push(`- Idade corporal estimada: ${record.bodyAge} anos`);
    if (record.bodyType) lines.push(`- Tipo de corpo: ${record.bodyType}`);
    if (record.body_fat != null) lines.push(`- Gordura corporal: ${record.body_fat}%`);
    if (record.water != null) lines.push(`- Água corporal: ${record.water}%`);
    if (record.muscle != null) lines.push(`- Massa muscular: ${record.muscle} kg`);
    if (record.protein != null) lines.push(`- Proteína: ${record.protein}%`);
    if (record.visceral_fat != null) lines.push(`- Gordura visceral: ${record.visceral_fat}`);
    if (record.basal_metabolism != null) lines.push(`- Metabolismo basal: ${record.basal_metabolism} kcal`);
    if (record.bone_mass != null) lines.push(`- Massa óssea: ${record.bone_mass} kg`);

    const prompt = `${lines.join("\n")}

Com base nesses dados de composição corporal, forneça uma avaliação de saúde estruturada em JSON com o seguinte formato exato:
{
  "positivos": ["ponto positivo 1", "ponto positivo 2", ...],
  "negativos": ["ponto negativo 1", ...],
  "atencao": ["ponto de atenção 1", ...],
  "sugestoes": ["sugestão 1", "sugestão 2", ...]
}

Regras:
- Cada lista deve ter entre 1 e 4 itens relevantes. Se não houver dados para um campo, retorne lista vazia.
- Seja direto, claro e prático. Escreva em português do Brasil.
- Baseie-se em referências clínicas conhecidas (OMS, ACSM).
- Não mencione que é uma IA. Não faça recomendações médicas formais.
- Retorne APENAS o JSON, sem texto adicional.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em saúde, nutrição e composição corporal. Analisa dados de bioimpedância e fornece avaliações claras e práticas em português do Brasil. Sempre responde apenas com JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", errText);
      throw new Error("AI gateway error");
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    const assessment = JSON.parse(content);

    return new Response(JSON.stringify({ assessment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("health-assessment error:", err);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

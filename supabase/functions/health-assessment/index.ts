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
    const { assessmentType, record, records, profile } = body;

    const genderLabel: Record<string, string> = { male: "masculino", female: "feminino", other: "outro" };
    const gender = profile?.gender ? genderLabel[profile.gender] ?? profile.gender : null;

    const profileLines: string[] = [];
    if (profile?.age) profileLines.push(`- Idade: ${profile.age} anos`);
    if (gender) profileLines.push(`- Sexo: ${gender}`);
    if (profile?.height) profileLines.push(`- Altura: ${profile.height} cm`);

    let prompt = "";

    if (assessmentType === "latest" && record) {
      // Single record assessment
      const lines = [...profileLines];
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

      prompt = `${lines.join("\n")}

Com base nesses dados de composição corporal do registro mais recente, forneça uma avaliação de saúde estruturada em JSON:
{
  "positivos": ["ponto positivo 1", ...],
  "negativos": ["ponto negativo 1", ...],
  "atencao": ["ponto de atenção 1", ...],
  "sugestoes": ["sugestão 1", ...]
}

Regras:
- Cada lista deve ter entre 1 e 4 itens relevantes. Se não houver dados suficientes para um campo, retorne lista vazia.
- Seja direto, claro e prático. Escreva em português do Brasil.
- Baseie-se em referências clínicas (OMS, ACSM). Considere o sexo do paciente nas referências de composição corporal.
- Não mencione que é uma IA. Não faça recomendações médicas formais.
- Retorne APENAS o JSON, sem texto adicional.`;

    } else if (assessmentType === "general" && records?.length > 0) {
      // Multi-record historical assessment
      // Sort records chronologically
      const sorted = [...records].sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.record_date).localeCompare(String(b.record_date))
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const formatRecord = (r: Record<string, unknown>, label: string) => {
        const lines = [`  ${label}:`];
        if (r.record_date) lines.push(`    Data: ${r.record_date}`);
        if (r.weight) lines.push(`    Peso: ${r.weight} kg`);
        if (r.bmi) lines.push(`    IMC: ${r.bmi} (${r.bmiClassification})`);
        if (r.bodyType) lines.push(`    Tipo de corpo: ${r.bodyType}`);
        if (r.body_fat != null) lines.push(`    Gordura corporal: ${r.body_fat}%`);
        if (r.water != null) lines.push(`    Água corporal: ${r.water}%`);
        if (r.muscle != null) lines.push(`    Massa muscular: ${r.muscle} kg`);
        if (r.protein != null) lines.push(`    Proteína: ${r.protein}%`);
        if (r.visceral_fat != null) lines.push(`    Gordura visceral: ${r.visceral_fat}`);
        if (r.basal_metabolism != null) lines.push(`    Metabolismo basal: ${r.basal_metabolism} kcal`);
        return lines.join("\n");
      };

      const lines = [
        `Dados do paciente:`,
        ...profileLines,
        ``,
        `Histórico de ${sorted.length} registro(s):`,
        formatRecord(first, "Primeiro registro"),
        ...sorted.slice(1, -1).map((r: Record<string, unknown>, i: number) => formatRecord(r, `Registro intermediário ${i + 1}`)),
        ...(sorted.length > 1 ? [formatRecord(last, "Registro mais recente")] : []),
      ];

      prompt = `${lines.join("\n")}

Com base no histórico completo de registros de composição corporal, forneça uma avaliação da evolução e estado geral de saúde em JSON:
{
  "positivos": ["ponto positivo 1", ...],
  "negativos": ["ponto negativo 1", ...],
  "atencao": ["ponto de atenção 1", ...],
  "sugestoes": ["sugestão 1", ...]
}

Regras:
- Avalie tendências e evolução ao longo do tempo, não apenas o registro mais recente.
- Cada lista deve ter entre 1 e 4 itens relevantes. Se não houver dados para um campo, retorne lista vazia.
- Seja direto, claro e prático. Escreva em português do Brasil.
- Baseie-se em referências clínicas (OMS, ACSM). Considere o sexo do paciente nas referências.
- Não mencione que é uma IA. Não faça recomendações médicas formais.
- Retorne APENAS o JSON, sem texto adicional.`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: "Você é um especialista em saúde, nutrição e composição corporal. Analisa dados de bioimpedância e históricos clínicos, fornecendo avaliações claras e práticas em português do Brasil. Sempre responde apenas com JSON válido.",
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, Lightbulb, Loader2, ChevronDown, ChevronUp, ClipboardList, History } from "lucide-react";
import { toast } from "sonner";
import { calculateBMI, calculateBodyAge, calculateBodyType, formatMonthYear } from "@/lib/health";
import type { HealthRecord } from "@/types/health";

interface Profile {
  height: number | null;
  birth_date: string | null;
  age: number | null;
  gender?: string | null;
}

interface Assessment {
  positivos: string[];
  negativos: string[];
  atencao: string[];
  sugestoes: string[];
}

type AssessmentType = "latest" | "general";

interface Props {
  record: HealthRecord;
  allRecords: HealthRecord[];
  profile: Profile;
}

const sections = [
  { key: "positivos" as keyof Assessment, label: "Pontos Positivos", icon: ThumbsUp, colorClass: "text-success", bgClass: "bg-success/8 border-success/25", iconBg: "bg-success/15" },
  { key: "negativos" as keyof Assessment, label: "Pontos Negativos", icon: ThumbsDown, colorClass: "text-destructive", bgClass: "bg-destructive/8 border-destructive/25", iconBg: "bg-destructive/15" },
  { key: "atencao" as keyof Assessment, label: "Pontos de Atenção", icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/8 border-warning/25", iconBg: "bg-warning/15" },
  { key: "sugestoes" as keyof Assessment, label: "Sugestões de Melhora", icon: Lightbulb, colorClass: "text-primary", bgClass: "bg-primary/8 border-primary/20", iconBg: "bg-primary/15" },
];

const recordSnapshot = (r: HealthRecord) =>
  JSON.stringify([r.id, r.record_date, r.weight, r.body_fat, r.water, r.basal_metabolism, r.visceral_fat, r.muscle, r.protein, r.bone_mass]);

const snapshotLatest = (r: HealthRecord) => recordSnapshot(r);
const snapshotGeneral = (rs: HealthRecord[]) =>
  JSON.stringify([...rs].sort((a, b) => a.id.localeCompare(b.id)).map(recordSnapshot));

export default function HealthAssessment({ record, allRecords, profile }: Props) {
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeType, setActiveType] = useState<AssessmentType | null>(null);
  const [assessments, setAssessments] = useState<Partial<Record<AssessmentType, Assessment>>>({});
  const [snapshots, setSnapshots] = useState<Partial<Record<AssessmentType, string>>>({});

  useEffect(() => {
    const loadCache = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCacheLoading(false); return; }

      const { data, error } = await supabase
        .from("health_assessment_cache")
        .select("assessment_type, data_snapshot, assessment")
        .eq("user_id", user.id);

      if (!error && data) {
        const cachedAssessments: Partial<Record<AssessmentType, Assessment>> = {};
        const cachedSnapshots: Partial<Record<AssessmentType, string>> = {};
        for (const row of data) {
          const type = row.assessment_type as AssessmentType;
          cachedAssessments[type] = row.assessment as unknown as Assessment;
          cachedSnapshots[type] = row.data_snapshot;
        }
        setAssessments(cachedAssessments);
        setSnapshots(cachedSnapshots);
      }
      setCacheLoading(false);
    };
    loadCache();
  }, []);

  const currentSnapshot = (type: AssessmentType) =>
    type === "latest" ? snapshotLatest(record) : snapshotGeneral(allRecords);

  const dataChangedFor = (type: AssessmentType) => {
    const saved = snapshots[type];
    if (!saved) return false;
    return currentSnapshot(type) !== saved;
  };

  const buildRecordPayload = (r: HealthRecord) => {
    const height = profile.height;
    const age = profile.age ?? 0;
    let bmi = null, bmiClassification = null, bodyAge = null, bodyType = null;
    if (height) {
      const bmiResult = calculateBMI(r.weight, height);
      bmi = bmiResult.value;
      bmiClassification = bmiResult.classification;
      bodyAge = calculateBodyAge(age, bmiResult.value, r.body_fat, r.muscle, r.weight);
      if (r.body_fat != null && r.muscle != null) {
        const bt = calculateBodyType(r.weight, height, age, bmiResult.value, r.body_fat, r.muscle);
        bodyType = bt.type;
      }
    }
    return { ...r, bmi, bmiClassification, bodyAge, bodyType };
  };

  const handleSelectType = async (type: AssessmentType) => {
    const cached = assessments[type];
    if (cached && !dataChangedFor(type)) {
      setActiveType(type);
      setExpanded(true);
      return;
    }
    await callAPI(type);
  };

  const saveToDB = async (type: AssessmentType, snap: string, assessment: Assessment) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from("health_assessment_cache")
      .upsert(
        [{ user_id: user.id, assessment_type: type, data_snapshot: snap, assessment: assessment as any }],
        { onConflict: "user_id,assessment_type" }
      );
  };

  const callAPI = async (type: AssessmentType) => {
    setLoading(true);
    setActiveType(type);
    try {
      const body =
        type === "latest"
          ? { assessmentType: "latest", record: buildRecordPayload(record), profile: { height: profile.height, age: profile.age ?? 0, gender: profile.gender } }
          : { assessmentType: "general", records: allRecords.map(buildRecordPayload), profile: { height: profile.height, age: profile.age ?? 0, gender: profile.gender } };

      const { data, error } = await supabase.functions.invoke("health-assessment", { body });
      if (error) throw error;

      const snap = currentSnapshot(type);
      setAssessments(prev => ({ ...prev, [type]: data.assessment }));
      setSnapshots(prev => ({ ...prev, [type]: snap }));
      await saveToDB(type, snap, data.assessment);
      setExpanded(true);
    } catch (err) {
      console.error("Assessment error:", err);
      toast.error("Erro ao gerar avaliação. Tente novamente.");
      setActiveType(null);
    } finally {
      setLoading(false);
    }
  };

  const assessment = activeType ? assessments[activeType] ?? null : null;
  const hasDataChanged = activeType ? dataChangedFor(activeType) : false;
  const hasData = assessment && sections.some(s => (assessment[s.key]?.length ?? 0) > 0);

  if (!activeType) {
    if (cacheLoading) {
      return (
        <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm">Carregando avaliação…</span>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Gerar Avaliação de Saúde com IA</p>
        </div>
        <p className="text-xs text-muted-foreground">Escolha o tipo de avaliação:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => handleSelectType("latest")}
            className="flex items-start gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/25 transition-colors">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Registro atual</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Avalia os dados do registro mais recente ({formatMonthYear(record.record_date)})
                {assessments["latest"] && !dataChangedFor("latest") && (
                  <span className="ml-1 text-success">· avaliação salva</span>
                )}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelectType("general")}
            disabled={allRecords.length < 2}
            className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/40 hover:bg-accent hover:border-border transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-accent-foreground/10 transition-colors">
              <History className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Histórico geral</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allRecords.length < 2
                  ? "Necessário ao menos 2 registros"
                  : `Analisa todos os ${allRecords.length} registros e a evolução ao longo do tempo`}
                {assessments["general"] && !dataChangedFor("general") && allRecords.length >= 2 && (
                  <span className="ml-1 text-success">· avaliação salva</span>
                )}
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Gerando avaliação{activeType === "general" ? " do histórico" : ""}…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Avaliação — {activeType === "general" ? "Histórico Geral" : `Registro de ${formatMonthYear(record.record_date)}`}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Ocultar" : "Exibir"}
        </button>
      </div>

      {assessment && expanded && hasData && (
        <div className="space-y-2.5 animate-fade-in">
          {sections.map((s) => {
            const items = assessment[s.key] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={s.key} className={`rounded-xl border p-3.5 ${s.bgClass}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.colorClass}`} />
                  </div>
                  <p className={`text-sm font-semibold ${s.colorClass}`}>{s.label}</p>
                </div>
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.colorClass.replace("text-", "bg-")}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button onClick={() => setActiveType(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Trocar tipo
        </button>
        {hasDataChanged ? (
          <button
            onClick={() => callAPI(activeType!)}
            disabled={loading}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3 h-3" />
            Regenerar com novos dados
          </button>
        ) : (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-1 cursor-default select-none">
            <Sparkles className="w-3 h-3" />
            Sem alterações nos dados
          </span>
        )}
      </div>
    </div>
  );
}

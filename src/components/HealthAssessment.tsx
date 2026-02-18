import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, Lightbulb, Loader2, ChevronDown, ChevronUp, ClipboardList, History } from "lucide-react";
import { toast } from "sonner";
import { calculateBMI, calculateBodyAge, calculateBodyType, formatMonthYear } from "@/lib/health";

interface HealthRecord {
  id: string;
  record_date: string;
  weight: number;
  body_fat: number | null;
  water: number | null;
  basal_metabolism: number | null;
  visceral_fat: number | null;
  muscle: number | null;
  protein: number | null;
  bone_mass: number | null;
}

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
  record: HealthRecord;           // most recent record
  allRecords: HealthRecord[];     // full history
  profile: Profile;
}

const sections = [
  {
    key: "positivos" as keyof Assessment,
    label: "Pontos Positivos",
    icon: ThumbsUp,
    colorClass: "text-success",
    bgClass: "bg-success/8 border-success/25",
    iconBg: "bg-success/15",
  },
  {
    key: "negativos" as keyof Assessment,
    label: "Pontos Negativos",
    icon: ThumbsDown,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/8 border-destructive/25",
    iconBg: "bg-destructive/15",
  },
  {
    key: "atencao" as keyof Assessment,
    label: "Pontos de Atenção",
    icon: AlertTriangle,
    colorClass: "text-warning",
    bgClass: "bg-warning/8 border-warning/25",
    iconBg: "bg-warning/15",
  },
  {
    key: "sugestoes" as keyof Assessment,
    label: "Sugestões de Melhora",
    icon: Lightbulb,
    colorClass: "text-primary",
    bgClass: "bg-primary/8 border-primary/20",
    iconBg: "bg-primary/15",
  },
];

// Canonical snapshot of a record's raw data fields (no derived metrics)
const recordSnapshot = (r: HealthRecord) =>
  JSON.stringify([
    r.id, r.record_date, r.weight, r.body_fat, r.water,
    r.basal_metabolism, r.visceral_fat, r.muscle, r.protein, r.bone_mass,
  ]);

const snapshotLatest = (r: HealthRecord) => recordSnapshot(r);
const snapshotGeneral = (rs: HealthRecord[]) =>
  JSON.stringify([...rs].sort((a, b) => a.id.localeCompare(b.id)).map(recordSnapshot));

export default function HealthAssessment({ record, allRecords, profile }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [generatedType, setGeneratedType] = useState<AssessmentType | null>(null);
  // Snapshots por tipo — mantidos independentemente para bloquear regeneração sem mudança
  const [snapshots, setSnapshots] = useState<Partial<Record<AssessmentType, string>>>({});

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

  // Se já existe snapshot para o tipo atual, verifica se os dados mudaram
  const hasDataChanged = (() => {
    if (!generatedType) return false;
    const saved = snapshots[generatedType];
    if (!saved) return false;
    const current = generatedType === "latest" ? snapshotLatest(record) : snapshotGeneral(allRecords);
    return current !== saved;
  })();

  const handleGenerate = async (type: AssessmentType) => {
    setLoading(true);
    setAssessmentType(type);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const body =
        type === "latest"
          ? {
              assessmentType: "latest",
              record: buildRecordPayload(record),
              profile: { height: profile.height, age: profile.age ?? 0, gender: profile.gender },
            }
          : {
              assessmentType: "general",
              records: allRecords.map(buildRecordPayload),
              profile: { height: profile.height, age: profile.age ?? 0, gender: profile.gender },
            };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/health-assessment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro desconhecido");
      setAssessment(json.assessment);
      setGeneratedType(type);
      // Salva snapshot por tipo — sem zerar ao trocar de tipo
      const snap = type === "latest" ? snapshotLatest(record) : snapshotGeneral(allRecords);
      setSnapshots(prev => ({ ...prev, [type]: snap }));
      setExpanded(true);
    } catch (err) {
      console.error("Assessment error:", err);
      toast.error("Erro ao gerar avaliação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const hasData = assessment && sections.some(s => (assessment[s.key]?.length ?? 0) > 0);

  // Step 1: no type chosen yet — show two option cards
  if (!assessmentType && !assessment) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Gerar Avaliação de Saúde com IA</p>
        </div>
        <p className="text-xs text-muted-foreground">Escolha o tipo de avaliação:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => handleGenerate("latest")}
            className="flex items-start gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/25 transition-colors">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Registro atual</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Avalia os dados do registro mais recente ({formatMonthYear(record.record_date)})
              </p>
            </div>
          </button>

          <button
            onClick={() => handleGenerate("general")}
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
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Gerando avaliação{assessmentType === "general" ? " do histórico" : ""}…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with type label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Avaliação — {generatedType === "general" ? "Histórico Geral" : `Registro de ${formatMonthYear(record.record_date)}`}
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

      {/* Results */}
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

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => { setAssessment(null); setAssessmentType(null); setGeneratedType(null); setExpanded(false); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Trocar tipo
        </button>
        {hasDataChanged ? (
          <button
            onClick={() => generatedType && handleGenerate(generatedType)}
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

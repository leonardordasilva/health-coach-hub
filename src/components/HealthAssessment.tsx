import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, Lightbulb, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { calculateBMI, calculateBodyAge, calculateBodyType } from "@/lib/health";

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
}

interface Assessment {
  positivos: string[];
  negativos: string[];
  atencao: string[];
  sugestoes: string[];
}

interface Props {
  record: HealthRecord;
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

export default function HealthAssessment({ record, profile }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      // Compute derived metrics to send to AI
      const height = profile.height;
      const age = profile.age ?? 0;
      let bmi = null, bmiClassification = null, bodyAge = null, bodyType = null;

      if (height) {
        const bmiResult = calculateBMI(record.weight, height);
        bmi = bmiResult.value;
        bmiClassification = bmiResult.classification;
        bodyAge = calculateBodyAge(age, bmiResult.value, record.body_fat, record.muscle, record.weight);
        if (record.body_fat != null && record.muscle != null) {
          const bt = calculateBodyType(record.weight, height, age, bmiResult.value, record.body_fat, record.muscle);
          bodyType = bt.type;
        }
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/health-assessment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            record: { ...record, bmi, bmiClassification, bodyAge, bodyType },
            profile: { height: profile.height, age },
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro desconhecido");
      setAssessment(json.assessment);
      setExpanded(true);
    } catch (err) {
      console.error("Assessment error:", err);
      toast.error("Erro ao gerar avaliação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const hasData = assessment && sections.some(s => (assessment[s.key]?.length ?? 0) > 0);

  return (
    <div className="space-y-3">
      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50"
        onClick={assessment ? () => setExpanded(e => !e) : handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading
          ? "Gerando avaliação..."
          : assessment
          ? expanded
            ? "Ocultar avaliação"
            : "Ver avaliação gerada"
          : "Gerar Avaliação de Saúde com IA"}
        {assessment && !loading && (expanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />)}
      </Button>

      {/* Assessment results */}
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

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
          >
            <Sparkles className="w-3 h-3" />
            Regenerar avaliação
          </button>
        </div>
      )}
    </div>
  );
}

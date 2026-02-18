import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { calculateBMI, calculateBodyType, calculateBodyAge, calculateAge, formatMonthYear } from "@/lib/health";
import { Activity, Droplets, Flame, Heart, Scale, Dumbbell, Bone, Percent, Target, Timer } from "lucide-react";
import BodyTypeIcon from "@/components/BodyTypeIcon";

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
  id: string;
  birth_date: string | null;
  height: number | null;
  email?: string;
  role?: string;
  weight?: number | null;
  is_default_password?: boolean;
  avatar_url?: string | null;
  created_at?: string;
}

interface Props {
  record: HealthRecord;
  profile: Profile;
  onClose: () => void;
}

const getBMIColor = (bmi: number) => {
  if (bmi < 18.5) return "text-secondary border-secondary/30 bg-secondary-light";
  if (bmi < 25) return "text-success border-success/30 bg-success-light";
  if (bmi < 30) return "text-warning border-warning/30 bg-warning/10";
  return "text-destructive border-destructive/30 bg-destructive/10";
};

export default function HealthRecordDetail({ record, profile, onClose }: Props) {
  const height = profile.height as number | null;
  const birthDate = profile.birth_date as string | null;
  const age = birthDate ? calculateAge(birthDate) : 0;

  const bmi = height ? calculateBMI(record.weight, height) : null;
  const bodyType = height && bmi && record.body_fat != null && record.muscle != null
    ? calculateBodyType(record.weight, height, age, bmi.value, record.body_fat, record.muscle)
    : null;
  const bodyAge = bmi
    ? calculateBodyAge(age, bmi.value, record.body_fat, record.muscle, record.weight)
    : null;

  const metrics = [
    { icon: Scale, label: "Peso", value: record.weight, unit: "kg" },
    { icon: Percent, label: "Gordura Corporal", value: record.body_fat, unit: "%" },
    { icon: Droplets, label: "Água", value: record.water, unit: "%" },
    { icon: Flame, label: "Metabolismo Basal", value: record.basal_metabolism, unit: "kcal" },
    { icon: Activity, label: "Gordura Visceral", value: record.visceral_fat, unit: "" },
    { icon: Dumbbell, label: "Músculo", value: record.muscle, unit: "kg" },
    { icon: Heart, label: "Proteína", value: record.protein, unit: "%" },
    { icon: Bone, label: "Massa Óssea", value: record.bone_mass, unit: "kg" },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Detalhes — {formatMonthYear(record.record_date)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <m.icon className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {m.value != null ? `${m.value}${m.unit}` : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Calculated Fields */}
          {bmi && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Cálculos Automáticos</h3>

              {/* BMI */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div>
                  <p className="text-xs text-muted-foreground">IMC</p>
                  <p className="text-2xl font-bold text-foreground">{bmi.value}</p>
                </div>
                <Badge className={`${getBMIColor(bmi.value)} font-medium text-xs`} variant="outline">
                  {bmi.classification}
                </Badge>
              </div>

              {/* Body Type + Body Age */}
              <div className="grid grid-cols-1 gap-2.5">
                {bodyType && (
                  <div className="p-3.5 rounded-xl border bg-card">
                    <p className="text-xs text-muted-foreground mb-2">Tipo de Corpo</p>
                    <div className="flex items-center gap-4">
                      <div className="h-14 flex items-center justify-center px-2 bg-primary/8 border border-primary/20 rounded-xl">
                        <BodyTypeIcon bodyType={bodyType.type} color="hsl(var(--primary))" width={28} height={46} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{bodyType.type}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{bodyType.description}</p>
                      </div>
                    </div>
                  </div>
                )}
                {bodyAge !== null && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Timer className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Idade Corporal</p>
                      <p className="text-lg font-bold text-foreground">{bodyAge} anos</p>
                    </div>
                  </div>
                )}
              </div>

              {!bodyType && (
                <p className="text-xs text-muted-foreground italic">
                  Para calcular o tipo de corpo, cadastre gordura corporal e músculo.
                </p>
              )}
            </div>
          )}

          {!bmi && (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              Para calcular IMC e tipo de corpo, cadastre a altura no perfil.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

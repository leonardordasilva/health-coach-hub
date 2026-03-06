import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/index";
import { calculateBMI, calculateBodyType, calculateBodyAge, calculateAge, formatDate } from "@/lib/health";
import { Activity, Droplets, Flame, Heart, Scale, Dumbbell, Bone, Percent, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import BodyTypeIcon from "@/components/BodyTypeIcon";
import type { HealthRecord } from "@/types/health";

interface Profile { id: string; birth_date: string | null; height: number | null; email?: string; role?: string; weight?: number | null; is_default_password?: boolean; avatar_url?: string | null; created_at?: string; }
interface Props { record: HealthRecord; profile: Profile; onClose: () => void; }

const getBMIColor = (bmi: number) => {
  if (bmi < 18.5) return "text-secondary border-secondary/30 bg-secondary-light";
  if (bmi < 25) return "text-success border-success/30 bg-success-light";
  if (bmi < 30) return "text-warning border-warning/30 bg-warning/10";
  return "text-destructive border-destructive/30 bg-destructive/10";
};

export default function HealthRecordDetail({ record, profile, onClose }: Props) {
  const { t, language } = useLanguage();
  const height = profile.height as number | null;
  const birthDate = profile.birth_date as string | null;
  const age = birthDate ? calculateAge(birthDate) : 0;

  const bmi = height ? calculateBMI(record.weight, height, language) : null;
  const bodyType = height && bmi && record.body_fat != null && record.muscle != null
    ? calculateBodyType(record.weight, height, age, bmi.value, record.body_fat, record.muscle, language) : null;
  const bodyAge = bmi ? calculateBodyAge(age, bmi.value, record.body_fat, record.muscle, record.weight) : null;

  const metrics = [
    { icon: Scale, label: t("dashboard.weight"), value: record.weight, unit: "kg" },
    { icon: Percent, label: t("dashboard.bodyFat"), value: record.body_fat, unit: "%" },
    { icon: Droplets, label: t("dashboard.water"), value: record.water, unit: "%" },
    { icon: Flame, label: t("dashboard.basalMetabolism"), value: record.basal_metabolism, unit: "kcal" },
    { icon: Activity, label: t("dashboard.visceralFat"), value: record.visceral_fat, unit: "" },
    { icon: Dumbbell, label: t("dashboard.muscle"), value: record.muscle, unit: "kg" },
    { icon: Heart, label: t("dashboard.protein"), value: record.protein, unit: "%" },
    { icon: Bone, label: t("dashboard.boneMass"), value: record.bone_mass, unit: "kg" },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" />{t("healthDetail.title")} — {formatDate(record.record_date, language)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0"><m.icon className="w-4 h-4 text-accent-foreground" /></div>
                <div><p className="text-xs text-muted-foreground leading-tight">{m.label}</p><p className="text-sm font-semibold text-foreground">{m.value != null ? `${Number(m.value).toFixed(1)}${m.unit}` : "—"}</p></div>
              </div>
            ))}
          </div>
          {bmi && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">{t("healthDetail.autoCalc")}</h3>
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div><p className="text-xs text-muted-foreground">{t("healthDetail.bmi")}</p><p className="text-2xl font-bold text-foreground">{bmi.value}</p></div>
                <Badge className={`${getBMIColor(bmi.value)} font-medium text-xs`} variant="outline">{bmi.classification}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {bodyType && (
                  <div className="p-3.5 rounded-xl border bg-card">
                    <p className="text-xs text-muted-foreground mb-2">{t("healthDetail.bodyType")}</p>
                    <div className="flex items-center gap-4">
                      <div className="h-14 flex items-center justify-center px-2 bg-primary/8 border border-primary/20 rounded-xl">
                        <BodyTypeIcon bodyType={bodyType.type} color="hsl(var(--primary))" width={28} height={46} />
                      </div>
                      <div><p className="text-lg font-bold text-foreground">{bodyType.type}</p><p className="text-xs text-muted-foreground mt-0.5">{bodyType.description}</p></div>
                    </div>
                  </div>
                )}
                {bodyAge !== null && age > 0 && (() => {
                  const diff = bodyAge - age;
                  const isYounger = diff < 0;
                  const isEqual = diff === 0;
                  const absDiff = Math.abs(diff);
                  const colorClass = isEqual ? "text-muted-foreground" : isYounger ? "text-success" : "text-destructive";
                  const bgClass = isEqual ? "bg-muted/50 border-border/40" : isYounger ? "bg-success/8 border-success/25" : "bg-destructive/8 border-destructive/25";
                  const Icon = isEqual ? Minus : isYounger ? TrendingDown : TrendingUp;
                  const label = isEqual ? t("healthDetail.onAverage") : isYounger ? t("healthDetail.yearsYounger", { count: absDiff }) : t("healthDetail.yearsOlder", { count: absDiff });
                  return (
                    <div className={`p-3.5 rounded-xl border ${bgClass}`}>
                      <p className="text-xs text-muted-foreground mb-2">{t("healthDetail.bodyAgeVsReal")}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-center"><p className="text-xs text-muted-foreground">{t("healthDetail.realAge")}</p><p className="text-2xl font-bold text-foreground">{age}</p><p className="text-xs text-muted-foreground">{t("common.years")}</p></div>
                        <div className={`flex flex-col items-center gap-1 ${colorClass}`}><Icon className="w-5 h-5" /><span className="text-xs font-semibold text-center leading-tight max-w-[80px]">{label}</span></div>
                        <div className="text-center"><p className="text-xs text-muted-foreground">{t("healthDetail.bodyAge")}</p><p className={`text-2xl font-bold ${colorClass}`}>{bodyAge}</p><p className="text-xs text-muted-foreground">{t("common.years")}</p></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {!bodyType && <p className="text-xs text-muted-foreground italic">{t("healthDetail.missingBodyType")}</p>}
            </div>
          )}
          {!bmi && <p className="text-xs text-muted-foreground italic text-center py-2">{t("healthDetail.missingBMI")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

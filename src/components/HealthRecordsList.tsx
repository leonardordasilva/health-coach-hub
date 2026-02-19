import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/index";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, Pencil, Trash2, Eye, Calendar } from "lucide-react";
import { formatDate } from "@/lib/health";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HealthRecord } from "@/types/health";

interface Props { records: HealthRecord[]; loading: boolean; onEdit: (r: HealthRecord) => void; onDetail: (r: HealthRecord) => void; onDelete: () => void; }

export default function HealthRecordsList({ records, loading, onEdit, onDetail, onDelete }: Props) {
  const { t, language } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("health_records").delete().eq("id", deleteId);
    if (error) toast.error(t("healthRecords.deleteError"));
    else { toast.success(t("healthRecords.deleteSuccess")); onDelete(); }
    setDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-10"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;

  if (records.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border-2 border-dashed border-border">
      <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">{t("healthRecords.empty")}</p>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {records.map((record, i) => (
            <motion.div key={record.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, delay: i * 0.04, ease: "easeOut" }} className="bg-card border border-border/50 rounded-xl p-4 shadow-health hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-accent-foreground" /></div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{formatDate(record.record_date, language)}</p>
                    {i === 0 && <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary-light mt-0.5">{t("healthRecords.latest")}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDetail(record)}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(record)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(record.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label={t("dashboard.weight")} value={record.weight} unit="kg" />
                <Metric label={t("healthRecords.fat")} value={record.body_fat} unit="%" />
                <Metric label={t("dashboard.muscle")} value={record.muscle} unit="kg" />
                <Metric label={t("dashboard.water")} value={record.water} unit="%" />
                <Metric label={t("dashboard.protein")} value={record.protein} unit="%" />
                <Metric label={t("dashboard.boneMass")} value={record.bone_mass} unit="kg" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("healthRecords.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("healthRecords.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("healthRecords.deleteConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value != null ? `${Number(value).toFixed(1)}${unit}` : "—"}</p>
    </div>
  );
}

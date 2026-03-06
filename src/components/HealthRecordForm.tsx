import { useState } from "react";
import { format } from "date-fns";
import { ptBR, enUS, es as esLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/index";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthRecordInput } from "@/types/health";

const dateFnsLocales = { pt: ptBR, en: enUS, es: esLocale };

interface Props { record: HealthRecordInput | null; onClose: () => void; onSaved: () => void; }

export default function HealthRecordForm({ record, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [form, setForm] = useState<Omit<HealthRecordInput, "id">>({
    record_date: record?.record_date || new Date().toISOString().slice(0, 10),
    weight: record?.weight || 0, body_fat: record?.body_fat || null, water: record?.water || null,
    basal_metabolism: record?.basal_metabolism || null, visceral_fat: record?.visceral_fat || null,
    muscle: record?.muscle || null, protein: record?.protein || null, bone_mass: record?.bone_mass || null,
  });

  const setField = (field: keyof typeof form, value: string) => {
    if (field === "record_date") { setForm((prev) => ({ ...prev, [field]: value })); return; }
    const num = value === "" ? null : parseFloat(value);
    setForm((prev) => ({ ...prev, [field]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("health_records").select("id").eq("record_date", form.record_date).maybeSingle();
      const isDuplicate = existing && (!record?.id || existing.id !== record.id);
      if (isDuplicate) { toast.error(t("healthForm.duplicateDate")); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const payload = record?.id ? { ...form, id: record.id } : form;
      const fnUrl = `${(supabase as any).supabaseUrl}/functions/v1/health-records-write`;
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify(payload),
      });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body?.error ?? `Error: ${response.status}`); }
      toast.success(record?.id ? t("healthForm.successEdit") : t("healthForm.successCreate"));
      onSaved();
    } catch (err: unknown) { console.error(err); toast.error(t("healthForm.error")); } finally { setSaving(false); }
  };

  const fields: { key: keyof typeof form; label: string; unit: string; required?: boolean }[] = [
    { key: "weight", label: t("dashboard.weight"), unit: "kg", required: true },
    { key: "body_fat", label: t("dashboard.bodyFat"), unit: "%" },
    { key: "water", label: t("dashboard.water"), unit: "%" },
    { key: "basal_metabolism", label: t("dashboard.basalMetabolism"), unit: "kcal" },
    { key: "visceral_fat", label: t("dashboard.visceralFat"), unit: "" },
    { key: "muscle", label: t("dashboard.muscle"), unit: "kg" },
    { key: "protein", label: t("dashboard.protein"), unit: "%" },
    { key: "bone_mass", label: t("dashboard.boneMass"), unit: "kg" },
  ];

  const selectedDate = form.record_date ? new Date(form.record_date + "T00:00:00") : undefined;
  const calLocale = dateFnsLocales[language];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" />{record?.id ? t("healthForm.editTitle") : t("healthForm.newTitle")}</DialogTitle>
          <DialogDescription>{t("healthForm.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("healthForm.recordDate")} *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: calLocale }) : t("healthForm.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => { if (date) setForm((p) => ({ ...p, record_date: format(date, "yyyy-MM-dd") })); setCalendarOpen(false); }} disabled={(date) => date > new Date()} initialFocus locale={calLocale} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-sm">{f.label} {f.unit ? `(${f.unit})` : ""} {f.required ? "*" : ""}</Label>
                <DecimalInput id={f.key} decimals={2} min={0} value={form[f.key] !== null && form[f.key] !== undefined ? String(form[f.key]) : ""} onChange={(v) => setField(f.key, v)} required={f.required} placeholder="—" className="h-9" />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={saving} className="gradient-hero text-primary-foreground">{saving ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import type { HealthRecordInput } from "@/types/health";

interface Props {
  record: HealthRecordInput | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function HealthRecordForm({ record, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<HealthRecordInput, "id">>({
    record_date: record?.record_date || new Date().toISOString().slice(0, 7) + "-01",
    weight: record?.weight || 0,
    body_fat: record?.body_fat || null,
    water: record?.water || null,
    basal_metabolism: record?.basal_metabolism || null,
    visceral_fat: record?.visceral_fat || null,
    muscle: record?.muscle || null,
    protein: record?.protein || null,
    bone_mass: record?.bone_mass || null,
  });

  const setField = (field: keyof typeof form, value: string) => {
    if (field === "record_date") {
      setForm((prev) => ({ ...prev, [field]: value }));
      return;
    }
    const num = value === "" ? null : parseFloat(value);
    setForm((prev) => ({ ...prev, [field]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = record?.id ? { ...form, id: record.id } : form;
      const { error } = await supabase.functions.invoke("health-records-write", { body: payload });
      if (error) throw error;
      toast.success(record?.id ? "Registro atualizado!" : "Registro criado!");
      onSaved();
    } catch (err: unknown) {
      console.error("Health record save error:", err);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; unit: string; required?: boolean }[] = [
    { key: "weight", label: "Peso", unit: "kg", required: true },
    { key: "body_fat", label: "Gordura Corporal", unit: "%" },
    { key: "water", label: "Água", unit: "%" },
    { key: "basal_metabolism", label: "Metabolismo Basal", unit: "kcal" },
    { key: "visceral_fat", label: "Gordura Visceral", unit: "" },
    { key: "muscle", label: "Músculo", unit: "kg" },
    { key: "protein", label: "Proteína", unit: "%" },
    { key: "bone_mass", label: "Massa Óssea", unit: "kg" },
  ];

  const monthValue = typeof form.record_date === "string" ? form.record_date.slice(0, 7) : "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {record?.id ? "Editar Registro" : "Novo Registro de Saúde"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados de composição corporal para este período.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="record_date">Data do Registro (Mês/Ano) *</Label>
            <input
              id="record_date"
              type="month"
              value={monthValue}
              onChange={(e) =>
                setForm((p) => ({ ...p, record_date: e.target.value ? e.target.value + "-01" : "" }))
              }
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-sm">
                  {f.label} {f.unit ? `(${f.unit})` : ""} {f.required ? "*" : ""}
                </Label>
                <DecimalInput
                  id={f.key}
                  decimals={2}
                  min={0}
                  value={form[f.key] !== null && form[f.key] !== undefined ? String(form[f.key]) : ""}
                  onChange={(v) => setField(f.key, v)}
                  required={f.required}
                  placeholder="—"
                  className="h-9"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gradient-hero text-primary-foreground">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

interface HealthRecord {
  id?: string;
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

interface Props {
  record: HealthRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function HealthRecordForm({ record, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<HealthRecord, "id">>({
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
    const num = value === "" ? null : parseFloat(value);
    setForm((prev) => ({ ...prev, [field]: num ?? (field === "record_date" ? value : null) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = { ...form, user_id: user.id };
      let error;
      if (record?.id) {
        ({ error } = await supabase.from("health_records").update(payload).eq("id", record.id));
      } else {
        ({ error } = await supabase.from("health_records").insert(payload));
      }
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

  // Format date to YYYY-MM for input[type=month]
  const monthValue = typeof form.record_date === "string"
    ? form.record_date.slice(0, 7)
    : "";

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
            <Input
              id="record_date"
              type="month"
              value={monthValue}
              onChange={(e) =>
                setForm((p) => ({ ...p, record_date: e.target.value ? e.target.value + "-01" : "" }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-sm">
                  {f.label} {f.unit ? `(${f.unit})` : ""} {f.required ? "*" : ""}
                </Label>
                <Input
                  id={f.key}
                  type="number"
                  step="0.01"
                  min="0"
                  value={form[f.key] !== null && form[f.key] !== undefined ? String(form[f.key]) : ""}
                  onChange={(e) => setField(f.key, e.target.value)}
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

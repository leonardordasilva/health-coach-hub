import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Calendar, Weight, Ruler, Camera, TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateAge, formatDate, getMetricDelta } from "@/lib/health";
import HealthRecordForm from "@/components/HealthRecordForm";
import HealthRecordDetail from "@/components/HealthRecordDetail";
import HealthRecordsList from "@/components/HealthRecordsList";

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
  created_at: string;
}

type DeltaItem = {
  label: string;
  unit: string;
  field: keyof HealthRecord;
  isPositiveGood: boolean;
};

const deltaItems: DeltaItem[] = [
  { label: "Peso", unit: "kg", field: "weight", isPositiveGood: false },
  { label: "Gordura Corporal", unit: "%", field: "body_fat", isPositiveGood: false },
  { label: "Água", unit: "%", field: "water", isPositiveGood: true },
  { label: "Músculo", unit: "kg", field: "muscle", isPositiveGood: true },
  { label: "Proteína", unit: "%", field: "protein", isPositiveGood: true },
  { label: "Gordura Visceral", unit: "", field: "visceral_fat", isPositiveGood: false },
];

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<HealthRecord | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("health_records")
      .select("*")
      .order("record_date", { ascending: false });
    if (!error && data) setRecords(data as HealthRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      await refreshProfile();
      toast.success("Foto de perfil atualizada!");
    } catch (err: any) {
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const age = profile?.birth_date ? calculateAge(profile.birth_date) : null;

  // Year filter
  const availableYears = useMemo(() => {
    const years = [...new Set(records.map(r => new Date(r.record_date + "T00:00:00").getFullYear()))].sort((a, b) => b - a);
    return years;
  }, [records]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  const filteredRecords = useMemo(() => {
    if (selectedYear === null) return records;
    return records.filter(r => new Date(r.record_date + "T00:00:00").getFullYear() === selectedYear);
  }, [records, selectedYear]);

  // Analytics: first vs last, last-1 vs last (use all records for analytics)
  const first = records[records.length - 1];
  const last = records[0];
  const secondLast = records[1];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Pessoal</h1>
          <p className="text-muted-foreground mt-1">Acompanhe sua evolução de saúde</p>
        </div>

        {/* Profile Card */}
        <Card className="shadow-health border-border/50 overflow-hidden">
          <div className="h-2 gradient-hero" />
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center overflow-hidden shadow-health">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-2xl bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-primary-foreground" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-foreground">{profile?.email}</h2>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
                  {profile?.birth_date && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(profile.birth_date)} ({age} anos)</span>
                    </div>
                  )}
                  {profile?.weight && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Weight className="w-4 h-4" />
                      <span>{profile.weight} kg</span>
                    </div>
                  )}
                  {profile?.height && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Ruler className="w-4 h-4" />
                      <span>{profile.height} cm</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Panel */}
        {records.length >= 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Painel Analítico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First vs Last */}
              <Card className="shadow-health border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Evolução total (1º → último)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deltaItems.map((item) => {
                    const delta = getMetricDelta(
                      last[item.field] as number | null,
                      first[item.field] as number | null,
                      item.isPositiveGood
                    );
                    if (!delta) return null;
                    return (
                      <div key={item.field} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${delta.isImprovement ? "text-success" : "text-destructive"}`}>
                          {delta.isImprovement ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {delta.formatted}{item.unit}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Second last vs last */}
              {secondLast && (
                <Card className="shadow-health border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Período recente (penúltimo → último)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {deltaItems.map((item) => {
                      const delta = getMetricDelta(
                        last[item.field] as number | null,
                        secondLast[item.field] as number | null,
                        item.isPositiveGood
                      );
                      if (!delta) return null;
                      return (
                        <div key={item.field} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <div className={`flex items-center gap-1 text-sm font-semibold ${delta.isImprovement ? "text-success" : "text-destructive"}`}>
                            {delta.isImprovement ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {delta.formatted}{item.unit}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Health Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">Registros de Saúde</h2>
            <Button
              onClick={() => { setEditingRecord(null); setShowForm(true); }}
              className="gradient-hero text-primary-foreground shadow-health hover:opacity-90 gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Novo registro
            </Button>
          </div>

          {/* Year selector */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={selectedYear === null || availableYears.indexOf(selectedYear) >= availableYears.length - 1}
                onClick={() => {
                  if (selectedYear === null) return;
                  const idx = availableYears.indexOf(selectedYear);
                  if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex gap-1.5 flex-wrap">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedYear === year
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={selectedYear === null || availableYears.indexOf(selectedYear) <= 0}
                onClick={() => {
                  if (selectedYear === null) return;
                  const idx = availableYears.indexOf(selectedYear);
                  if (idx > 0) setSelectedYear(availableYears[idx - 1]);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <HealthRecordsList
            records={filteredRecords}
            loading={loading}
            onEdit={(r) => { setEditingRecord(r); setShowForm(true); }}
            onDetail={(r) => setDetailRecord(r)}
            onDelete={fetchRecords}
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <HealthRecordForm
          record={editingRecord}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRecords(); }}
        />
      )}

      {/* Detail Modal */}
      {detailRecord && profile && (
        <HealthRecordDetail
          record={detailRecord}
          profile={profile}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </AppLayout>
  );
}

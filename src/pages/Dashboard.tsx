import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Calendar, Weight, Ruler, Camera, TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight, Timer, ChevronDown } from "lucide-react";
import BodyTypeIcon from "@/components/BodyTypeIcon";
import { calculateAge, formatDate, getMetricDelta, calculateBMI, calculateBodyType, calculateBodyAge, formatMonthYear } from "@/lib/health";
import HealthRecordForm from "@/components/HealthRecordForm";
import HealthRecordDetail from "@/components/HealthRecordDetail";
import HealthRecordsList from "@/components/HealthRecordsList";
import HealthAssessment from "@/components/HealthAssessment";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";

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

type ChartMetric = { key: keyof HealthRecord; label: string; unit: string; };

const chartMetrics: ChartMetric[] = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "body_fat", label: "Gordura Corporal", unit: "%" },
  { key: "muscle", label: "Músculo", unit: "kg" },
  { key: "water", label: "Água", unit: "%" },
  { key: "protein", label: "Proteína", unit: "%" },
];

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<HealthRecord | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>(chartMetrics[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [chartOpen, setChartOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);

  const fetchRecords = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/health-records-read`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const json = await res.json();
      if (json.records) setRecords(json.records as HealthRecord[]);
    } catch (err) {
      console.error("Error fetching health records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas imagens são permitidas (JPEG, PNG, WebP, GIF).");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

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

  // Body type & body age from latest record
  const latestRecord = records[0];
  const bodyMetrics = useMemo(() => {
    if (!latestRecord || !profile?.height || !profile?.birth_date) return null;
    const bmi = calculateBMI(latestRecord.weight, profile.height);
    const bodyType = calculateBodyType(
      latestRecord.weight,
      profile.height,
      age ?? 0,
      bmi.value,
      latestRecord.body_fat ?? 0,
      latestRecord.muscle ?? 0
    );
    const bodyAge = calculateBodyAge(
      age ?? 0,
      bmi.value,
      latestRecord.body_fat,
      latestRecord.muscle,
      latestRecord.weight
    );
    return { bmi, bodyType, bodyAge };
  }, [latestRecord, profile, age]);

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

  // Analytics: ordenar por data para garantir evolução correta (mais antigo → mais recente)
  const sortedByDate = useMemo(
    () => [...records].sort((a, b) => a.record_date.localeCompare(b.record_date)),
    [records]
  );
  const first = sortedByDate[0];                            // mais antigo
  const last = sortedByDate[sortedByDate.length - 1];      // mais recente
  const secondLast = sortedByDate[sortedByDate.length - 2]; // penúltimo

  // Chart data — todos os registros ordenados cronologicamente (sem filtro de ano)
  const chartData = useMemo(() => {
    return [...records]
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
      .map(r => ({
        date: new Date(r.record_date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        value: r[selectedChartMetric.key] as number | null,
      }))
      .filter(d => d.value !== null);
  }, [records, selectedChartMetric]);


  const DeltaRow = ({ item, current, previous }: { item: DeltaItem; current: HealthRecord; previous: HealthRecord }) => {
    const delta = getMetricDelta(
      current[item.field] as number | null,
      previous[item.field] as number | null,
      item.isPositiveGood
    );
    if (!delta) return null;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
        <span className="text-sm text-muted-foreground">{item.label}</span>
        <div className={`flex items-center gap-1 text-sm font-semibold ${delta.isNeutral ? "text-muted-foreground" : delta.isImprovement ? "text-success" : "text-destructive"}`}>
          {!delta.isNeutral && (delta.delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
          {delta.isNeutral ? "Sem mudanças" : `${delta.formatted}${item.unit}`}
        </div>
      </div>
    );
  };

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
              <div className="relative group flex-shrink-0">
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

              {/* Info + Body Metrics */}
              <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full text-center sm:text-left">
                {/* Left: personal info */}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">{profile?.name || profile?.email}</h2>
                  {profile?.name && <p className="text-sm text-muted-foreground">{profile.email}</p>}
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

                {/* Right: body type & body age */}
                {bodyMetrics && (
                  <div className="flex flex-row sm:flex-col justify-center gap-3 sm:min-w-[160px]">
                    <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 flex-1 sm:flex-none">
                      <div className="h-12 flex items-center justify-center flex-shrink-0 px-1">
                        <BodyTypeIcon bodyType={bodyMetrics.bodyType.type} color="hsl(var(--primary))" width={26} height={42} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground leading-tight">Tipo de Corpo</p>
                        <p className="text-sm font-semibold text-primary leading-tight mt-0.5">{bodyMetrics.bodyType.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-accent border border-border/40 rounded-xl px-4 py-3 flex-1 sm:flex-none">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Timer className="w-4.5 h-4.5 text-accent-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground leading-tight">Idade Corporal</p>
                        <p className="text-sm font-semibold text-foreground leading-tight mt-0.5">{bodyMetrics.bodyAge} anos</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Health Assessment — latest record */}
        {latestRecord && profile && (
          <Card className="shadow-health border-border/50">
            <CardContent className="p-5">
              <HealthAssessment
                record={latestRecord}
                allRecords={records}
                profile={{ height: profile.height ?? null, birth_date: profile.birth_date ?? null, age, gender: profile.gender ?? null }}
              />
            </CardContent>
          </Card>
        )}

        {/* Analytics Panel */}
        {records.length >= 2 && (
          <div className="space-y-4">
            <button
              onClick={() => setAnalyticsOpen(o => !o)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <h2 className="text-lg font-semibold text-foreground">Painel Analítico</h2>
              <motion.span animate={{ rotate: analyticsOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {analyticsOpen && (
                <motion.div
                  key="analytics"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First vs Last */}
                    <Card className="shadow-health border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Evolução total
                        </CardTitle>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {formatMonthYear(first?.record_date)} → {formatMonthYear(last?.record_date)}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {deltaItems.map((item) => (
                          <DeltaRow key={item.field} item={item} current={last} previous={first} />
                        ))}
                      </CardContent>
                    </Card>

                    {/* Second last vs last */}
                    {secondLast && (
                      <Card className="shadow-health border-border/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Período recente
                          </CardTitle>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {formatMonthYear(secondLast?.record_date)} → {formatMonthYear(last?.record_date)}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {deltaItems.map((item) => (
                            <DeltaRow key={item.field} item={item} current={last} previous={secondLast} />
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Evolution Chart */}
        {records.length >= 2 && (
          <div className="space-y-4">
            <button
              onClick={() => setChartOpen(o => !o)}
              className="flex items-center gap-2 w-full text-left"
            >
              <h2 className="text-lg font-semibold text-foreground">Evolução Temporal</h2>
              <motion.span animate={{ rotate: chartOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {chartOpen && (
                <motion.div
                  key="chart"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <Card className="shadow-health border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap gap-2">
                        {chartMetrics.map(m => (
                          <button
                            key={m.key as string}
                            onClick={() => setSelectedChartMetric(m)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              selectedChartMetric.key === m.key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {chartData.length < 2 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Dados insuficientes para exibir o gráfico desta métrica.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                              formatter={(value: number) => [`${value} ${selectedChartMetric.unit}`, selectedChartMetric.label]}
                            />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Health Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => setRecordsOpen(o => !o)}
              className="flex items-center gap-2 text-left"
            >
              <h2 className="text-lg font-semibold text-foreground">Registros de Saúde</h2>
              <motion.span animate={{ rotate: recordsOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.span>
            </button>
            <AnimatePresence>
              {recordsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    onClick={() => { setEditingRecord(null); setShowForm(true); }}
                    className="gradient-hero text-primary-foreground shadow-health hover:opacity-90 gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Novo registro
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {recordsOpen && (
              <motion.div
                key="records"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="space-y-4">
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
              </motion.div>
            )}
          </AnimatePresence>
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

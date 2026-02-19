import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { User, Calendar, Weight, Ruler, TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight, Timer, ChevronDown, AlertCircle, Target } from "lucide-react";
import BodyTypeIcon from "@/components/BodyTypeIcon";
import { calculateAge, formatDate, getMetricDelta, calculateBMI, calculateBodyType, calculateBodyAge, formatMonthYear } from "@/lib/health";
import HealthRecordForm from "@/components/HealthRecordForm";
import HealthRecordDetail from "@/components/HealthRecordDetail";
import HealthRecordsList from "@/components/HealthRecordsList";
import HealthAssessment from "@/components/HealthAssessment";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import type { HealthRecord } from "@/types/health";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

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


async function fetchHealthRecords(): Promise<HealthRecord[]> {
  const { data, error } = await supabase.functions.invoke("health-records-read");
  if (error) throw error;
  return (data?.records ?? []) as HealthRecord[];
}

export default function Dashboard() {
  useDocumentTitle("Bioimpedância | Health Coach");
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { uploading: uploadingAvatar, handleUpload: handleAvatarUpload } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<HealthRecord | null>(null);
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>(chartMetrics[0]);

  const [analyticsOpen, setAnalyticsOpen] = useState(() => {
    try { return localStorage.getItem("dashboard_analyticsOpen") !== "false"; } catch { return true; }
  });
  const [chartOpen, setChartOpen] = useState(() => {
    try { return localStorage.getItem("dashboard_chartOpen") !== "false"; } catch { return true; }
  });
  const [recordsOpen, setRecordsOpen] = useState(() => {
    try { return localStorage.getItem("dashboard_recordsOpen") !== "false"; } catch { return true; }
  });

  const toggleSection = (key: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(prev => {
      const next = !prev;
      try { localStorage.setItem(key, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const { data: records = [], isLoading: loading } = useQuery({
    queryKey: ["health-records"],
    queryFn: fetchHealthRecords,
  });

  const age = profile?.birth_date ? calculateAge(profile.birth_date) : null;

  const latestRecord = records[0];

  const bodyMetrics = useMemo(() => {
    if (!latestRecord || !profile?.height || !profile?.birth_date) return null;
    const bmi = calculateBMI(latestRecord.weight, profile.height);
    const bodyType = calculateBodyType(
      latestRecord.weight, profile.height, age ?? 0,
      bmi.value, latestRecord.body_fat ?? 0, latestRecord.muscle ?? 0
    );
    const bodyAge = calculateBodyAge(age ?? 0, bmi.value, latestRecord.body_fat, latestRecord.muscle, latestRecord.weight);
    return { bmi, bodyType, bodyAge };
  }, [latestRecord, profile, age]);

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

  const sortedByDate = useMemo(
    () => [...records].sort((a, b) => a.record_date.localeCompare(b.record_date)),
    [records]
  );
  const first = sortedByDate[0];
  const last = sortedByDate[sortedByDate.length - 1];
  const secondLast = sortedByDate[sortedByDate.length - 2];

  const chartData = useMemo(() => {
    return [...records]
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
      .map(r => ({
        date: new Date(r.record_date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        value: r[selectedChartMetric.key] as number | null,
      }))
      .filter(d => d.value !== null);
  }, [records, selectedChartMetric]);

  // Inactivity alert: last record older than 30 days
  const inactivityAlert = useMemo(() => {
    if (!latestRecord) return null;
    const lastDate = new Date(latestRecord.record_date + "T00:00:00");
    const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30 ? { lastDate, diffDays } : null;
  }, [latestRecord]);

  const refreshRecords = () => queryClient.invalidateQueries({ queryKey: ["health-records"] });

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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bioimpedância</h1>
          <p className="text-muted-foreground mt-1">Acompanhe sua composição corporal</p>
        </div>

        {/* Inactivity alert */}
        {inactivityAlert && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">Que tal atualizar seus dados?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Seu último registro foi em {formatMonthYear(latestRecord!.record_date)} — há {inactivityAlert.diffDays} dias.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-warning/40 text-warning hover:bg-warning/10 flex-shrink-0"
              onClick={() => { setEditingRecord(null); setShowForm(true); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Novo registro
            </Button>
          </div>
        )}

        {/* Profile Card */}
        <Card className="shadow-health border-border/50 overflow-hidden">
          <div className="h-2 gradient-hero" />
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center overflow-hidden shadow-health">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <User className="w-10 h-10 text-primary-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-2xl bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <span className="text-primary-foreground text-xs font-medium">Alterar</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              {/* Info + Body Metrics */}
              <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full text-center sm:text-left">
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

            {/* Goals Progress — inside profile card */}
            {latestRecord && (profile?.weight_goal || profile?.body_fat_goal) && (
              <div className="mt-5 pt-4 border-t border-border/40 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Progresso das metas
                </p>
                {profile.weight_goal && profile.weight && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Peso</span>
                      <span className="font-medium text-foreground">
                        {Number(latestRecord.weight).toFixed(1)} kg
                        <span className="text-muted-foreground"> / meta: {profile.weight_goal} kg</span>
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.max(0,
                        ((profile.weight - latestRecord.weight) / (profile.weight - profile.weight_goal)) * 100
                      ))}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {latestRecord.weight <= profile.weight_goal
                        ? "✅ Meta atingida!"
                        : `Faltam ${(latestRecord.weight - profile.weight_goal).toFixed(1)} kg`}
                    </p>
                  </div>
                )}
                {profile.body_fat_goal && latestRecord.body_fat != null && first?.body_fat != null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Gordura corporal</span>
                      <span className="font-medium text-foreground">
                        {Number(latestRecord.body_fat).toFixed(1)}%
                        <span className="text-muted-foreground"> / meta: {profile.body_fat_goal}%</span>
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.max(0,
                        first.body_fat === profile.body_fat_goal
                          ? 100
                          : ((first.body_fat - latestRecord.body_fat) / (first.body_fat - profile.body_fat_goal)) * 100
                      ))}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {latestRecord.body_fat <= profile.body_fat_goal
                        ? "✅ Meta atingida!"
                        : `Faltam ${(latestRecord.body_fat - profile.body_fat_goal).toFixed(1)} pontos percentuais`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Health Assessment */}
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
              onClick={() => toggleSection("dashboard_analyticsOpen", setAnalyticsOpen)}
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
                    <Card className="shadow-health border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Evolução total</CardTitle>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {formatMonthYear(first?.record_date)} → {formatMonthYear(last?.record_date)}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {deltaItems.map((item) => <DeltaRow key={item.field} item={item} current={last} previous={first} />)}
                      </CardContent>
                    </Card>

                    {secondLast && (
                      <Card className="shadow-health border-border/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Período recente</CardTitle>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {formatMonthYear(secondLast?.record_date)} → {formatMonthYear(last?.record_date)}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {deltaItems.map((item) => <DeltaRow key={item.field} item={item} current={last} previous={secondLast} />)}
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
              onClick={() => toggleSection("dashboard_chartOpen", setChartOpen)}
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
              onClick={() => toggleSection("dashboard_recordsOpen", setRecordsOpen)}
              className="flex items-center gap-2 text-left"
            >
              <h2 className="text-lg font-semibold text-foreground">Registros de Saúde</h2>
              {!loading && records.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
                  {records.length}
                </Badge>
              )}
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
                        variant="ghost" size="icon" className="h-8 w-8"
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
                        variant="ghost" size="icon" className="h-8 w-8"
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
                    onDelete={refreshRecords}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showForm && (
        <HealthRecordForm
          record={editingRecord}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refreshRecords(); }}
        />
      )}

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

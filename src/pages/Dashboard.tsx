import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/index";
import { localeMap } from "@/i18n/index";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { User, Calendar, Weight, Ruler, TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight, Timer, ChevronDown, AlertCircle, Target, Dumbbell, Droplets, Zap, Activity } from "lucide-react";
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

async function fetchHealthRecords(): Promise<HealthRecord[]> {
  const { data, error } = await supabase.functions.invoke("health-records-read");
  if (error) throw error;
  return (data?.records ?? []) as HealthRecord[];
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  useDocumentTitle(t("dashboard.pageTitle"));
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { uploading: uploadingAvatar, handleUpload: handleAvatarUpload } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<HealthRecord | null>(null);

  const allChartMetrics = useMemo(() => [
    { key: "weight" as keyof HealthRecord, label: t("dashboard.weight"), unit: "kg" },
    { key: "body_fat" as keyof HealthRecord, label: t("dashboard.bodyFat"), unit: "%" },
    { key: "muscle" as keyof HealthRecord, label: t("dashboard.muscle"), unit: "kg" },
    { key: "water" as keyof HealthRecord, label: t("dashboard.water"), unit: "%" },
    { key: "protein" as keyof HealthRecord, label: t("dashboard.protein"), unit: "%" },
    { key: "visceral_fat" as keyof HealthRecord, label: t("dashboard.visceralFat"), unit: "" },
    { key: "basal_metabolism" as keyof HealthRecord, label: t("dashboard.basalMetabolism"), unit: "kcal" },
    { key: "bone_mass" as keyof HealthRecord, label: t("dashboard.boneMass"), unit: "kg" },
  ], [t]);

  const [selectedChartMetric, setSelectedChartMetric] = useState(allChartMetrics[0]);

  const deltaItems = useMemo(() => [
    { label: t("dashboard.weight"), unit: "kg", field: "weight" as keyof HealthRecord, isPositiveGood: false },
    { label: t("dashboard.bodyFat"), unit: "%", field: "body_fat" as keyof HealthRecord, isPositiveGood: false },
    { label: t("dashboard.water"), unit: "%", field: "water" as keyof HealthRecord, isPositiveGood: true },
    { label: t("dashboard.muscle"), unit: "kg", field: "muscle" as keyof HealthRecord, isPositiveGood: true },
    { label: t("dashboard.protein"), unit: "%", field: "protein" as keyof HealthRecord, isPositiveGood: true },
    { label: t("dashboard.visceralFat"), unit: "", field: "visceral_fat" as keyof HealthRecord, isPositiveGood: false },
  ], [t]);

  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [chartOpen, setChartOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);

  const { data: records = [], isLoading: loading } = useQuery({ queryKey: ["health-records"], queryFn: fetchHealthRecords });

  const chartMetrics = useMemo(() =>
    allChartMetrics.filter(m => records.some(r => r[m.key] != null)),
    [allChartMetrics, records]
  );
  useEffect(() => { if (chartMetrics.length > 0 && !chartMetrics.find(m => m.key === selectedChartMetric.key)) setSelectedChartMetric(chartMetrics[0]); }, [chartMetrics]);

  const age = profile?.birth_date ? calculateAge(profile.birth_date) : null;
  const latestRecord = records[0];

  const bodyMetrics = useMemo(() => {
    if (!latestRecord || !profile?.height || !profile?.birth_date) return null;
    const bmi = calculateBMI(latestRecord.weight, profile.height, language);
    const bodyType = calculateBodyType(latestRecord.weight, profile.height, age ?? 0, bmi.value, latestRecord.body_fat ?? 0, latestRecord.muscle ?? 0, language);
    const bodyAge = calculateBodyAge(age ?? 0, bmi.value, latestRecord.body_fat, latestRecord.muscle, latestRecord.weight);
    return { bmi, bodyType, bodyAge };
  }, [latestRecord, profile, age, language]);

  const availableYears = useMemo(() => [...new Set(records.map(r => new Date(r.record_date + "T00:00:00").getFullYear()))].sort((a, b) => b - a), [records]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  useEffect(() => { if (availableYears.length > 0 && selectedYear === null) setSelectedYear(availableYears[0]); }, [availableYears]);

  const filteredRecords = useMemo(() => { if (selectedYear === null) return records; return records.filter(r => new Date(r.record_date + "T00:00:00").getFullYear() === selectedYear); }, [records, selectedYear]);
  const sortedByDate = useMemo(() => [...records].sort((a, b) => a.record_date.localeCompare(b.record_date)), [records]);
  const first = sortedByDate[0];
  const last = sortedByDate[sortedByDate.length - 1];
  const secondLast = sortedByDate[sortedByDate.length - 2];

  const chartData = useMemo(() => [...records].sort((a, b) => a.record_date.localeCompare(b.record_date)).map(r => ({
    date: new Date(r.record_date + "T00:00:00").toLocaleDateString(localeMap[language], { month: "short", year: "2-digit" }),
    fullDate: new Date(r.record_date + "T00:00:00").toLocaleDateString(localeMap[language], { day: "2-digit", month: "long", year: "numeric" }),
    value: r[selectedChartMetric.key] as number | null,
  })).filter(d => d.value !== null), [records, selectedChartMetric, language]);

  const inactivityAlert = useMemo(() => {
    if (!latestRecord) return null;
    const lastDate = new Date(latestRecord.record_date + "T00:00:00");
    const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30 ? { lastDate, diffDays } : null;
  }, [latestRecord]);

  const refreshRecords = () => queryClient.invalidateQueries({ queryKey: ["health-records"] });

  const DeltaRow = ({ item, current, previous }: { item: typeof deltaItems[0]; current: HealthRecord; previous: HealthRecord }) => {
    const delta = getMetricDelta(current[item.field] as number | null, previous[item.field] as number | null, item.isPositiveGood);
    if (!delta) return null;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
        <span className="text-sm text-muted-foreground">{item.label}</span>
        <div className={`flex items-center gap-1 text-sm font-semibold ${delta.isNeutral ? "text-muted-foreground" : delta.isImprovement ? "text-success" : "text-destructive"}`}>
          {!delta.isNeutral && (delta.delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
          {delta.isNeutral ? t("common.noChanges") : `${delta.formatted}${item.unit}`}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
          </div>
          <div className="relative">
            <Button size="icon" variant="outline" className="rounded-full relative">
              <Activity className="w-5 h-5 text-muted-foreground" />
              {inactivityAlert && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background"></span>}
            </Button>
          </div>
        </div>

        {inactivityAlert && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">{t("dashboard.inactivityTitle")}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dashboard.inactivityMsg", { date: formatMonthYear(latestRecord!.record_date, language), days: inactivityAlert.diffDays })}</p>
            </div>
            <Button size="sm" variant="outline" className="border-warning/40 text-warning hover:bg-warning/10 flex-shrink-0" onClick={() => { setEditingRecord(null); setShowForm(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />{t("dashboard.newRecord")}
            </Button>
          </div>
        )}

        {/* --- STITCH UI SECTIONS --- */}

        {/* Profile Summary */}
        <section className="bg-card dark:bg-slate-900/50 p-4 rounded-xl shadow-sm border border-border/50 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all">
          <div className="relative cursor-pointer group flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-200 overflow-hidden border-2 border-primary flex items-center justify-center relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <User className="w-10 h-10 text-primary/60" />
              )}
              {uploadingAvatar && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <span className="text-white text-[10px] font-bold uppercase tracking-wider">{t("dashboard.change")}</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-background">
              PRO
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{profile?.name || profile?.email}</h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1.5">
              {age && <span>{age} {t("common.years")}</span>}
              {age && profile?.height && <span className="w-1 h-1 bg-border rounded-full self-center"></span>}
              {profile?.height && <span>{(profile.height / 100).toFixed(2)}m</span>}
              {profile?.height && latestRecord?.weight && <span className="w-1 h-1 bg-border rounded-full self-center"></span>}
              {latestRecord?.weight && <span className="font-semibold text-primary">{latestRecord.weight}kg</span>}
            </div>
          </div>
          <div className="hidden md:flex gap-2 self-stretch items-center pr-4">
             {bodyMetrics && (
               <div className="flex flex-col gap-2 relative">
                  <div className="text-xs text-muted-foreground text-right">{t("dashboard.bodyType")}</div>
                  <div className="font-bold text-primary flex items-center gap-2 justify-end">
                     {bodyMetrics.bodyType.type}
                     <BodyTypeIcon bodyType={bodyMetrics.bodyType.type} color="hsl(var(--primary))" width={20} height={30} />
                  </div>
               </div>
             )}
          </div>
        </section>

        {/* Goal Progress (Circular) */}
        {latestRecord && (profile?.weight_goal || profile?.body_fat_goal) && (
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">{t("dashboard.goalsProgress")}</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Weight Progress */}
              {profile?.weight_goal && latestRecord?.weight && (
                <div className="bg-card dark:bg-slate-900/50 p-4 rounded-xl shadow-sm border border-border flex flex-col items-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle className="text-secondary" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                      <circle className="text-primary transition-all duration-1000 ease-out" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={Math.max(0, 251.2 - (251.2 * Math.min(100, Math.max(0, ((profile.weight! - latestRecord.weight) / (profile.weight! - profile.weight_goal)) * 100))) / 100)} 
                        strokeWidth="8" strokeLinecap="round"></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-lg font-bold text-foreground">{latestRecord.weight}</span>
                      <span className="text-[10px] text-muted-foreground">kg</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{t("dashboard.weight")} Goal</p>
                  <p className="text-xs text-muted-foreground">Target: {profile.weight_goal}kg</p>
                </div>
              )}
              {/* Body Fat Progress */}
              {profile?.body_fat_goal && latestRecord?.body_fat && first?.body_fat && (
                <div className="bg-card dark:bg-slate-900/50 p-4 rounded-xl shadow-sm border border-border flex flex-col items-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle className="text-secondary" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                      <circle className="text-emerald-400 transition-all duration-1000 ease-out" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={Math.max(0, 251.2 - (251.2 * Math.min(100, Math.max(0, first.body_fat === profile.body_fat_goal ? 100 : ((first.body_fat - latestRecord.body_fat) / (first.body_fat - profile.body_fat_goal)) * 100))) / 100)} 
                        strokeWidth="8" strokeLinecap="round"></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-lg font-bold text-foreground">{latestRecord.body_fat}%</span>
                      <span className="text-[10px] text-muted-foreground">fat</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{t("dashboard.bodyFat")} Goal</p>
                  <p className="text-xs text-muted-foreground">Target: {profile.body_fat_goal}%</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Bioimpedance Details Grid */}
        {latestRecord && (
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">{t("dashboard.latestRecord")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card dark:bg-slate-900/50 p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="text-primary w-4 h-4" />
                  <span className="text-xs text-muted-foreground font-medium">{t("dashboard.muscle")}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{latestRecord.muscle || "--"} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
              </div>
              <div className="bg-card dark:bg-slate-900/50 p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="text-blue-400 w-4 h-4" />
                  <span className="text-xs text-muted-foreground font-medium">{t("dashboard.water")}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{latestRecord.water || "--"} <span className="text-sm font-normal text-muted-foreground">%</span></p>
              </div>
              <div className="bg-card dark:bg-slate-900/50 p-4 rounded-xl border border-border shadow-sm col-span-2">
                <div className="flex items-center justify-between h-full">
                  <div className="flex items-center gap-2">
                    <Zap className="text-orange-400 w-4 h-4" />
                    <span className="text-xs text-muted-foreground font-medium">{t("dashboard.basalMetabolism")}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{latestRecord.basal_metabolism || "--"} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Calculated Metrics */}
        {bodyMetrics && (
          <section>
            <div className="bg-primary/10 dark:bg-primary/5 rounded-2xl p-4 grid grid-cols-3 gap-2 border border-primary/20">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-primary/80 mb-1">BMI</p>
                <p className="text-lg md:text-xl font-bold text-foreground">{bodyMetrics.bmi.value.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{bodyMetrics.bmi.classification}</p>
              </div>
              <div className="text-center border-x border-primary/20 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-primary/80 mb-1">Body Type</p>
                <p className="text-lg md:text-xl font-bold text-foreground">{bodyMetrics.bodyType.type}</p>
                <p className="text-[10px] text-muted-foreground hidden sm:block whitespace-nowrap">{bodyMetrics.bodyType.description || t("dashboard.bodyType")}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-primary/80 mb-1">Metabolic Age</p>
                <p className="text-lg md:text-xl font-bold text-foreground">{bodyMetrics.bodyAge}</p>
                {age && (
                  <p className={`text-[10px] font-bold ${bodyMetrics.bodyAge <= age ? 'text-emerald-500' : 'text-red-500'}`}>
                    {bodyMetrics.bodyAge <= age ? '-' : '+'}{Math.abs(bodyMetrics.bodyAge - age)} {t("common.years")}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* AI Health Feedback */}
        {latestRecord && profile && (
          <section className="relative overflow-hidden bg-gradient-to-br from-primary to-emerald-400 p-[3px] rounded-2xl shadow-lg shadow-primary/20 group">
             {/* Glow effect */}
             <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-white/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
             
             <div className="bg-background/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-[14px] p-5 relative z-10 w-full h-full">
                <HealthAssessment record={latestRecord} allRecords={records} profile={{ height: profile.height ?? null, birth_date: profile.birth_date ?? null, age, gender: profile.gender ?? null }} />
             </div>
          </section>
        )}

        {/* Weight Evolution Chart */}
        {records.length >= 2 && (
          <section>
            <div className="flex items-center justify-between mb-4 mt-2">
              <button onClick={() => setChartOpen(prev => !prev)} className="flex items-center gap-2 text-left group">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.temporalEvolution")}</h3>
                <motion.span animate={{ rotate: chartOpen ? 0 : -90 }} transition={{ duration: 0.2 }}><ChevronDown className="w-4 h-4 text-muted-foreground" /></motion.span>
              </button>
              <span className="text-[10px] bg-card px-2 py-1 rounded-full border border-border">Current Year</span>
            </div>
            
            <AnimatePresence initial={false}>
              {chartOpen && (
                <motion.div key="chart" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                  <Card className="shadow-sm border-border">
                    <CardHeader className="pb-2 pt-4 px-4 hidden md:block">
                      <div className="flex flex-wrap gap-2">
                        {chartMetrics.map(m => (
                          <button key={m.key as string} onClick={() => setSelectedChartMetric(m)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedChartMetric.key === m.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"}`}>{m.label}</button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-4 pt-2">
                      {chartData.length < 2 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{t("dashboard.insufficientData")}</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} dx={-10} />
                            <Tooltip cursor={{ stroke: "hsl(var(--primary)/0.2)", strokeWidth: 20 }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullDate ?? _label} formatter={(value: number) => [`${value} ${selectedChartMetric.unit}`, selectedChartMetric.label]} />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }} activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Analytics Section */}
        {records.length >= 2 && (
          <section className="space-y-4">
            <button onClick={() => setAnalyticsOpen(prev => !prev)} className="flex items-center gap-2 w-full text-left group">
              <h2 className="text-lg font-semibold text-foreground">{t("dashboard.analyticsPanel")}</h2>
              <motion.span animate={{ rotate: analyticsOpen ? 0 : -90 }} transition={{ duration: 0.2 }}><ChevronDown className="w-5 h-5 text-muted-foreground" /></motion.span>
            </button>
            <AnimatePresence initial={false}>
              {analyticsOpen && (
                <motion.div key="analytics" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="shadow-sm border-border bg-card">
                      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.totalEvolution")}</CardTitle><p className="text-xs text-muted-foreground/70 mt-0.5">{formatMonthYear(first?.record_date, language)} → {formatMonthYear(last?.record_date, language)}</p></CardHeader>
                      <CardContent className="space-y-2">{deltaItems.map((item) => <DeltaRow key={item.field} item={item} current={last} previous={first} />)}</CardContent>
                    </Card>
                    {secondLast && (
                      <Card className="shadow-sm border-border bg-card">
                        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.recentPeriod")}</CardTitle><p className="text-xs text-muted-foreground/70 mt-0.5">{formatMonthYear(secondLast?.record_date, language)} → {formatMonthYear(last?.record_date, language)}</p></CardHeader>
                        <CardContent className="space-y-2">{deltaItems.map((item) => <DeltaRow key={item.field} item={item} current={last} previous={secondLast} />)}</CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Records List Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between gap-3 flex-wrap">
            <button onClick={() => setRecordsOpen(prev => !prev)} className="flex items-center gap-2 text-left">
              <h2 className="text-lg font-semibold text-foreground">{t("dashboard.healthRecords")}</h2>
              {!loading && records.length > 0 && <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">{records.length}</Badge>}
              <motion.span animate={{ rotate: recordsOpen ? 0 : -90 }} transition={{ duration: 0.2 }}><ChevronDown className="w-5 h-5 text-muted-foreground" /></motion.span>
            </button>
            <AnimatePresence>
              {recordsOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
                  <Button onClick={() => { setEditingRecord(null); setShowForm(true); }} className="bg-primary text-primary-foreground shadow-sm hover:opacity-90 gap-2 rounded-full" size="sm"><Plus className="w-4 h-4" />{t("dashboard.newRecord")}</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence initial={false}>
            {recordsOpen && (
              <motion.div key="records" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                <div className="space-y-4">
                  {availableYears.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={selectedYear === null || availableYears.indexOf(selectedYear) >= availableYears.length - 1} onClick={() => { if (selectedYear === null) return; const idx = availableYears.indexOf(selectedYear); if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]); }}><ChevronLeft className="w-4 h-4" /></Button>
                      <div className="flex gap-1.5 flex-wrap">
                        {availableYears.map(year => <button key={year} onClick={() => setSelectedYear(year)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedYear === year ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{year}</button>)}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={selectedYear === null || availableYears.indexOf(selectedYear) <= 0} onClick={() => { if (selectedYear === null) return; const idx = availableYears.indexOf(selectedYear); if (idx > 0) setSelectedYear(availableYears[idx - 1]); }}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  )}
                  <HealthRecordsList records={filteredRecords} loading={loading} onEdit={(r) => { setEditingRecord(r); setShowForm(true); }} onDetail={(r) => setDetailRecord(r)} onDelete={refreshRecords} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </div>

      {showForm && <HealthRecordForm record={editingRecord} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refreshRecords(); }} />}
      {detailRecord && profile && <HealthRecordDetail record={detailRecord} profile={profile} onClose={() => setDetailRecord(null)} />}
    </AppLayout>
  );
}

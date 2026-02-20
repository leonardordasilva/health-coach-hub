import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/index";
import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, Lightbulb, Loader2, ChevronDown, ChevronUp, ClipboardList, History, Clock } from "lucide-react";
import { toast } from "sonner";
import { calculateBMI, calculateBodyAge, calculateBodyType, formatMonthYear } from "@/lib/health";
import type { HealthRecord } from "@/types/health";

interface Profile { height: number | null; birth_date: string | null; age: number | null; gender?: string | null; }
interface Assessment { positivos: string[]; negativos: string[]; atencao: string[]; sugestoes: string[]; }
type AssessmentType = "latest" | "general";
interface Props { record: HealthRecord; allRecords: HealthRecord[]; profile: Profile; }
interface HistoryEntry { id: string; record_date: string; created_at: string; assessment: Assessment; }

const recordSnapshot = (r: HealthRecord) => JSON.stringify([r.id, r.record_date, r.weight, r.body_fat, r.water, r.basal_metabolism, r.visceral_fat, r.muscle, r.protein, r.bone_mass]);
const snapshotLatest = (r: HealthRecord) => recordSnapshot(r);
const snapshotGeneral = (rs: HealthRecord[]) => JSON.stringify([...rs].sort((a, b) => a.id.localeCompare(b.id)).map(recordSnapshot));

export default function HealthAssessment({ record, allRecords, profile }: Props) {
  const { t, language } = useLanguage();

  const sections = [
    { key: "positivos" as keyof Assessment, label: t("healthAssessment.positives"), icon: ThumbsUp, colorClass: "text-success", bgClass: "bg-success/8 border-success/25", iconBg: "bg-success/15" },
    { key: "negativos" as keyof Assessment, label: t("healthAssessment.negatives"), icon: ThumbsDown, colorClass: "text-destructive", bgClass: "bg-destructive/8 border-destructive/25", iconBg: "bg-destructive/15" },
    { key: "atencao" as keyof Assessment, label: t("healthAssessment.attention"), icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/8 border-warning/25", iconBg: "bg-warning/15" },
    { key: "sugestoes" as keyof Assessment, label: t("healthAssessment.suggestions"), icon: Lightbulb, colorClass: "text-primary", bgClass: "bg-primary/8 border-primary/20", iconBg: "bg-primary/15" },
  ];

  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeType, setActiveType] = useState<AssessmentType | null>(null);
  const [assessments, setAssessments] = useState<Partial<Record<AssessmentType, Assessment>>>({});
  const [snapshots, setSnapshots] = useState<Partial<Record<AssessmentType, string>>>({});

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const loadCache = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCacheLoading(false); return; }
      const { data, error } = await supabase.from("health_assessment_cache").select("assessment_type, data_snapshot, assessment").eq("user_id", user.id);
      if (!error && data) {
        const ca: Partial<Record<AssessmentType, Assessment>> = {};
        const cs: Partial<Record<AssessmentType, string>> = {};
        for (const row of data) { const type = row.assessment_type as AssessmentType; ca[type] = row.assessment as unknown as Assessment; cs[type] = row.data_snapshot; }
        setAssessments(ca); setSnapshots(cs);
      }
      setCacheLoading(false);
    };
    loadCache();
  }, []);

  const currentSnapshot = (type: AssessmentType) => type === "latest" ? snapshotLatest(record) : snapshotGeneral(allRecords);
  const dataChangedFor = (type: AssessmentType) => { const saved = snapshots[type]; if (!saved) return false; return currentSnapshot(type) !== saved; };

  const buildRecordPayload = (r: HealthRecord) => {
    const height = profile.height; const age = profile.age ?? 0;
    let bmi = null, bmiClassification = null, bodyAge = null, bodyType = null;
    if (height) {
      const bmiResult = calculateBMI(r.weight, height, language);
      bmi = bmiResult.value; bmiClassification = bmiResult.classification;
      bodyAge = calculateBodyAge(age, bmiResult.value, r.body_fat, r.muscle, r.weight);
      if (r.body_fat != null && r.muscle != null) { const bt = calculateBodyType(r.weight, height, age, bmiResult.value, r.body_fat, r.muscle, language); bodyType = bt.type; }
    }
    return { ...r, bmi, bmiClassification, bodyAge, bodyType };
  };

  const handleSelectType = async (type: AssessmentType) => {
    const cached = assessments[type];
    if (cached && !dataChangedFor(type)) { setActiveType(type); setExpanded(true); return; }
    await callAPI(type);
  };

  const archiveCurrentAssessment = async (type: AssessmentType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const currentAssessment = assessments[type];
    const currentSnap = snapshots[type];
    if (!currentAssessment || !currentSnap) return;

    // Extract record_date from snapshot
    let recordDate: string;
    try {
      const parsed = JSON.parse(currentSnap);
      recordDate = parsed[1]; // [id, record_date, ...]
    } catch {
      recordDate = record.record_date;
    }

    await supabase.from("health_assessment_history").insert({
      user_id: user.id,
      assessment_type: type,
      record_date: recordDate,
      data_snapshot: currentSnap,
      assessment: currentAssessment as any,
    });
  };

  const saveToDB = async (type: AssessmentType, snap: string, assessment: Assessment) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Archive existing assessment before overwriting (only if snapshot changed)
    if (assessments[type] && snapshots[type] && snapshots[type] !== snap) {
      await archiveCurrentAssessment(type);
    }
    await supabase.from("health_assessment_cache").upsert([{ user_id: user.id, assessment_type: type, data_snapshot: snap, assessment: assessment as any }], { onConflict: "user_id,assessment_type" });
  };

  const callAPI = async (type: AssessmentType) => {
    setLoading(true); setActiveType(type);
    try {
      const body = type === "latest"
        ? { assessmentType: "latest", record: buildRecordPayload(record), profile: { height: profile.height, age: profile.age ?? 0, gender: profile.gender } }
        : { assessmentType: "general", records: allRecords.map(buildRecordPayload), profile: { height: profile.height, age: profile.age ?? 0, gender: profile.gender } };
      const { data, error } = await supabase.functions.invoke("health-assessment", { body });
      if (error) throw error;
      const snap = currentSnapshot(type);
      await saveToDB(type, snap, data.assessment);
      setAssessments(prev => ({ ...prev, [type]: data.assessment }));
      setSnapshots(prev => ({ ...prev, [type]: snap }));
      setExpanded(true);
    } catch (err) { console.error(err); toast.error(t("healthAssessment.error")); setActiveType(null); } finally { setLoading(false); }
  };

  const loadHistory = async () => {
    if (historyEntries.length > 0) { setShowHistory(h => !h); return; }
    setHistoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("health_assessment_history")
        .select("id, record_date, created_at, assessment")
        .eq("user_id", user.id)
        .eq("assessment_type", "latest")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHistoryEntries((data ?? []).map(d => ({ ...d, assessment: d.assessment as unknown as Assessment })));
      setShowHistory(true);
    } catch (err) { console.error(err); } finally { setHistoryLoading(false); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const assessment = activeType ? assessments[activeType] ?? null : null;
  const hasDataChanged = activeType ? dataChangedFor(activeType) : false;
  const hasData = assessment && sections.some(s => (assessment[s.key]?.length ?? 0) > 0);

  const renderAssessmentSections = (a: Assessment) => (
    <div className="space-y-2.5 animate-fade-in">
      {sections.map((s) => {
        const items = a[s.key] ?? [];
        if (items.length === 0) return null;
        return (
          <div key={s.key} className={`rounded-xl border p-3.5 ${s.bgClass}`}>
            <div className="flex items-center gap-2 mb-2.5"><div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}><s.icon className={`w-3.5 h-3.5 ${s.colorClass}`} /></div><p className={`text-sm font-semibold ${s.colorClass}`}>{s.label}</p></div>
            <ul className="space-y-1.5">{items.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground"><span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.colorClass.replace("text-", "bg-")}`} />{item}</li>)}</ul>
          </div>
        );
      })}
    </div>
  );

  if (!activeType) {
    if (cacheLoading) return <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm">{t("healthAssessment.loading")}</span></div>;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-primary" /><p className="text-sm font-semibold text-foreground">{t("healthAssessment.generateTitle")}</p></div>
        <p className="text-xs text-muted-foreground">{t("healthAssessment.chooseType")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button onClick={() => handleSelectType("latest")} className="flex items-start gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left group">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/25 transition-colors"><ClipboardList className="w-4 h-4 text-primary" /></div>
            <div><p className="text-sm font-semibold text-primary">{t("healthAssessment.latestTitle")}</p><p className="text-xs text-muted-foreground mt-0.5">{t("healthAssessment.latestDesc", { date: formatMonthYear(record.record_date, language) })}{assessments["latest"] && !dataChangedFor("latest") && <span className="ml-1 text-success">{t("healthAssessment.savedLabel")}</span>}</p></div>
          </button>
          <button onClick={() => handleSelectType("general")} disabled={allRecords.length < 2} className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/40 hover:bg-accent hover:border-border transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-accent-foreground/10 transition-colors"><History className="w-4 h-4 text-muted-foreground group-hover:text-foreground" /></div>
            <div><p className="text-sm font-semibold text-foreground">{t("healthAssessment.generalTitle")}</p><p className="text-xs text-muted-foreground mt-0.5">{allRecords.length < 2 ? t("healthAssessment.minRecords") : t("healthAssessment.generalDesc", { count: allRecords.length })}{assessments["general"] && !dataChangedFor("general") && allRecords.length >= 2 && <span className="ml-1 text-success">{t("healthAssessment.savedLabel")}</span>}</p></div>
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm">{activeType === "general" ? t("healthAssessment.generatingHistory") : t("healthAssessment.generating")}…</span></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><p className="text-sm font-semibold text-foreground">{t("healthAssessment.assessmentTitle")} — {activeType === "general" ? t("healthAssessment.historyLabel") : t("healthAssessment.recordLabel", { date: formatMonthYear(record.record_date, language) })}</p></div>
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}{expanded ? t("healthAssessment.hide") : t("healthAssessment.show")}
        </button>
      </div>
      {assessment && expanded && hasData && renderAssessmentSections(assessment)}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveType(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("healthAssessment.switchType")}</button>
          {activeType === "latest" && (
            <button onClick={loadHistory} disabled={historyLoading} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {historyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
              {showHistory ? t("healthAssessment.hideHistory") : t("healthAssessment.viewHistory")}
            </button>
          )}
        </div>
        {hasDataChanged ? (
          <button onClick={() => callAPI(activeType!)} disabled={loading} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"><Sparkles className="w-3 h-3" />{t("healthAssessment.regenerate")}</button>
        ) : (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-1 cursor-default select-none"><Sparkles className="w-3 h-3" />{t("healthAssessment.noChanges")}</span>
        )}
      </div>

      {/* History section */}
      {showHistory && activeType === "latest" && (
        <div className="space-y-2 pt-1 border-t border-border/40 mt-2 animate-fade-in">
          {historyEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">{t("healthAssessment.historyEmpty")}</p>
          ) : (
            historyEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                <button
                  onClick={() => setExpandedHistoryId(prev => prev === entry.id ? null : entry.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{t("healthAssessment.recordOf", { date: formatMonthYear(entry.record_date, language) })}</p>
                      <p className="text-[11px] text-muted-foreground">{t("healthAssessment.generatedAt", { date: formatDate(entry.created_at) })}</p>
                    </div>
                  </div>
                  {expandedHistoryId === entry.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {expandedHistoryId === entry.id && (
                  <div className="px-3 pb-3">
                    {renderAssessmentSections(entry.assessment)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/index";
import { useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Camera, AlertTriangle, ChevronRight, KeyRound } from "lucide-react";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Profile() {
  const { t } = useLanguage();
  useDocumentTitle(t("profile.pageTitle"));
  const { profile, refreshProfile, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading: uploadingAvatar, handleUpload: handleAvatarUpload } = useAvatarUpload();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    birth_date: profile?.birth_date ?? "",
    weight: profile?.weight?.toString() ?? "",
    height: profile?.height?.toString() ?? "",
    gender: profile?.gender ?? "",
    weight_goal: profile?.weight_goal?.toString() ?? "",
    body_fat_goal: profile?.body_fat_goal?.toString() ?? "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        birth_date: profile.birth_date ?? "",
        weight: profile.weight?.toString() ?? "",
        height: profile.height?.toString() ?? "",
        gender: profile.gender ?? "",
        weight_goal: profile.weight_goal?.toString() ?? "",
        body_fat_goal: profile.body_fat_goal?.toString() ?? "",
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const wasIncomplete = !isProfileComplete;
    try {
      const updates: Record<string, unknown> = {
        name: form.name.trim() || null,
        birth_date: form.birth_date || null,
        weight: form.weight ? parseFloat(form.weight.replace(",", ".")) : null,
        height: form.height ? parseFloat(form.height.replace(",", ".")) : null,
        gender: form.gender || null,
        weight_goal: form.weight_goal ? parseFloat(form.weight_goal.replace(",", ".")) : null,
        body_fat_goal: form.body_fat_goal ? parseFloat(form.body_fat_goal.replace(",", ".")) : null,
      };
      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t("profile.success"));
      if (wasIncomplete && updates.name && updates.birth_date) navigate("/dashboard");
    } catch {
      toast.error(t("profile.error"));
    } finally { setSaving(false); }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  const genderOptions = [
    { value: "male", label: t("profile.male") },
    { value: "female", label: t("profile.female") },
    { value: "other", label: t("profile.other") },
  ];

  return (
    <AppLayout>
      <div className="max-w-md mx-auto animate-fade-in bg-card dark:bg-slate-900 rounded-2xl shadow-sm border border-border overflow-hidden pb-8">

        {/* Header (Stitch Design) */}
        <div className="flex items-center p-4 sticky top-0 bg-card/80 dark:bg-slate-900/80 backdrop-blur-md z-10 border-b border-border justify-between">
          <h2 className="text-foreground text-xl font-bold leading-tight tracking-tight flex-1">{t("profile.title")}</h2>
          <div className="flex items-center justify-end">
            <button onClick={handleSignOut} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors" title="Logout">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </button>
          </div>
        </div>

        {/* Missing Profile Alert */}
        {!isProfileComplete && (
          <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning">{t("profile.completeAlert")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.completeAlertMsg")}</p>
            </div>
          </div>
        )}

        {/* Profile Avatar Section */}
        <div className="flex p-6 flex-col items-center">
          <div className="relative group">
            <div className="bg-muted dark:bg-slate-800 bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 ring-4 ring-primary/20 shadow-lg flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name || "User Avatar"} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-md border-2 border-background hover:scale-110 transition-transform flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center">
            <div className="flex h-8 items-center justify-center rounded-full bg-muted dark:bg-slate-800 px-4">
              <p className="text-muted-foreground text-sm font-medium">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="px-6">
          <form onSubmit={handleSave} className="space-y-8">

            {/* Personal Data Section */}
            <div>
              <h3 className="text-foreground text-lg font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> {t("profile.personalData")}
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{t("profile.name")} <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border-none bg-muted/50 dark:bg-slate-800 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-shadow"
                    required={!isProfileComplete}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{t("profile.birthDate")} <span className="text-destructive">*</span></label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                      className="w-full rounded-xl border-none bg-muted/50 dark:bg-slate-800 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-shadow"
                      required={!isProfileComplete}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{t("profile.gender")}</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full rounded-xl border-none bg-muted/50 dark:bg-slate-800 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-shadow appearance-none"
                    >
                      <option value="">{t("common.select")}</option>
                      {genderOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Goals Section */}
            <div>
              <h3 className="text-foreground text-lg font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                {t("profile.goals")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{t("profile.weightGoal")}</label>
                  <input
                    type="text"
                    value={form.weight_goal}
                    onChange={(e) => setForm({ ...form, weight_goal: e.target.value.replace(/[^0-9.,]/g, '') })}
                    className="w-full rounded-xl border-none bg-muted/50 dark:bg-slate-800 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-shadow"
                    placeholder="Ex: 65.0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{t("profile.bodyFatGoal")}</label>
                  <input
                    type="text"
                    value={form.body_fat_goal}
                    onChange={(e) => setForm({ ...form, body_fat_goal: e.target.value.replace(/[^0-9.,]/g, '') })}
                    className="w-full rounded-xl border-none bg-muted/50 dark:bg-slate-800 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-shadow"
                    placeholder="Ex: 20.0"
                  />
                </div>
              </div>
            </div>

            {/* Base Measurements Section */}
            <div>
              <h3 className="text-foreground text-lg font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 3H3" /><path d="M21 8H3" /><path d="M21 13H3" /><path d="M21 18H3" /><path d="M21 23H3" /><path d="M8 3v20" /><path d="M16 3v20" /></svg>
                Medidas Base
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">{t("profile.height")}</label>
                <input
                  type="text"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value.replace(/[^0-9.,]/g, '') })}
                  className="w-full rounded-xl border-none bg-muted/50 dark:bg-slate-800 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-shadow"
                  placeholder="Ex: 170"
                />
              </div>
            </div>

            {/* Security Section */}
            <div>
              <h3 className="text-foreground text-lg font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Segurança
              </h3>
              <Link to="/trocar-senha" className="w-full flex items-center justify-between rounded-xl bg-muted/50 dark:bg-slate-800 px-4 py-4 text-foreground hover:bg-muted dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-sm">Mudar Senha</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 pb-6">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {saving ? t("common.saving") : isProfileComplete ? t("profile.saveChanges") : t("profile.completeRegistration")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3.5 bg-transparent text-muted-foreground font-semibold rounded-xl hover:bg-muted dark:hover:bg-slate-800 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

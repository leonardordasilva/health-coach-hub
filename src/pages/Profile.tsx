import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/index";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/decimal-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Camera, Save, AlertTriangle, Target } from "lucide-react";
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
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        gender: form.gender || null,
        weight_goal: form.weight_goal ? parseFloat(form.weight_goal) : null,
        body_fat_goal: form.body_fat_goal ? parseFloat(form.body_fat_goal) : null,
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

  const genderOptions = [
    { value: "male", label: t("profile.male") },
    { value: "female", label: t("profile.female") },
    { value: "other", label: t("profile.other") },
  ];

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("profile.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("profile.subtitle")}</p>
        </div>

        {!isProfileComplete && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning">{t("profile.completeAlert")}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t("profile.completeAlertMsg")}</p>
            </div>
          </div>
        )}

        <Card className="shadow-health border-border/50 overflow-hidden">
          <div className="h-2 gradient-hero" />
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl gradient-hero flex items-center justify-center overflow-hidden shadow-health">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <User className="w-12 h-12 text-primary-foreground" />
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute inset-0 rounded-2xl bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{profile?.name || profile?.email}</p>
              {profile?.name && <p className="text-sm text-muted-foreground">{profile.email}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="gap-2 sm:hidden">
              <Camera className="w-4 h-4" />
              {uploadingAvatar ? t("profile.uploading") : t("profile.changePhoto")}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-health border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t("profile.personalData")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.name")} <span className="text-destructive">*</span></Label>
                <Input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("profile.namePlaceholder")} maxLength={120} required={!isProfileComplete} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">{t("profile.birthDate")} <span className="text-destructive">*</span></Label>
                <Input id="birth_date" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required={!isProfileComplete} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">{t("profile.initialWeight")}</Label>
                  <DecimalInput id="weight" value={form.weight} decimals={1} min={20} max={500} onChange={(v) => setForm({ ...form, weight: v })} placeholder="Ex: 70,5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">{t("profile.height")}</Label>
                  <DecimalInput id="height" value={form.height} decimals={1} min={50} max={300} onChange={(v) => setForm({ ...form, height: v })} placeholder="Ex: 170" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t("profile.gender")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {genderOptions.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setForm({ ...form, gender: opt.value })} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${form.gender === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{t("profile.goals")}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight_goal">{t("profile.weightGoal")}</Label>
                    <DecimalInput id="weight_goal" decimals={1} min={20} max={500} value={form.weight_goal} onChange={(v) => setForm({ ...form, weight_goal: v })} placeholder="Ex: 65,0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body_fat_goal">{t("profile.bodyFatGoal")}</Label>
                    <DecimalInput id="body_fat_goal" decimals={1} min={1} max={70} value={form.body_fat_goal} onChange={(v) => setForm({ ...form, body_fat_goal: v })} placeholder="Ex: 20,0" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t("profile.goalsHint")}</p>
              </div>
              <Button type="submit" disabled={saving} className="w-full gradient-hero text-primary-foreground shadow-health hover:opacity-90 gap-2">
                <Save className="w-4 h-4" />
                {saving ? t("common.saving") : isProfileComplete ? t("profile.saveChanges") : t("profile.completeRegistration")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

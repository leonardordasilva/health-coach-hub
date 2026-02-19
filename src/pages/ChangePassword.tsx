import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLanguage } from "@/i18n/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Heart, Eye, EyeOff, Lock, Check, X } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

interface StrengthCriterion {
  labelKey: string;
  test: (pw: string) => boolean;
}

const criteriaKeys: StrengthCriterion[] = [
  { labelKey: "changePassword.minChars", test: (pw) => pw.length >= 8 },
  { labelKey: "changePassword.uppercase", test: (pw) => /[A-Z]/.test(pw) },
  { labelKey: "changePassword.lowercase", test: (pw) => /[a-z]/.test(pw) },
  { labelKey: "changePassword.number", test: (pw) => /[0-9]/.test(pw) },
  { labelKey: "changePassword.symbol", test: (pw) => /[!@#$%&*]/.test(pw) },
];

function usePasswordStrength(password: string, t: (k: string) => string) {
  return useMemo(() => {
    const passed = criteriaKeys.filter((c) => c.test(password)).length;
    const percent = Math.round((passed / criteriaKeys.length) * 100);
    let label = "";
    let colorClass = "";
    let progressClass = "";
    if (passed === 0) { label = ""; colorClass = ""; progressClass = ""; }
    else if (passed <= 2) { label = t("changePassword.weak"); colorClass = "text-destructive"; progressClass = "[&>div]:bg-destructive"; }
    else if (passed <= 3) { label = t("changePassword.medium"); colorClass = "text-warning"; progressClass = "[&>div]:bg-warning"; }
    else if (passed === 4) { label = t("changePassword.good"); colorClass = "text-primary"; progressClass = "[&>div]:bg-primary"; }
    else { label = t("changePassword.strong"); colorClass = "text-success"; progressClass = "[&>div]:bg-success"; }
    return { passed, percent, label, colorClass, progressClass };
  }, [password, t]);
}

export default function ChangePassword() {
  const { t } = useLanguage();
  useDocumentTitle(t("changePassword.pageTitle"));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const strength = usePasswordStrength(password, t);

  const translateAuthError = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes("weak") || lower.includes("easy to guess") || lower.includes("known to be")) return t("changePassword.weakError");
    if (lower.includes("at least")) return t("changePassword.atLeastError");
    if (lower.includes("different from the old password")) return t("changePassword.differentError");
    return t("changePassword.genericError");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error(t("changePassword.minError")); return; }
    if (password !== confirm) { toast.error(t("changePassword.mismatchError")); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.from("profiles").update({ is_default_password: false }).eq("id", profile?.id);
      await refreshProfile();
      toast.success(t("changePassword.success"));
      if (profile?.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      toast.error(translateAuthError(raw));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: "hsl(var(--secondary))" }} />
      </div>
      <div className="w-full max-w-md relative animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center shadow-health mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Health Coach</h1>
          <LanguageSelector className="mt-3" />
        </div>
        <Card className="shadow-health border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Lock className="w-4 h-4 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl font-semibold">{t("changePassword.title")}</CardTitle>
            </div>
            <CardDescription>{t("changePassword.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("changePassword.newPassword")}</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} placeholder={t("changePassword.newPasswordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("changePassword.strength")}</span>
                      {strength.label && <span className={`text-xs font-semibold ${strength.colorClass}`}>{strength.label}</span>}
                    </div>
                    <Progress value={strength.percent} className={`h-1.5 ${strength.progressClass}`} />
                    <ul className="grid grid-cols-1 gap-1 mt-2">
                      {criteriaKeys.map((c) => {
                        const ok = c.test(password);
                        return (
                          <li key={c.labelKey} className={`flex items-center gap-1.5 text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
                            {ok ? <Check className="w-3 h-3 flex-shrink-0" /> : <X className="w-3 h-3 flex-shrink-0" />}
                            {t(c.labelKey)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t("changePassword.confirmPassword")}</Label>
                <div className="relative">
                  <Input id="confirm" type={showConfirm ? "text" : "password"} placeholder={t("changePassword.confirmPlaceholder")} value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-destructive flex items-center gap-1"><X className="w-3 h-3" /> {t("changePassword.mismatch")}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-11 gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 transition-opacity" disabled={loading || password.length < 8}>
                {loading ? t("changePassword.submitting") : t("changePassword.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLanguage } from "@/i18n/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Check, X, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { Progress } from "@/components/ui/progress";

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
      if (profile?.id) {
        await supabase.from("profiles").update({ is_default_password: false }).eq("id", profile.id);
      }
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
    <div className="bg-background-light dark:bg-slate-950 min-h-screen flex items-center justify-center font-sans p-4">

      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in-up">

        {/* Top Header */}
        <div className="flex items-center p-4 border-b border-slate-50 dark:border-slate-800/50">
          <Link to="/profile" className="text-slate-900 dark:text-slate-100 flex items-center justify-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-slate-900 dark:text-slate-100 text-lg font-semibold">{t("changePassword.title")}</h1>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center">

          <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <KeyRound className="w-10 h-10 text-primary" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-slate-900 dark:text-slate-100 text-2xl font-bold mb-2">{t("changePassword.title")}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t("changePassword.description")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-6">

            <div className="flex flex-col gap-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium ml-1">
                {t("changePassword.newPassword")}
              </label>
              <div className="relative flex items-center group">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t("changePassword.newPasswordPlaceholder")}
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors flex items-center justify-center"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2 space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("changePassword.strength")}</span>
                    {strength.label && <span className={`text-xs font-semibold ${strength.colorClass}`}>{strength.label}</span>}
                  </div>
                  <Progress value={strength.percent} className={`h-1.5 ${strength.progressClass}`} />
                  <ul className="grid grid-cols-1 gap-1.5 mt-2">
                    {criteriaKeys.map((c) => {
                      const ok = c.test(password);
                      return (
                        <li key={c.labelKey} className={`flex items-center gap-1.5 text-xs ${ok ? "text-success" : "text-slate-400"}`}>
                          {ok ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0" />}
                          {t(c.labelKey)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium ml-1">
                {t("changePassword.confirmPassword")}
              </label>
              <div className="relative flex items-center group">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder={t("changePassword.confirmPlaceholder")}
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors flex items-center justify-center"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 pl-1"><X className="w-3 h-3" /> {t("changePassword.mismatch")}</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || password.length < 8}
                className="w-full h-14 bg-primary hover:brightness-105 text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>{loading ? t("changePassword.submitting") : t("changePassword.submit")}</span>
                {!loading && <Check className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>

          </form>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
              <Lock className="w-3 h-3" />
              <span>Conexão Segura e Criptografada</span>
            </div>
            <div className="h-1 w-32 bg-slate-100 dark:bg-slate-800 rounded-full xl:mt-2">
              <div className="h-full w-full bg-primary rounded-full"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import LanguageSelector from "@/components/LanguageSelector";

type View = "login" | "register" | "email-exists" | "register-success";

const emailSchema = z.string().email();

export default function Login() {
  const { t } = useLanguage();
  useDocumentTitle(t("login.pageTitle"));
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "register") setView("register");
  }, [searchParams]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !profile) return;
    if (profile.is_default_password) navigate("/trocar-senha", { replace: true });
    else if (profile.role === "admin") navigate("/admin", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [authLoading, profileLoading, user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) toast.error(t("login.invalidCredentials"));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(registerEmail);
    if (!parsed.success) { toast.error(t("login.invalidEmail")); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-register", { body: { email: registerEmail } });
      if (error) throw error;
      if (data?.error === "EMAIL_EXISTS") { setView("email-exists"); return; }
      setView("register-success");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "";
      if (msg.includes("409") || msg.includes("EMAIL_EXISTS")) setView("email-exists");
      else toast.error(t("login.registerError"));
    } finally { setLoading(false); }
  };

  const handleForgotFromExists = async () => {
    setLoading(true);
    try { await supabase.functions.invoke("reset-password", { body: { email: registerEmail } }); } catch { }
    finally { setLoading(false); toast.success(t("login.resetPasswordSent")); setView("login"); }
  };

  return (
    <div className="bg-background-light dark:bg-slate-950 min-h-screen flex items-center justify-center font-sans">
      <div className="relative flex min-h-screen w-full flex-col overflow-hidden">

        {/* Background Image Area */}
        <div className="absolute inset-0 z-0 h-full w-full hidden md:block lg:w-1/2 lg:right-0 lg:left-auto">
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCtnvNe6X1E51HmkgT10Jc6eLUzYy87VPw2qwTipc7Sg0Ly8heyrHWSaRX6AUClbb6wX-FBPcLf8CtZumYMBJMnj0qLAt8dPkveNMbdHshnmxVhqTcUEUna-wkttKC3FScQRXIIXEg5irORyo0FLUcTrsuQn_YBMenSJXWVq-XgjzH5OnWCRFGip4HOV-o-f4yrGnZ_sk5jJ1kk4x_Sp1Jj_nZ-yYpT8O22heXdbucl2wNCAuI3mLmJdv3k8xeM2Vqfiyj0uykroUk")' }}>
            <div className="h-full w-full bg-emerald-900/40 backdrop-blur-[2px]"></div>
          </div>
        </div>

        {/* Mobile Background Image (Full Screen over dark overlay) */}
        <div className="absolute inset-0 z-0 h-full w-full md:hidden">
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCtnvNe6X1E51HmkgT10Jc6eLUzYy87VPw2qwTipc7Sg0Ly8heyrHWSaRX6AUClbb6wX-FBPcLf8CtZumYMBJMnj0qLAt8dPkveNMbdHshnmxVhqTcUEUna-wkttKC3FScQRXIIXEg5irORyo0FLUcTrsuQn_YBMenSJXWVq-XgjzH5OnWCRFGip4HOV-o-f4yrGnZ_sk5jJ1kk4x_Sp1Jj_nZ-yYpT8O22heXdbucl2wNCAuI3mLmJdv3k8xeM2Vqfiyj0uykroUk")' }}>
            <div className="h-full w-full bg-emerald-900/60 backdrop-blur-[4px] dark:bg-slate-900/80"></div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 lg:w-1/2 lg:mr-auto">

          <div className="absolute top-6 right-6 lg:left-6 lg:right-auto z-20">
            <LanguageSelector />
          </div>

          <div className="w-full max-w-[420px] rounded-xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md border border-slate-100 dark:border-slate-800">

            <div className="mb-8 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9s-9 4.03-9 9c0 4.97 4.03 9 9 9z" /><path d="M12 18V6" /><path d="M8 10h8" /><path d="M8 14h8" /></svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Health Coach</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t("login.subtitle")}</p>
            </div>

            {view === "login" && (
              <>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{t("login.email")}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-12 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                      placeholder={t("login.emailPlaceholder")}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{t("login.password")}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="h-12 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pr-12 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                        placeholder={t("login.passwordPlaceholder")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                    </label>
                    <Link to="/esqueci-senha" className="text-sm font-medium text-primary hover:underline underline-offset-4">{t("login.forgotPassword")}</Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex mt-2 h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-70"
                  >
                    {loading ? t("login.submitting") : t("login.submit")}
                  </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Are you a professional?
                    <button type="button" onClick={() => setView("register")} className="ml-1 font-semibold text-primary hover:underline underline-offset-4">
                      {t("login.createAccount")}
                    </button>
                  </p>
                  <Link to="/landing" className="text-xs text-slate-400 hover:text-primary transition-colors">{t("login.learnMore")}</Link>
                </div>
              </>
            )}

            {/* REGISTER VIEW */}
            {view === "register" && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">{t("login.registerTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("login.registerDescription")}</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{t("login.email")}</label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="h-12 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                      placeholder={t("login.emailPlaceholder")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-70"
                  >
                    {loading ? t("login.registerSubmitting") : t("login.registerSubmit")}
                  </button>
                </form>
                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={() => setView("login")} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />{t("login.registerBack")}
                  </button>
                </div>
              </>
            )}

            {/* EMAIL EXISTS VIEW */}
            {view === "email-exists" && (
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">{t("login.emailExistsTitle")}</h2>
                <p className="text-sm text-muted-foreground mb-6">{t("login.emailExistsDescription")}</p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => { setEmail(registerEmail); setView("login"); }}
                    className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all"
                  >
                    {t("login.goToLoginBtn")}
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotFromExists}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 active:scale-[0.98] transition-all"
                  >
                    {loading ? t("login.resetPasswordSending") : t("login.resetPassword")}
                  </button>
                </div>
                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={() => setView("register")} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />{t("login.tryAnotherEmail")}
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER SUCCESS VIEW */}
            {view === "register-success" && (
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-6">{t("login.registerSuccessTitle")}</h2>
                <div className="flex flex-col items-center gap-4 py-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Mail className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-[280px]">
                    {t("login.registerSuccessMsgBefore")} <strong className="text-slate-900 dark:text-slate-100">{registerEmail}</strong> {t("login.registerSuccessMsgAfter")}
                  </p>
                </div>
                <div className="flex justify-center">
                  <button type="button" onClick={() => setView("login")} className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 active:scale-[0.98] transition-all">
                    {t("login.goToLogin")}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

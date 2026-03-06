import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/index";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

export default function ForgotPassword() {
  const { t } = useLanguage();
  useDocumentTitle(t("forgotPassword.title"));
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await supabase.functions.invoke("reset-password", { body: { email } }); } catch { }
    finally { setLoading(false); setSent(true); }
  };

  return (
    <div className="bg-background-light dark:bg-slate-950 font-sans flex items-center justify-center min-h-screen p-4">

      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-primary/10 relative z-10 animate-fade-in-up">

        {/* Top Navigation */}
        <div className="flex items-center p-4">
          <Link to="/login" className="text-slate-600 dark:text-slate-400 hover:bg-primary/10 p-2 rounded-full transition-colors duration-200" title={t("forgotPassword.backToLogin")}>
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>

        <div className="px-8 pb-10 pt-4 flex flex-col items-center">
          {sent ? (
            <>
              {/* Success State */}
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-background">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center">{t("forgotPassword.sentDescription")}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-center text-base mb-8 leading-relaxed">
                {t("forgotPassword.sentMessage")}
              </p>
              <Link to="/login" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center shadow-md active:scale-[0.98]">
                {t("forgotPassword.backToLogin")}
              </Link>
            </>
          ) : (
            <>
              {/* Header Icon */}
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-primary-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="m14 20-2 2-2-2" /><path d="m10 24 2-2 2 2" /></svg>
                </div>
              </div>

              {/* Title and Description */}
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center">{t("forgotPassword.title")}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-center text-base mb-8 leading-relaxed">
                {t("forgotPassword.description")}
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1" htmlFor="email">
                    {t("forgotPassword.email")}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      className="block w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 shadow-sm outline-none placeholder:text-slate-400"
                      id="email"
                      name="email"
                      placeholder={t("login.emailPlaceholder")}
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}</span>
                  {!loading && <Send className="w-5 h-5" />}
                </button>
              </form>

              {/* Footer Link */}
              <div className="mt-8 flex justify-center">
                <Link className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors" to="/login">
                  <ArrowLeft className="w-4 h-4" />
                  {t("forgotPassword.backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

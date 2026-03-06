import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLanguage } from "@/i18n/index";
import LanguageSelector from "@/components/LanguageSelector";
import {
  Activity,
  Target,
  TrendingUp,
  Brain,
  CheckCircle2,
  Users,
  LineChart,
  BellRing
} from "lucide-react";

export default function Landing() {
  const { t } = useLanguage();
  useDocumentTitle(t("landing.title"));

  return (
    <div className="min-h-screen bg-background-light dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-primary/30">

      {/* TopAppBar / Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9s-9 4.03-9 9c0 4.97 4.03 9 9 9z" /><path d="M12 18V6" /><path d="M8 10h8" /><path d="M8 14h8" /></svg>
              <span className="text-xl font-bold tracking-tight">Health Coach</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#students" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">For Students</a>
              <a href="#professionals" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">For Professionals</a>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <LanguageSelector />
              </div>
              <Link to="/login" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:brightness-105 transition-all shadow-sm">
                Login / Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div className="flex flex-col gap-8 z-10">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                  Transform your body with <span className="text-primary">AI</span> and real-time tracking
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Unlock your potential with advanced bioimpedance tracking and AI-driven insights. Get personalized coaching that adapts to your unique metabolism.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link to="/login?view=register" className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                  Get Started Now <Target className="w-5 h-5" />
                </Link>
                <Link to="/login?view=register" className="bg-background text-foreground border-2 border-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary/10 transition-all flex items-center gap-2">
                  I am a Nutritionist
                </Link>
              </div>
            </div>

            <div className="relative animate-fade-in-up">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhFc4qe-BMc9jw4fg7gVfoMFeCND56Qy64La6qj0yk1kHTQpqQXTRrEEfkW2LGHjx2iqmZ6ThXS2qUCmtWzCIzNFcMPP40E3UF6omQvzfOy5roEmyYB2vOC88F1eSjSm7EWbJfFlGbtQmX14GeBKeIUc74qlxJxr1MSEN_24Z04sCFcx_R-45F2rVzBWBNhawOjcBc_CQNbeLxGshQZLggyeLSkPWB1zqlw3dpos8Zm3QPZxUKlspF43MiEJzBTp8cOtGCLRGySv0"
                alt="App Dashboard Preview"
                className="relative z-10 w-full max-w-md mx-auto drop-shadow-2xl rounded-[2rem]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="students" className="py-20 bg-muted/30 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.howItWorksTitle")}</h2>
          <div className="w-20 h-1.5 bg-primary mx-auto rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card 1 */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Bioimpedance Log</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Log your body composition data instantly with smart scale integration.</p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Our neural engine analyzes your trends to provide actionable advice.</p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Clear Goals</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Stay motivated with milestones tailored to your specific physiology.</p>
            </div>

            {/* Card 4 */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Evolution Charts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Visualize your progress with beautiful, high-fidelity data charts.</p>
            </div>

          </div>
        </div>
      </section>

      {/* For Professionals Section */}
      <section id="professionals" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-8 z-10">
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary font-bold text-xs tracking-widest uppercase mb-2">
                Enterprise Solutions
              </div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">For Professionals</h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Empower your practice with a complete suite of clinical-grade tools. Manage clients, monitor health data in real-time, and automate reporting.
              </p>

              <div className="space-y-6 pt-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-primary p-2.5 rounded-xl shrink-0">
                    <Users className="text-slate-900 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Client Management</h4>
                    <p className="text-slate-400 text-sm mt-1">Unified dashboard to oversee all active treatment plans and patient adherence.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="bg-primary p-2.5 rounded-xl shrink-0">
                    <LineChart className="text-slate-900 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Advanced Analytics</h4>
                    <p className="text-slate-400 text-sm mt-1">Predictive modeling for client success, macro tracking, and churn prevention.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="bg-primary p-2.5 rounded-xl shrink-0">
                    <BellRing className="text-slate-900 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Real-time Monitoring</h4>
                    <p className="text-slate-400 text-sm mt-1">Get automatically notified the moment client metrics deviate from goals.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center mt-12 lg:mt-0">
              <div className="w-[120%] aspect-square bg-gradient-to-tr from-primary/30 to-transparent rounded-full absolute -top-10 -right-20 blur-[100px] z-0"></div>
              <div className="relative bg-slate-800/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-lg z-10 hover:-translate-y-2 transition-transform duration-500">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB12Zn-eGaSBN_vC0YBa9gIyM-wiou8IWgCMWevT7ojjTP1hjfRxNuPVhpflhqFYFlmrV3hgQtSSZH26htiga6KNLmXsJtpmls5gp3HhygPIzKNrZpE52-dbk8_7ZBbNxeSdjjwr-70xQSdY7VS5nHQ0KKHJ7Eel1ymrrfht48M6bhvHQVgKh9bSFiNjzaIyXJDxB0_7N-kqpKCDBl2_L_thLNkl-bhWBbFGW5AT_DNC4tQvaVXecr56WB7WeJhwUGsiUMVHv-yLJU"
                  alt="Professional Dashboard"
                  className="rounded-2xl w-full h-auto"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9s-9 4.03-9 9c0 4.97 4.03 9 9 9z" /><path d="M12 18V6" /><path d="M8 10h8" /><path d="M8 14h8" /></svg>
              <span className="text-lg font-bold tracking-tight">Health Coach</span>
            </div>

            <div className="flex gap-8 text-sm font-medium text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>

            <div className="text-sm text-muted-foreground/70">
              © {new Date().getFullYear()} Health Coach AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

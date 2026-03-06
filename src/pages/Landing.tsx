import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLanguage } from "@/i18n/index";
import LanguageSelector from "@/components/LanguageSelector";
import {
  Heart,
  Activity,
  Target,
  TrendingUp,
  Brain,
  User,
  Scale,
  UserPlus,
  ClipboardList,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const featureIcons = [Scale, Activity, TrendingUp, Brain, Target, User];
const stepIcons = [UserPlus, ClipboardList, BarChart3];

export default function Landing() {
  const { t } = useLanguage();
  useDocumentTitle(t("landing.title"));

  const features = Array.from({ length: 6 }, (_, i) => ({
    icon: featureIcons[i],
    title: t(`landing.feature${i + 1}.title`),
    description: t(`landing.feature${i + 1}.desc`),
  }));

  const steps = Array.from({ length: 3 }, (_, i) => ({
    icon: stepIcons[i],
    title: t(`landing.step${i + 1}.title`),
    description: t(`landing.step${i + 1}.desc`),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: "hsl(var(--secondary))" }} />
        <div className="absolute -bottom-32 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.07]" style={{ background: "hsl(var(--primary))" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-health">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-gradient">Health Coach</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">{t("landing.login")}</Link>
            </Button>
            <Button size="sm" className="gradient-hero text-primary-foreground shadow-health hover:opacity-90" asChild>
              <Link to="/login?view=register">{t("landing.createAccount")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div>
          <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center shadow-glow mx-auto mb-6">
            <Heart className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5">
          {t("landing.heroTitle1")}<span className="text-gradient">{t("landing.heroTitle2")}</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          {t("landing.heroSubtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <Button size="lg" className="gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 h-12 px-8 text-base" asChild>
            <Link to="/login?view=register">{t("landing.startNow")}<ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
          <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
            <Link to="/login">{t("landing.haveAccount")}</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("landing.featuresTitle")}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("landing.featuresSubtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <div key={i}>
              <Card className="h-full gradient-card shadow-health border-border/50 hover:shadow-glow transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-xl gradient-hero flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("landing.howItWorksTitle")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.howItWorksSubtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 rounded-full gradient-hero flex items-center justify-center mx-auto mb-4 shadow-health">
                <step.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-sm font-bold text-primary mb-1">{t("landing.step")} {i + 1}</div>
              <h3 className="font-semibold text-foreground text-lg mb-1.5">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        <Card className="gradient-card shadow-glow border-border/50 overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t("landing.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("landing.ctaSubtitle")}</p>
            <Button size="lg" className="gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 h-12 px-8 text-base" asChild>
              <Link to="/login?view=register">{t("landing.ctaButton")}<ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Health Coach © {new Date().getFullYear()}</span>
          </div>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("landing.footerAccess")}</Link>
        </div>
      </footer>
    </div>
  );
}

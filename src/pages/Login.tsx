import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Heart, Eye, EyeOff, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type View = "login" | "register" | "email-exists" | "register-success";

const emailSchema = z.string().email();

export default function Login() {
  useDocumentTitle("Login | Health Coach");
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle ?view=register from landing page
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "register") setView("register");
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !profile) return;

    if (profile.is_default_password) {
      navigate("/trocar-senha", { replace: true });
    } else if (profile.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, profileLoading, user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha inválidos. Tente novamente.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = emailSchema.safeParse(registerEmail);
    if (!parsed.success) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-register", {
        body: { email: registerEmail },
      });

      if (error) throw error;

      if (data?.error === "EMAIL_EXISTS") {
        setView("email-exists");
        return;
      }

      setView("register-success");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "";
      if (msg.includes("409") || msg.includes("EMAIL_EXISTS")) {
        setView("email-exists");
      } else {
        toast.error("Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotFromExists = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke("reset-password", {
        body: { email: registerEmail },
      });
    } catch {
      // Silent — always show neutral message
    } finally {
      setLoading(false);
      toast.success("Se este e-mail estiver cadastrado, você receberá as instruções em breve.");
      setView("login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: "hsl(var(--secondary))" }} />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center shadow-health mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Health Coach</h1>
          <p className="text-muted-foreground text-sm mt-1">Sua jornada de saúde começa aqui</p>
        </div>

        {/* LOGIN */}
        {view === "login" && (
          <Card className="shadow-health border-border/50">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold">Entrar</CardTitle>
              <CardDescription>Acesse sua conta para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-0">
              <Link
                to="/esqueci-senha"
                className="text-sm text-primary hover:underline font-medium transition-colors"
              >
                Esqueci minha senha
              </Link>
              <Link
                to="/landing"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Saiba mais sobre o Health Coach
              </Link>
              <div className="flex items-center gap-2 w-full">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => setView("register")}
              >
                Criar conta
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* REGISTER */}
        {view === "register" && (
          <Card className="shadow-health border-border/50">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold">Criar conta</CardTitle>
              <CardDescription>
                Informe seu e-mail. Você receberá uma senha temporária para acessar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">E-mail</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center pt-0">
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao login
              </button>
            </CardFooter>
          </Card>
        )}

        {/* REGISTER SUCCESS */}
        {view === "register-success" && (
          <Card className="shadow-health border-border/50">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold">Conta criada!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center">
                  <Mail className="w-7 h-7 text-success" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Enviamos um e-mail para <strong>{registerEmail}</strong> com sua senha temporária. Acesse sua caixa de entrada e faça login.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pt-0">
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ir para o login
              </button>
            </CardFooter>
          </Card>
        )}

        {/* EMAIL ALREADY EXISTS */}
        {view === "email-exists" && (
          <Card className="shadow-health border-border/50">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold">E-mail já cadastrado</CardTitle>
              <CardDescription>
                Este e-mail já possui uma conta. Você pode entrar normalmente ou redefinir sua senha.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full h-11 gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 transition-opacity"
                onClick={() => {
                  setEmail(registerEmail);
                  setView("login");
                }}
              >
                Ir para o login
              </Button>
              <Button
                variant="outline"
                className="w-full h-11"
                disabled={loading}
                onClick={handleForgotFromExists}
              >
                {loading ? "Enviando..." : "Redefinir minha senha"}
              </Button>
            </CardContent>
            <CardFooter className="flex justify-center pt-0">
              <button
                type="button"
                onClick={() => setView("register")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Tentar outro e-mail
              </button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

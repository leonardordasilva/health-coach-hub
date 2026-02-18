import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Mail, AlertTriangle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error-invalid" | "error-used" | "error-expired" | "error-generic";

export default function ConfirmReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error-invalid");
      return;
    }

    supabase.functions
      .invoke("confirm-password-reset", { body: { token } })
      .then(({ data, error }) => {
        if (error) {
          setStatus("error-generic");
          return;
        }
        if (data?.error === "TOKEN_INVALID") setStatus("error-invalid");
        else if (data?.error === "TOKEN_USED") setStatus("error-used");
        else if (data?.error === "TOKEN_EXPIRED") setStatus("error-expired");
        else if (data?.success) setStatus("success");
        else setStatus("error-generic");
      })
      .catch(() => setStatus("error-generic"));
  }, [searchParams]);

  const statusConfig = {
    loading: {
      icon: <Loader2 className="w-7 h-7 text-primary animate-spin" />,
      iconBg: "bg-muted",
      title: "Gerando nova senha...",
      description: "Aguarde enquanto processamos sua solicitação.",
      action: null,
    },
    success: {
      icon: <Mail className="w-7 h-7 text-success" />,
      iconBg: "bg-success-light",
      title: "Nova senha enviada!",
      description: "Sua nova senha temporária foi enviada para o seu e-mail. Acesse sua caixa de entrada e faça login.",
      action: (
        <Button
          className="w-full h-11 gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 transition-opacity"
          onClick={() => navigate("/login")}
        >
          Ir para o login
        </Button>
      ),
    },
    "error-invalid": {
      icon: <AlertTriangle className="w-7 h-7 text-destructive" />,
      iconBg: "bg-destructive/10",
      title: "Link inválido",
      description: "Este link de redefinição é inválido. Solicite um novo na página de recuperação de senha.",
      action: (
        <Button variant="outline" className="w-full h-11" onClick={() => navigate("/esqueci-senha")}>
          Solicitar novo link
        </Button>
      ),
    },
    "error-used": {
      icon: <AlertTriangle className="w-7 h-7 text-destructive" />,
      iconBg: "bg-destructive/10",
      title: "Link já utilizado",
      description: "Este link já foi usado anteriormente. Solicite um novo se necessário.",
      action: (
        <Button variant="outline" className="w-full h-11" onClick={() => navigate("/esqueci-senha")}>
          Solicitar novo link
        </Button>
      ),
    },
    "error-expired": {
      icon: <AlertTriangle className="w-7 h-7 text-destructive" />,
      iconBg: "bg-destructive/10",
      title: "Link expirado",
      description: "Este link expirou (válido por 1 hora). Solicite um novo para continuar.",
      action: (
        <Button variant="outline" className="w-full h-11" onClick={() => navigate("/esqueci-senha")}>
          Solicitar novo link
        </Button>
      ),
    },
    "error-generic": {
      icon: <AlertTriangle className="w-7 h-7 text-destructive" />,
      iconBg: "bg-destructive/10",
      title: "Erro ao processar",
      description: "Ocorreu um erro inesperado. Tente novamente ou solicite um novo link.",
      action: (
        <Button variant="outline" className="w-full h-11" onClick={() => navigate("/esqueci-senha")}>
          Solicitar novo link
        </Button>
      ),
    },
  };

  const cfg = statusConfig[status];

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
        </div>

        <Card className="shadow-health border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">{cfg.title}</CardTitle>
            {status !== "loading" && (
              <CardDescription>{cfg.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
                {cfg.icon}
              </div>
              {status === "loading" && (
                <p className="text-center text-sm text-muted-foreground">{cfg.description}</p>
              )}
            </div>
          </CardContent>
          {cfg.action && (
            <CardFooter className="flex flex-col gap-2 pt-0">
              {cfg.action}
            </CardFooter>
          )}
        </Card>

        {status !== "loading" && (
          <div className="flex justify-center mt-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Voltar ao login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

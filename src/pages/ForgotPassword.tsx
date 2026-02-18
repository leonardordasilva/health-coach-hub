import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Heart, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email },
      });

      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error(err);
      // Always show neutral message
    } finally {
      setLoading(false);
      // Always show neutral message to prevent user enumeration
      setSent(true);
    }
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
        </div>

        <Card className="shadow-health border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Recuperar senha</CardTitle>
            <CardDescription>
              Informe seu e-mail para receber uma nova senha temporária.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center">
                  <Mail className="w-7 h-7 text-success" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Se este e-mail estiver cadastrado, você receberá as instruções em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-hero text-primary-foreground font-semibold shadow-health hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar instruções"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pt-0">
            <Link to="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

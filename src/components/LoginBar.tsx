import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

interface LoginBarProps {
  onLoginSuccess?: () => void;
}

export const LoginBar = ({ onLoginSuccess }: LoginBarProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const location = useLocation();

  // Não mostrar o LoginBar na página de autenticação
  if (location.pathname === "/auth") {
    return null;
  }

  // Esconder o LoginBar se o usuário já estiver logado
  if (session) {
    return null;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        onLoginSuccess?.();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;
        toast.success("Conta criada com sucesso! Verifique seu email.");
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Erro de autenticação:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao autenticar";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md animate-slide-in-right">
      <Card className="shadow-2xl border-border">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold">
                {isLogin ? "Acesso ao Sistema" : "Criar Conta"}
              </CardTitle>
              <CardDescription>
                {isLogin ? "Entre com suas credenciais" : "Registre-se para começar"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="hover-scale-sm"
                />
              </div>
            )}

            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="hover-scale-sm"
              />
            </div>

            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="hover-scale-sm"
              />
            </div>

            <Button type="submit" className="w-full hover-scale" disabled={loading}>
              {loading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full hover-scale"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Não tem conta? Registre-se" : "Já tem conta? Faça login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
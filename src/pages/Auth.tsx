import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = 'login' | 'signup' | 'reset';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
      } else if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
        setMode('login');
        
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setMode('login');
      }
    } catch (error: any) {
      console.error("Erro de autenticação:", error);
      
      if (error?.code === 'user_already_exists') {
        toast.error("Este email já está cadastrado. Tente fazer login.");
        setMode('login');
      } else if (error?.code === 'invalid_credentials' || error?.message?.includes('Invalid login credentials')) {
        toast.error("Email ou senha incorretos. Verifique suas credenciais.");
      } else {
        toast.error(error?.message || "Erro ao autenticar");
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'signup': return 'Criar Conta';
      case 'reset': return 'Recuperar Senha';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Entre com suas credenciais para acessar o sistema.';
      case 'signup': return 'Preencha os dados para criar sua conta.';
      case 'reset': return 'Digite seu email para receber o link de recuperação.';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Aguarde...';
    switch (mode) {
      case 'login': return 'Entrar';
      case 'signup': return 'Criar Conta';
      case 'reset': return 'Enviar Email';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {getButtonText()}
            </Button>

            <div className="flex flex-col gap-2">
              {mode === 'login' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode('signup')}
                  >
                    Não tem conta? Cadastre-se
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-muted-foreground"
                    onClick={() => setMode('reset')}
                  >
                    Esqueci minha senha
                  </Button>
                </>
              )}
              
              {mode === 'signup' && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode('login')}
                >
                  Já tem conta? Entre
                </Button>
              )}
              
              {mode === 'reset' && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode('login')}
                >
                  Voltar para login
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

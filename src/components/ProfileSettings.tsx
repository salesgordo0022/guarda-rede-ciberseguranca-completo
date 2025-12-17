import { useState, useRef, useEffect } from "react";
import { User, Camera, Lock, Save, Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const ProfileSettings = () => {
  const { user, profile, refetchProfile } = useAuth();
  console.log('ProfileSettings Debug:', { profile, user });
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Company state
  const [companyName, setCompanyName] = useState("");
  const [currentCompany, setCurrentCompany] = useState<{ name: string } | null>(null);

  // Sync fullName with profile
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (profile?.company_id) {
      fetchCompany(profile.company_id);
    }
  }, [profile?.full_name, profile?.company_id]);

  const fetchCompany = async (companyId: string) => {
    const { data } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (data) {
      setCurrentCompany(data);
    }
  };

  // Update profile name
  const updateProfileMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newName })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchProfile();
      toast.success("Nome atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar nome: " + error.message);
    }
  });

  // Create Company Mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // 1. Create Company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Link user to company (user_companies)
      // Nota: No banco real isso poderia ser via trigger, mas no mock fazemos manual
      const { error: linkError } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: company.id
        });

      if (linkError) throw linkError;

      // 3. Update profile role to admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin' // Quem cria a empresa vira admin
        });

      // Se der erro de duplicate key no role, tentamos update (embora insert deva funcionar no mock)
      if (roleError) {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
      }

      return company;
    },
    onSuccess: () => {
      refetchProfile();
      toast.success("Empresa criada com sucesso!");
      setCompanyName("");
      window.location.reload(); // Forçar reload para atualizar todos os contextos
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar empresa: " + error.message);
    }
  });

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl + "?t=" + Date.now() })
        .eq("id", user.id);

      if (updateError) throw updateError;

      refetchProfile();
      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erro ao alterar senha: " + error.message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Perfil
          </CardTitle>
          <CardDescription>
            Atualize sua foto e informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(profile?.full_name || "U")}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h3 className="font-medium">{profile?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no ícone da câmera para alterar a foto
              </p>
            </div>
          </div>

          {/* Name Update */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <div className="flex gap-2">
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
              <Button
                onClick={() => updateProfileMutation.mutate(fullName)}
                disabled={updateProfileMutation.isPending || fullName === profile?.full_name}
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurações da Empresa
          </CardTitle>
          <CardDescription>
            {profile?.company_id
              ? "Visualize as informações da sua empresa"
              : "Crie uma nova organização para começar"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.company_id ? (
            <div className="p-4 bg-muted rounded-lg border">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Empresa Atual</p>
                <p className="text-xl font-bold">{currentCompany?.name || "Carregando..."}</p>
                <p className="text-sm text-muted-foreground">
                  ID: <span className="font-mono text-xs">{profile.company_id}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Minha Empresa Ltda"
                />
              </div>
              <Button
                onClick={() => createCompanyMutation.mutate(companyName)}
                disabled={!companyName || createCompanyMutation.isPending}
                className="w-full"
              >
                {createCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando Empresa...
                  </>
                ) : (
                  "Criar Empresa e Começar"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a nova senha"
            />
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={!newPassword || !confirmPassword}
            className="w-full"
          >
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* System Status Card (Debug) */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Lock className="h-5 w-5" />
            Diagnóstico do Sistema (Debug)
          </CardTitle>
          <CardDescription>
            Informações técnicas para verificar se a criação funcionou.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm font-mono bg-white p-2 rounded border">
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Profile Role:</strong> {profile?.role}</p>
            <p><strong>Profile Company ID:</strong> {profile?.company_id ?? 'NULL (Sem empresa)'}</p>
            <p><strong>Sessão Atualizada:</strong> {new Date().toLocaleTimeString()}</p>
          </div>

          <div className="text-sm">
            <p className="font-bold mb-2">Empresas no Banco de Dados:</p>
            <CompaniesList />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CompaniesList = () => {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('companies').select('*').then(({ data }) => {
      if (data) setCompanies(data);
    });
  }, []);

  return (
    <ul className="list-disc pl-5">
      {companies.length === 0 && <li>Nenhuma empresa encontrada.</li>}
      {companies.map(c => (
        <li key={c.id}>{c.name} (ID: {c.id})</li>
      ))}
    </ul>
  );
};

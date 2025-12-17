import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  Search,
  LogOut,
  Play,
  HelpCircle,
  Building2,
  Plus,
  Users
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tutorial } from "@/components/Tutorial";
import { NotificationBell } from "@/components/NotificationBell";

const mainMenuItems = [
  { title: "Painel de Controle", url: "/", icon: LayoutDashboard },
  { title: "Projetos", url: "/projects", icon: Building2 },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { profile, signOut, isAdmin, selectedCompanyId, setSelectedCompanyId } = useAuth();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Buscar empresas disponíveis
  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile
  });

  // Buscar departamentos da empresa selecionada
  const { data: departments } = useQuery({
    queryKey: ['departments', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', selectedCompanyId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !profile?.id) return;

    try {
      // 1. Create Company
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          name: newCompanyName,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Link User
      await supabase.from('user_companies').insert({
        user_id: profile.id,
        company_id: company.id,
        role: 'admin'
      });

      // 3. Update Profile Logic (Role & Current Company)
      await supabase.from('user_roles').insert({
        user_id: profile.id,
        role: 'admin'
      });
      await supabase.from('profiles').update({ role: 'admin', company_id: company.id }).eq('id', profile.id);

      toast.success("Empresa criada com sucesso!");
      setIsCreatingCompany(false);
      setNewCompanyName("");

      // Force reload to update context
      window.location.reload();

    } catch (error: any) {
      toast.error("Erro ao criar empresa: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredDepartments = departments?.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className="border-r border-sidebar-border animate-slide-in-right">
      <SidebarHeader className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[40px]">
          <div className="text-2xl font-bold text-primary cursor-pointer hover-scale">
            TaskFlow
          </div>
        </div>

        {open && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16 cursor-pointer hover-scale">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'User'}`} />
                <AvatarFallback>{profile?.full_name?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="font-bold text-sidebar-foreground inline-flex items-center gap-1">
                  {profile?.full_name || 'Usuário'}
                </div>
                <p className="text-sm text-sidebar-foreground/70 capitalize">{profile?.role || 'Visitante'}</p>
              </div>
            </div>

            <div className="w-full">
              <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                  <SelectValue placeholder="Selecione a Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                  <div className="p-2 border-t mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCreatingCompany(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Criar Nova Empresa
                    </Button>
                  </div>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isCreatingCompany} onOpenChange={setIsCreatingCompany}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Empresa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCompanyName">Nome da Empresa</Label>
                    <Input
                      id="newCompanyName"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Ex: Minha StartUp"
                    />
                  </div>
                  <Button
                    onClick={handleCreateCompany}
                    className="w-full"
                    disabled={!newCompanyName.trim()}
                  >
                    Criar e Começar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {open && (
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
            <Input
              type="text"
              placeholder="Buscar departamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
            />
          </div>
        )}

      </SidebarHeader >

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-sidebar-accent"
                      activeClassName="bg-primary text-primary-foreground hover:bg-primary hover-scale"
                      data-tutorial={item.title === "Painel de Controle" ? "dashboard" : item.title === "Configurações" ? "settings" : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {open && <span className="text-[15px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && departments && departments.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
              Departamentos ({departments.length})
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {filteredDepartments?.map((dept) => (
                  <SidebarMenuItem key={dept.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={`/activities?department=${dept.id}`}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="text-[14px]">{dept.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2 mt-auto">
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-[hsl(194,100%,8%)] text-white hover:bg-[hsl(194,100%,12%)] hover-scale w-full">
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          {open && <span className="text-[15px]">Ajuda</span>}
        </button>

        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-sidebar-accent hover-scale w-full text-sidebar-foreground">
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {open && <span className="text-[15px]">Sair</span>}
        </button>
      </SidebarFooter>

    </Sidebar >
  );
}

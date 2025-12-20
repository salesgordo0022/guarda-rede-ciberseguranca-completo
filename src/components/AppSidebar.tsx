import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  Search,
  LogOut,
  HelpCircle,
  Building2,
  Plus,
  Rocket
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const mainMenuItems = [
  { title: "Painel de Controle", url: "/", icon: LayoutDashboard },
  { title: "Projetos", url: "/projects", icon: Building2 },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { profile, signOut, selectedCompanyId, setSelectedCompanyId, isAdmin } = useAuth();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Buscar apenas empresas às quais o usuário pertence
  const { data: companies = [] } = useQuery({
    queryKey: ['user-companies', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // Buscar empresas via user_companies (onde o usuário está vinculado)
      const { data: userCompanies, error } = await supabase
        .from('user_companies')
        .select('company_id, companies(id, name)')
        .eq('user_id', profile.id);
      
      if (error) throw error;
      
      // Extrair dados das empresas
      return userCompanies?.map(uc => uc.companies).filter(Boolean) || [];
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Buscar departamentos da empresa selecionada - filtrado por acesso do usuário
  const { data: departments } = useQuery({
    queryKey: ['departments', selectedCompanyId, profile?.id, profile?.role],
    queryFn: async () => {
      if (!selectedCompanyId || !profile?.id) return [];

      // Admin vê todos os departamentos da empresa
      if (profile.role === 'admin') {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('company_id', selectedCompanyId);

        if (error) throw error;
        return data;
      }

      // Colaborador/Gestor vê apenas departamentos aos quais tem acesso
      const { data: userDepts, error: userDeptsError } = await supabase
        .from('user_departments')
        .select('department_id')
        .eq('user_id', profile.id);

      if (userDeptsError) throw userDeptsError;

      const userDeptIds = userDepts?.map(ud => ud.department_id) || [];

      if (userDeptIds.length === 0) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .in('id', userDeptIds);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId && !!profile?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Usa a role diretamente do profile (que agora vem correta da user_companies)
  const userRole = profile?.role || 'colaborador';

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !profile?.id) return;

    try {
      // Usar Edge Function para criar empresa e vincular todos os admins
      const response = await supabase.functions.invoke("create-company", {
        body: {
          name: newCompanyName,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar empresa");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Empresa criada com sucesso!");
      setIsCreatingCompany(false);
      setNewCompanyName("");
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
            Imperium Flow
          </div>
        </div>

        {open && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16 cursor-pointer hover-scale">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">{profile?.full_name?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="font-bold text-sidebar-foreground inline-flex items-center gap-1">
                  {profile?.full_name || 'Usuário'}
                </div>
                <p className="text-sm text-sidebar-foreground/70 capitalize">{userRole}</p>
              </div>
            </div>

            <div className="w-full">
              <Select 
                value={selectedCompanyId || ""} 
                onValueChange={(value) => {
                  void setSelectedCompanyId(value);
                }}
              >
                <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                  <SelectValue placeholder="Selecione a Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                  {isAdmin && (
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
                  )}
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
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-sidebar-accent hover-scale w-full text-sidebar-foreground">
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {open && <span className="text-[15px]">Sair</span>}
        </button>

        <a 
          href="https://lovely-task-whisperer-01.lovable.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-primary/10 text-primary hover:bg-primary/20 hover-scale w-full"
        >
          <Rocket className="h-5 w-5 flex-shrink-0" />
          {open && <span className="text-[15px] font-medium">Produtivo</span>}
        </a>

        <a 
          href="https://appp.gclick.com.br/autenticacao" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover-scale w-full"
        >
          <Building2 className="h-5 w-5 flex-shrink-0" />
          {open && <span className="text-[15px] font-medium">Gclick</span>}
        </a>

        <a 
          href="https://imadgrupo.slack.com/ssb/redirect" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-[#4A154B]/20 text-[#E01E5A] hover:bg-[#4A154B]/30 hover-scale w-full"
        >
          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          {open && <span className="text-[15px] font-medium">Slack</span>}
        </a>
      </SidebarFooter>

    </Sidebar >
  );
}

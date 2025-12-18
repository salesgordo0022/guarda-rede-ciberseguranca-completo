// Importações de bibliotecas e componentes externos
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useEffect } from "react";

// Importações de hooks personalizados
import { useSystemSettings, SystemSettingsProvider } from "@/hooks/useSystemSettings";
import { useAuth, AuthProvider } from "@/hooks/useAuth";

// Importações de páginas da aplicação
import Index from "./pages/Index";
import Tasks from "./pages/Tasks";
import Auth from "./pages/Auth";
import Departments from "./pages/Departments";
import Activities from "./pages/Activities";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";

// Importações de componentes personalizados
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoginBar } from "@/components/LoginBar";
import { NotificationBell } from "@/components/NotificationBell";
import { Tutorial } from "@/components/Tutorial";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Import deadline monitoring
import { startDeadlineMonitoring } from "@/utils/deadlineMonitor";

// Cliente para gerenciamento de consultas assíncronas
const queryClient = new QueryClient();

// Componente para exibir o perfil do usuário
const UserProfile = () => {
  const { profile } = useAuth();
  
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'User'}`} />
        <AvatarFallback className="text-xs">
          {profile?.full_name?.substring(0, 2).toUpperCase() || 'US'}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium hidden md:inline">
        {profile?.full_name || 'Usuário'}
      </span>
    </div>
  );
};

// Componente para aplicar o tema globalmente
// Este componente escuta mudanças no tema e aplica as classes CSS apropriadas ao elemento raiz
const ThemeApplicator = () => {
  // Hook para acessar as configurações do sistema, incluindo o tema atual
  const { theme } = useSystemSettings();

  // Efeito para aplicar o tema sempre que ele mudar
  useEffect(() => {
    // Referência ao elemento HTML raiz do documento
    const root = window.document.documentElement;

    // Remover classes antigas de tema para evitar conflitos
    root.classList.remove("light", "dark", "blue", "black");

    // Adicionar nova classe de tema, exceto para o tema claro que é o padrão
    if (theme.name !== 'light') {
      root.classList.add(theme.name);
    }

    // Forçar atualização do esquema de cores do documento
    root.style.colorScheme = theme.name === 'dark' || theme.name === 'black' ? 'dark' : 'light';
  }, [theme]);

  // Componente não renderiza nada visualmente
  return null;
};

// Componente para proteger rotas que requerem autenticação
// Verifica se o usuário está autenticado antes de permitir acesso à rota
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Hook para acessar o estado de autenticação do usuário
  const { session, loading, companyLoading, selectedCompanyId } = useAuth();

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  // Redirecionar para página de autenticação se não estiver logado
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Mostrar carregamento enquanto busca empresa
  if (companyLoading || (!selectedCompanyId && session)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">Carregando empresa...</p>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Renderizar os filhos se estiver autenticado
  return <>{children}</>;
};

// Componente principal da aplicação
const App = () => {
  useEffect(() => {
    // Start deadline monitoring when app loads
    startDeadlineMonitoring();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SystemSettingsProvider>
        <AuthProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Sonner />
              <ThemeApplicator />
              <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                <LoginBar />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <div className="relative min-h-screen flex w-full">
                          <SidebarProvider>
                            <div className="flex w-full">
                              <AppSidebar />
                              <main className="flex-1 overflow-auto">
                                <div className="border-b border-border bg-background sticky top-0 z-10">
                                  <div className="flex items-center justify-between h-14 px-4">
                                    <SidebarTrigger />
                                    <div className="flex items-center gap-4">
                                      <NotificationBell />
                                      <UserProfile />
                                    </div>
                                  </div>
                                </div>
                                <Routes>
                                  <Route path="/" element={<Index data-tutorial="dashboard" />} />
                                  <Route path="/departments" element={<Departments data-tutorial="departments" />} />
                                  <Route path="/activities" element={<Activities data-tutorial="activities" />} />
                                  <Route path="/projects" element={<Projects />} />
                                  <Route path="/projects/:projectId" element={<ProjectDetail />} />
                                  <Route path="/settings" element={<Settings data-tutorial="settings" />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </main>
                            </div>
                            <div className="fixed bottom-4 right-4 z-50">
                              <Tutorial />
                            </div>
                          </SidebarProvider>
                        </div>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </SystemSettingsProvider>
    </QueryClientProvider>
  );
};

export default App;
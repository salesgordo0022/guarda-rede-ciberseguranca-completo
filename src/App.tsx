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
import Team from "./pages/Team";
import Auth from "./pages/Auth";
import Departments from "./pages/Departments";
import Users from "./pages/Users";
import Activities from "./pages/Activities";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";

// Importações de componentes personalizados
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoginBar } from "@/components/LoginBar";

// Cliente para gerenciamento de consultas assíncronas
const queryClient = new QueryClient();

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
  const { session, loading } = useAuth();

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  // Redirecionar para página de autenticação se não estiver logado
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Renderizar os filhos se estiver autenticado
  return <>{children}</>;
};

// Componente principal da aplicação
const App = () => (
  <QueryClientProvider client={queryClient}>
    <SystemSettingsProvider>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <ThemeApplicator />
            <LoginBar />
            <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <div className="min-h-screen flex w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-auto">
                            <div className="border-b border-border bg-background sticky top-0 z-10">
                              <div className="flex items-center h-14 px-4">
                                <SidebarTrigger />
                              </div>
                            </div>
                            <Routes>
                              <Route path="/" element={<Index data-tutorial="dashboard" />} />
                              <Route path="/team" element={<Team data-tutorial="team" />} />
                              <Route path="/departments" element={<Departments data-tutorial="departments" />} />
                              <Route path="/users" element={<Users data-tutorial="users" />} />
                              <Route path="/activities" element={<Activities data-tutorial="activities" />} />
                              <Route path="/projects" element={<Projects />} />
                              <Route path="/projects/:projectId" element={<ProjectDetail />} />
                              <Route path="/settings" element={<Settings data-tutorial="settings" />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </main>
                        </div>
                      </SidebarProvider>
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

export default App;
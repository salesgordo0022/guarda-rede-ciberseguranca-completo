import { useState } from "react";
import { Search, Calendar, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButtons } from "@/components/ActionButtons";
import { GlobalTasksPanel } from "@/components/GlobalTasksPanel";
import { GlobalMetricsCards } from "@/components/GlobalMetricsCards";
import { DashboardCard } from "@/components/DashboardCard";
import { TaskChart } from "@/components/TaskChart";
import { useGlobalMetrics } from "@/hooks/useGlobalMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";

const Index = () => {
  const { selectedCompanyId, profile } = useAuth();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const { metrics } = useGlobalMetrics();

  // Fetch profiles - com staleTime para evitar refetch desnecessário
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Fetch departments - com staleTime para evitar refetch desnecessário
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', selectedCompanyId)
        .order('name');
      return data || [];
    },
    enabled: !!selectedCompanyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Fetch projects for task creation - com staleTime para evitar refetch desnecessário
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', selectedCompanyId)
        .order('name');
      return data || [];
    },
    enabled: !!selectedCompanyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Dados para gráfico de pizza - Distribuição por status
  const statusChartData = metrics ? [
    { name: 'Concluídas', value: metrics.completed },
    { name: 'Em andamento', value: metrics.in_progress },
    { name: 'Pendentes', value: metrics.pending },
    { name: 'Atrasadas', value: metrics.overdue },
  ].filter(item => item.value > 0) : [];

  // Dados para gráfico de barras - Comparativo
  const comparisonChartData = metrics ? [
    { name: 'Total', value: metrics.total },
    { name: 'Concluídas', value: metrics.completed },
    { name: 'Atrasadas', value: metrics.overdue },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Painel de Controle</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Bem-vindo de volta, {profile?.full_name || 'usuário'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Digite aqui para começar a pesquisa..."
            className="pl-9 w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButtons
            onCreateTask={() => setIsCreateTaskOpen(true)}
            date={date}
            onDateChange={setDate}
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <DashboardCard
          title="Total de Atividades"
          value={metrics?.total || 0}
          description="Projetos + Departamentos"
          icon={Calendar}
          iconColor="text-blue-600"
        />

        <DashboardCard
          title="Pendentes"
          value={metrics ? metrics.in_progress + metrics.pending : 0}
          description="Atividades em andamento ou pendentes"
          icon={ClipboardList}
          iconColor="text-purple-600"
        />
      </div>

      {/* Painel unificado de atividades */}
      <GlobalTasksPanel />

      {/* Cards de métricas clicáveis */}
      <GlobalMetricsCards />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <TaskChart
          type="pie"
          title="Distribuição de Atividades"
          description="Atividades por status (Projetos + Departamentos)"
          data={statusChartData}
        />

        <TaskChart
          type="bar"
          title="Comparativo Geral"
          description="Visão geral das atividades"
          data={comparisonChartData}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do Dia</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total de Atividades</p>
              <p className="text-2xl md:text-3xl font-bold">{metrics?.total || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {metrics?.total ? ((metrics.completed / metrics.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Atividades Atrasadas</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">
                {metrics?.overdue || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Sistema de Gestão © 2025
      </div>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        onSubmit={(data) => {
          // Handle task creation
        }}
        departments={departments}
        profiles={profiles}
        projects={projects}
      />
    </div>
  );
};

export default Index;

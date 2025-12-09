import { useState, useMemo } from "react";
import { Search, Calendar, ClipboardList, CheckCircle2, TrendingUp, Clock, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButtons } from "@/components/ActionButtons";
import { DepartmentTasksPanel } from "@/components/DepartmentTasksPanel";
import { DashboardCard } from "@/components/DashboardCard";
import { TaskChart } from "@/components/TaskChart";
import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

import { CreateTaskDialog } from "@/components/CreateTaskDialog";

const Index = () => {
  const { selectedCompanyId, profile } = useAuth();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const { metrics, createTask } = useTasks();

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    }
  });

  // Fetch departments
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
    enabled: !!selectedCompanyId
  });

  // Fetch projects for task creation
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
    enabled: !!selectedCompanyId
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Painel de Controle</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {profile?.full_name || 'usuário'}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Digite aqui para começar a pesquisa..."
            className="pl-9"
          />
        </div>

        <ActionButtons
          onCreateTask={() => setIsCreateTaskOpen(true)}
          date={date}
          onDateChange={setDate}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title="Total de Atividades"
          value={metrics?.total || 0}
          description="Atividades cadastradas"
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

      <DepartmentTasksPanel date={date} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{metrics?.completed || 0}</div>
            <p className="text-xs text-green-600 mt-1">
              {metrics?.total ? ((metrics.completed / metrics.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{metrics?.in_progress || 0}</div>
            <p className="text-xs text-blue-600 mt-1">Atividades sendo executadas</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{metrics?.overdue || 0}</div>
            <p className="text-xs text-orange-600 mt-1">Requerem atenção urgente</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <XCircle className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{metrics?.pending || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Aguardando início</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TaskChart
          type="pie"
          title="Distribuição de Atividades"
          description="Atividades por status"
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total de Atividades</p>
              <p className="text-3xl font-bold">{metrics?.total || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-green-600">
                {metrics?.total ? ((metrics.completed / metrics.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Atividades Atrasadas</p>
              <p className="text-3xl font-bold text-red-600">
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
          if (data.project_id) {
            createTask({ 
              name: data.name || data.title || '', 
              project_id: data.project_id,
              description: data.description 
            });
          }
        }}
        departments={departments}
        profiles={profiles}
        projects={projects}
      />
    </div>
  );
};

export default Index;
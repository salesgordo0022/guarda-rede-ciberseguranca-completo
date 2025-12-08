import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButtons } from "@/components/ActionButtons";
import { DepartmentTasksPanel } from "@/components/DepartmentTasksPanel";
import {
  Calendar,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Clock,
  XCircle
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { TaskChart } from "@/components/TaskChart";
import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivitiesTable } from "@/components/ActivitiesTable";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TaskStatus, Task } from "@/types/task";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";

const FilteredTasksModal = ({
  status,
  isOpen,
  onClose
}: {
  status: string | null,
  isOpen: boolean,
  onClose: () => void
}) => {
  const { isAdmin } = useAuth();

  const filters = useMemo(() => ({
    status: status ? [status as TaskStatus] : undefined
  }), [status]);

  const { tasks, updateTask, deleteTask, completeTask, isLoading } = useTasks(filters);

  // Fetch profiles for the responsible select
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    }
  });

  const handleEdit = (task: Task) => {
    window.location.href = "/activities";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tarefas - {status}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ActivitiesTable
            tasks={tasks}
            isLoading={isLoading}
            isAdmin={isAdmin}
            profiles={profiles}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onCompleteTask={completeTask}
            onEditTask={handleEdit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Index = () => {
  const { selectedCompanyId } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Filtros para useTasks
  const filters = useMemo(() => {
    const f: any = {};
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      f.date_from = dateStr;
      f.date_to = dateStr;
    }
    return f;
  }, [date]);

  const { metrics, createTask } = useTasks(filters);

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

  // Dados para gráfico de pizza - Distribuição por status
  const statusChartData = metrics ? [
    { name: 'Feito', value: metrics.completed },
    { name: 'Em andamento', value: metrics.in_progress },
    { name: 'Não iniciado', value: metrics.not_started },
    { name: 'Parado', value: metrics.stopped },
  ].filter(item => item.value > 0) : [];

  // Dados para gráfico de barras - Comparativo
  const comparisonChartData = metrics ? [
    { name: 'Total', value: metrics.total },
    { name: 'Concluídas', value: metrics.completed },
    { name: 'Atrasadas', value: metrics.overdue },
  ] : [];

  const handleChartClick = (data: any) => {
    if (data && data.name) {
      const statusMap: Record<string, string> = {
        'Feito': 'Feito',
        'Em andamento': 'Em andamento',
        'Não iniciado': 'Não iniciado',
        'Parado': 'Parado'
      };

      if (statusMap[data.name]) {
        setSelectedStatus(statusMap[data.name]);
        setIsModalOpen(true);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
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
          title="Vencem Hoje"
          value={metrics?.due_today || 0}
          description="Tarefas com prazo para hoje"
          icon={Calendar}
          iconColor="text-blue-600"
        />

        <DashboardCard
          title="Pendentes"
          value={metrics ? metrics.in_progress + metrics.not_started : 0}
          description="Tarefas em andamento ou não iniciadas"
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
            <p className="text-xs text-blue-600 mt-1">Tarefas sendo executadas</p>
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

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paradas</CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{metrics?.stopped || 0}</div>
            <p className="text-xs text-red-600 mt-1">Tarefas bloqueadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TaskChart
          type="pie"
          title="Distribuição de Tarefas"
          description="Tarefas por status"
          data={statusChartData}
          onClick={handleChartClick}
        />

        <TaskChart
          type="bar"
          title="Comparativo Geral"
          description="Visão geral das tarefas"
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
              <p className="text-sm font-medium text-muted-foreground">Total de Tarefas</p>
              <p className="text-3xl font-bold">{metrics?.total || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-green-600">
                {metrics?.total ? ((metrics.completed / metrics.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tarefas Atrasadas</p>
              <p className="text-3xl font-bold text-red-600">
                {metrics?.overdue || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Omie © 2025
      </div>

      <FilteredTasksModal
        status={selectedStatus}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        onSubmit={createTask}
        departments={departments}
        profiles={profiles}
      />
    </div>
  );
};

export default Index;

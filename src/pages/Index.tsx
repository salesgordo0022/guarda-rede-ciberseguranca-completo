import { useState } from "react";
import { Search, Calendar, ClipboardList, Building2, Folder, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButtons } from "@/components/ActionButtons";
import { GlobalTasksPanel } from "@/components/GlobalTasksPanel";
import { GlobalMetricsCards } from "@/components/GlobalMetricsCards";
import { DashboardCard } from "@/components/DashboardCard";
import { TaskChart } from "@/components/TaskChart";
import { useGlobalMetrics, UnifiedActivity } from "@/hooks/useGlobalMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChartCategory = 'concluidas' | 'em_andamento' | 'pendentes' | 'atrasadas' | 'total' | null;

const Index = () => {
  const { selectedCompanyId, profile } = useAuth();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<ChartCategory>(null);
  const [filteredActivities, setFilteredActivities] = useState<UnifiedActivity[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { metrics, activities } = useGlobalMetrics();

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

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'pendente': 'Pendente',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'pendente': 'outline',
      'em_andamento': 'secondary',
      'concluida': 'default',
      'cancelada': 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const getCategoryTitle = (category: ChartCategory): string => {
    const titles: Record<string, string> = {
      'concluidas': 'Atividades Concluídas',
      'em_andamento': 'Atividades Em Andamento',
      'pendentes': 'Atividades Pendentes',
      'atrasadas': 'Atividades Atrasadas',
      'total': 'Todas as Atividades',
    };
    return titles[category || ''] || 'Atividades';
  };

  const handlePieChartClick = (data: any) => {
    if (!data?.name) return;
    
    const categoryMap: Record<string, ChartCategory> = {
      'Concluídas': 'concluidas',
      'Em andamento': 'em_andamento',
      'Pendentes': 'pendentes',
      'Atrasadas': 'atrasadas',
    };
    
    const category = categoryMap[data.name];
    if (!category) return;
    
    let filtered: UnifiedActivity[] = [];
    
    if (category === 'concluidas') {
      filtered = activities.filter(a => a.status === 'concluida');
    } else if (category === 'em_andamento') {
      filtered = activities.filter(a => a.status === 'em_andamento');
    } else if (category === 'pendentes') {
      filtered = activities.filter(a => a.status === 'pendente');
    } else if (category === 'atrasadas') {
      filtered = activities.filter(a => a.deadline_status === 'fora_do_prazo');
    }
    
    setSelectedCategory(category);
    setFilteredActivities(filtered);
    setDialogOpen(true);
  };

  const handleBarChartClick = (data: any) => {
    if (!data?.name) return;
    
    const categoryMap: Record<string, ChartCategory> = {
      'Total': 'total',
      'Concluídas': 'concluidas',
      'Atrasadas': 'atrasadas',
    };
    
    const category = categoryMap[data.name];
    if (!category) return;
    
    let filtered: UnifiedActivity[] = [];
    
    if (category === 'total') {
      filtered = activities;
    } else if (category === 'concluidas') {
      filtered = activities.filter(a => a.status === 'concluida');
    } else if (category === 'atrasadas') {
      filtered = activities.filter(a => a.deadline_status === 'fora_do_prazo');
    }
    
    setSelectedCategory(category);
    setFilteredActivities(filtered);
    setDialogOpen(true);
  };

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
          onClick={handlePieChartClick}
        />

        <TaskChart
          type="bar"
          title="Comparativo Geral"
          description="Visão geral das atividades"
          data={comparisonChartData}
          onClick={handleBarChartClick}
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

      {/* Dialog para exibir lista de atividades filtradas */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{getCategoryTitle(selectedCategory)}</DialogTitle>
            <DialogDescription>
              {filteredActivities.length} atividade{filteredActivities.length !== 1 ? 's' : ''} encontrada{filteredActivities.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p>Nenhuma atividade encontrada nesta categoria.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prazo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {activity.type === 'project' ? (
                            <><Folder className="h-4 w-4 text-blue-500" /> Projeto</>
                          ) : (
                            <><Building2 className="h-4 w-4 text-purple-500" /> Departamento</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{activity.source_name}</TableCell>
                      <TableCell>{getStatusBadge(activity.status)}</TableCell>
                      <TableCell>
                        {activity.deadline 
                          ? format(new Date(activity.deadline), "dd/MM/yyyy", { locale: ptBR })
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

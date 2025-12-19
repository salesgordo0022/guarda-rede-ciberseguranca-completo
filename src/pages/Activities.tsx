import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, List, GitBranch, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyActivityStatusChanged } from "@/utils/notificationService";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

import { ActivityTable } from "@/components/ActivityTable";
import { ActivityDetailsSheet } from "@/components/ActivityDetailsSheet";
import { ProcessFlowDiagram } from "@/components/ProcessFlowDiagram";

type ActivityStatus = Database['public']['Enums']['activity_status'];

interface Department {
  id: string;
  name: string;
}

interface DepartmentActivity {
  id: string;
  name: string;
  description: string | null;
  status: ActivityStatus;
  deadline: string | null;
  goal_date: string | null;
  scheduled_date: string | null;
  deadline_status: Database['public']['Enums']['deadline_status'] | null;
  updated_at: string;
  department_id: string;
  priority: string | null;
  created_by: string | null;
  created_at: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  assignees?: {
    user_id: string;
    profiles?: {
      id: string;
      full_name: string;
      avatar_url?: string | null;
    } | null;
  }[];
}

const Activities = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const departmentFilterId = searchParams.get("department");
  const { isAdmin, isGestor, selectedCompanyId, profile } = useAuth();
  const queryClient = useQueryClient();

  const [viewing, setViewing] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch departments - com staleTime para evitar refetch
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', selectedCompanyId)
        .order('name');

      return data as Department[] || [];
    },
    enabled: !!selectedCompanyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Redirect to first department if none selected
  useEffect(() => {
    if (departments.length > 0 && !departmentFilterId) {
      navigate(`/activities?department=${departments[0].id}`, { replace: true });
    }
  }, [departments, departmentFilterId, navigate]);

  // Fetch ALL department activities (including completed for metrics)
  const { data: allActivities = [], isLoading } = useQuery({
    queryKey: ['department-activities-all', departmentFilterId, selectedCompanyId],
    queryFn: async (): Promise<DepartmentActivity[]> => {
      if (!departmentFilterId || !selectedCompanyId) return [];

      const { data: activitiesData, error } = await supabase
        .from('department_activities')
        .select(`
          *,
          department:departments(id, name, company_id)
        `)
        .eq('department_id', departmentFilterId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredActivities = (activitiesData || []).filter((activity: any) =>
        activity.department?.company_id === selectedCompanyId
      );

      // Fetch assignees for all activities
      const activityIds = filteredActivities.map((a: any) => a.id);
      const { data: assigneesData } = await supabase
        .from("department_activity_assignees")
        .select("activity_id, user_id")
        .in("activity_id", activityIds);

      // Fetch profiles for assignees
      const userIds = [...new Set(assigneesData?.map(a => a.user_id) || [])];
      let profilesData: { id: string; full_name: string; avatar_url: string | null }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
        profilesData = data || [];
      }

      // Map profiles to assignees
      const profilesMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>(
        profilesData.map(p => [p.id, p])
      );

      // Attach assignees to activities
      return filteredActivities.map((activity: any) => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        status: activity.status,
        deadline: activity.deadline,
        goal_date: activity.goal_date,
        scheduled_date: activity.scheduled_date,
        deadline_status: activity.deadline_status,
        updated_at: activity.updated_at,
        department_id: activity.department_id,
        priority: activity.priority,
        created_by: activity.created_by,
        created_at: activity.created_at,
        department: activity.department,
        assignees: (assigneesData || [])
          .filter(a => a.activity_id === activity.id)
          .map(a => ({
            user_id: a.user_id,
            profiles: profilesMap.get(a.user_id) || null
          }))
      }));
    },
    enabled: !!departmentFilterId && !!selectedCompanyId,
    staleTime: 1000 * 60, // 1 minuto para atividades (dados mais dinâmicos)
  });

  // Calculate metrics from all activities
  const metrics = useMemo(() => {
    const total = allActivities.length;
    const completed = allActivities.filter(a => a.status === "concluida").length;
    const inProgress = allActivities.filter(a => a.status === "em_andamento").length;
    const pending = allActivities.filter(a => a.status === "pendente").length;
    const overdue = allActivities.filter(a => a.deadline_status === "fora_do_prazo").length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, pending, overdue, completionPercentage };
  }, [allActivities]);

  // Filter activities: exclude completed AND apply search
  const filteredActivities = useMemo(() => {
    return allActivities.filter(activity =>
      activity.status !== 'concluida' && (
        activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
  }, [allActivities, searchQuery]);

  // Update activity mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; status?: ActivityStatus; deadline?: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('department_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities-all'] });
      toast.success('Atividade atualizada!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar atividade: ${error.message}`);
    }
  });

  // Delete activity mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities-all'] });
      toast.success('Atividade excluída!');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir atividade: ${error.message}`);
    }
  });

  // Complete activity mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: updated, error } = await supabase
        .from('department_activities')
        .update({
          status: 'concluida' as ActivityStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, name, department_id')
        .single();

      if (error) throw error;

      // Notificar todos da empresa sobre atividade concluída
      if (profile?.id && selectedCompanyId) {
        await notifyActivityStatusChanged(
          selectedCompanyId,
          updated.name,
          'em_andamento',
          'concluida',
          updated.id,
          updated.department_id,
          profile.full_name || 'Usuário',
          profile.id
        );
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities-all'] });
      toast.success('Atividade concluída!');
    },
    onError: (error) => {
      toast.error(`Erro ao concluir atividade: ${error.message}`);
    }
  });

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;
    deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: ActivityStatus) => {
    updateMutation.mutate({ id, status });
  };

  const handleEdit = (activity: any) => {
    setViewing(activity);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const currentDepartmentName = departments.find(d => d.id === departmentFilterId)?.name;

  if (!departmentFilterId && departments.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground animate-fade-in">
        <p>Nenhum departamento encontrado. Crie um novo em Configurações.</p>
      </div>
    );
  }

  if (!departmentFilterId) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {currentDepartmentName || "Departamento"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie as atividades deste departamento
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{metrics.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Departamento</CardTitle>
          <CardDescription>
            {metrics.completionPercentage}% concluído
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-4">
              <div
                className={`h-4 rounded-full ${getProgressColor(metrics.completionPercentage)}`}
                style={{ width: `${metrics.completionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Atividades do Departamento</h2>
          <p className="text-muted-foreground">
            Gerencie as atividades deste departamento
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar atividades..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {(isAdmin || isGestor) && (
            <Button onClick={() => setIsCreating(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="process" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Processo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <ActivityTable
                activities={filteredActivities}
                isLoading={isLoading}
                onStatusChange={handleStatusChange}
                onEdit={(isAdmin || isGestor) ? handleEdit : undefined}
                onDelete={(isAdmin || isGestor) ? handleDelete : undefined}
                onComplete={(id) => completeMutation.mutate(id)}
                showActions={true}
                emptyMessage="Nenhuma atividade encontrada."
                currentUserId={profile?.id}
                isAdmin={isAdmin}
                onView={(activity) => setViewing(activity)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process">
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <ProcessFlowDiagram 
                activities={filteredActivities}
                onActivityClick={(activity) => setViewing(activity)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ActivityDetailsSheet
        activity={viewing}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        mode="view"
      />

      <ActivityDetailsSheet
        activity={null}
        open={isCreating}
        onOpenChange={setIsCreating}
        mode="create"
        preselectedDepartmentId={departmentFilterId || undefined}
      />
    </div>
  );
};

export default Activities;

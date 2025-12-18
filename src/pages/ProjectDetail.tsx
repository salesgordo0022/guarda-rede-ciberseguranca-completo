import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Search, ArrowLeft, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivityTable } from "@/components/ActivityTable";
import { ActivityDetailsSheet } from "@/components/ActivityDetailsSheet";
import { Database } from "@/integrations/supabase/types";

type ActivityStatus = Database['public']['Enums']['activity_status'];

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface ProjectActivity {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: ActivityStatus | null;
  deadline: string | null;
  deadline_status: Database['public']['Enums']['deadline_status'] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignees?: {
    user_id: string;
    profiles?: {
      id: string;
      full_name: string;
    } | null;
  }[];
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin, isGestor, selectedCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<any>(null); // For editing
  const [viewingActivity, setViewingActivity] = useState<any>(null); // For detailed view
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch project
  const { data: project, isLoading: isProjectLoading, error: projectError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("ID do projeto não fornecido");

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });

  // Fetch company users (profiles)
  const { data: companyUsers = [] } = useQuery({
    queryKey: ['company-users', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      // Primeiro busca os user_ids da empresa
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', selectedCompanyId);

      if (ucError) {
        console.error('Erro ao buscar membros da empresa:', ucError);
        return [];
      }

      if (!userCompanies || userCompanies.length === 0) return [];

      const userIds = userCompanies.map(uc => uc.user_id);

      // Depois busca os perfis desses usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
        return [];
      }

      return profiles || [];
    },
    enabled: !!selectedCompanyId
  });

  // Helper function to get user name by ID
  const getUserNameById = (userId: string) => {
    const user = companyUsers.find(u => u.id === userId);
    return user ? user.full_name : userId;
  };

  // Fetch project activities with assignees
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["project-activities", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (activitiesError) throw activitiesError;

      // Fetch assignees for all activities
      const activityIds = activitiesData.map(a => a.id);
      const { data: assigneesData } = await supabase
        .from("project_activity_assignees")
        .select("activity_id, user_id")
        .in("activity_id", activityIds);

      // Fetch profiles for assignees
      const userIds = [...new Set(assigneesData?.map(a => a.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Map profiles to assignees
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Attach assignees to activities
      return activitiesData.map(activity => ({
        ...activity,
        assignees: (assigneesData || [])
          .filter(a => a.activity_id === activity.id)
          .map(a => ({
            user_id: a.user_id,
            profiles: profilesMap.get(a.user_id) || null
          }))
      })) as ProjectActivity[];
    },
    enabled: !!projectId,
  });

  // Filter activities based on search query AND exclude completed ones
  const filteredActivities = activities.filter(activity =>
    activity.status !== 'concluida' && (
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );



  const handleUpdateActivityStatus = async (id: string, status: ActivityStatus) => {
    try {
      const updates: any = { status };
      if (status === 'concluida') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("project_activities")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
    } catch (error) {
      toast.error("Erro ao atualizar status: " + (error as Error).message);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;

    try {
      const { error } = await supabase
        .from("project_activities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Atividade excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
    } catch (error) {
      toast.error("Erro ao excluir atividade: " + (error as Error).message);
    }
  };



  const handleStatusChange = async (id: string, status: ActivityStatus) => {
    await handleUpdateActivityStatus(id, status);
  };

  if (projectError) {
    return (
      <div className="p-6">
        <div className="text-red-500">Erro ao carregar projeto: {projectError.message}</div>
      </div>
    );
  }

  if (isProjectLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-xl font-bold">Projeto não encontrado</div>
          <Button
            onClick={() => navigate("/projects")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Projetos
          </Button>
        </div>
      </div>
    );
  }

  // Calculate project metrics
  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.status === "concluida").length;
  const inProgressActivities = activities.filter(a => a.status === "em_andamento").length;
  const pendingActivities = activities.filter(a => a.status === "pendente").length;
  const overdueActivities = activities.filter(a => a.deadline_status === "fora_do_prazo").length;

  const completionPercentage = totalActivities > 0
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.description || "Sem descrição"}
          </p>
          {project.created_by && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Criado por: {getUserNameById(project.created_by)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{pendingActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Projeto</CardTitle>
          <CardDescription>
            {completionPercentage}% concluído
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-4">
              <div
                className={`h-4 rounded-full ${getProgressColor(completionPercentage)}`}
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Atividades do Projeto</h2>
          <p className="text-muted-foreground">
            Gerencie as atividades deste projeto
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

      {/* Activities Table */}
      <Card>
        <CardContent className="p-0">
          <ActivityTable
            activities={filteredActivities}
            isLoading={isActivitiesLoading}
            onStatusChange={handleStatusChange}
            onEdit={(isAdmin || isGestor) ? (activity) => setViewingActivity(activity) : undefined}
            onDelete={(isAdmin || isGestor) ? handleDeleteActivity : undefined}
            onComplete={(id) => handleStatusChange(id, 'concluida')}
            showActions={true}
            emptyMessage="Nenhuma atividade encontrada"
            currentUserId={profile?.id}
            isAdmin={isAdmin}
            onView={(activity) => setViewingActivity(activity)}
          />
        </CardContent>
      </Card>

      <ActivityDetailsSheet
        activity={viewingActivity}
        open={!!viewingActivity}
        onOpenChange={(open) => !open && setViewingActivity(null)}
        mode="view"
      />

      <ActivityDetailsSheet
        activity={null}
        open={isCreating}
        onOpenChange={setIsCreating}
        mode="create"
        preselectedProjectId={projectId}
      />
    </div>
  );
};

export default ProjectDetail;
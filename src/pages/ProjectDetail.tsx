import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ProjectActivitiesTable } from "@/components/ProjectActivitiesTable";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectActivity {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  responsible: string | null;
  department_ids: string[] | null;
  status: string;
  priority: string;
  deadline: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  schedule_status: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin, isGestor } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateActivityDialogOpen, setIsCreateActivityDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state for new activity
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityResponsible, setActivityResponsible] = useState("");
  const [activityStatus, setActivityStatus] = useState("Não iniciado");
  const [activityPriority, setActivityPriority] = useState("média");
  const [activityDeadline, setActivityDeadline] = useState("");
  const [activityScheduleStart, setActivityScheduleStart] = useState("");
  const [activityScheduleEnd, setActivityScheduleEnd] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

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

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!profile?.company_id,
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch project activities
  const { data: activities = [], isLoading: isActivitiesLoading, error: activitiesError } = useQuery({
    queryKey: ["project-activities", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProjectActivity[];
    },
    enabled: !!projectId,
  });

  // Filter activities based on search query
  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      toast.error("Erro: Projeto não encontrado");
      return;
    }

    try {
      const { error } = await supabase
        .from("project_activities")
        .insert({
          project_id: projectId,
          title: activityTitle,
          description: activityDescription,
          responsible: activityResponsible || null,
          department_ids: selectedDepartments.length > 0 ? selectedDepartments : null,
          status: activityStatus,
          priority: activityPriority,
          deadline: activityDeadline || null,
          schedule_start: activityScheduleStart || null,
          schedule_end: activityScheduleEnd || null,
          schedule_status: calculateScheduleStatus(activityDeadline, activityScheduleEnd),
          has_fine: false,
          created_by: profile?.id || null,
        });

      if (error) throw error;

      toast.success("Atividade criada com sucesso!");
      setIsCreateActivityDialogOpen(false);
      resetActivityForm();
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
    } catch (error) {
      toast.error("Erro ao criar atividade: " + (error as Error).message);
    }
  };

  const handleUpdateActivity = async (data: Partial<ProjectActivity> & { id: string }) => {
    try {
      const { error } = await supabase
        .from("project_activities")
        .update(data)
        .eq("id", data.id);

      if (error) throw error;

      toast.success("Atividade atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
    } catch (error) {
      toast.error("Erro ao atualizar atividade: " + (error as Error).message);
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

  const handleEditActivity = (activity: ProjectActivity) => {
    // For now, we'll just show a toast. In a real implementation, you might open an edit dialog.
    toast.info("Funcionalidade de edição em desenvolvimento");
  };

  const calculateScheduleStatus = (deadline: string | null, scheduleEnd: string | null) => {
    if (!deadline || !scheduleEnd) return null;
    const deadlineDate = new Date(deadline);
    const scheduleEndDate = new Date(scheduleEnd);
    const today = new Date();
    if (today > deadlineDate || today > scheduleEndDate) {
      return "Atrasado";
    }
    return "Dentro do prazo";
  };

  const resetActivityForm = () => {
    setActivityTitle("");
    setActivityDescription("");
    setActivityResponsible("");
    setActivityStatus("Não iniciado");
    setActivityPriority("média");
    setActivityDeadline("");
    setActivityScheduleStart("");
    setActivityScheduleEnd("");
    setSelectedDepartments([]);
  };

  const getActivityPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente": return "bg-red-500";
      case "alta": return "bg-orange-500";
      case "média": return "bg-yellow-500";
      case "baixa": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case "Feito": return "bg-green-500";
      case "Em andamento": return "bg-blue-500";
      case "Parado": return "bg-red-500";
      case "Não iniciado": return "bg-gray-500";
      default: return "bg-gray-500";
    }
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
  const completedActivities = activities.filter(a => a.status === "Feito").length;
  const inProgressActivities = activities.filter(a => a.status === "Em andamento").length;
  const notStartedActivities = activities.filter(a => a.status === "Não iniciado").length;
  const overdueActivities = activities.filter(a => a.schedule_status === "Atrasado").length;
  
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
            <CardTitle className="text-sm font-medium">Não Iniciadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{notStartedActivities}</div>
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
            Gerencie as atividades transversais deste projeto
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
            <Dialog open={isCreateActivityDialogOpen} onOpenChange={setIsCreateActivityDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Atividade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Atividade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateActivity} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityTitle">Título da Atividade *</Label>
                    <Input
                      id="activityTitle"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      placeholder="Ex: Definir escopo do projeto"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="activityDescription">Descrição</Label>
                    <textarea
                      id="activityDescription"
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      placeholder="Descreva os detalhes da atividade..."
                      className="w-full min-h-[100px] p-3 border rounded-md bg-background text-foreground"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activityResponsible">Responsável</Label>
                      <Select value={activityResponsible} onValueChange={setActivityResponsible}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="activityPriority">Prioridade</Label>
                      <Select value={activityPriority} onValueChange={setActivityPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              Baixa
                            </div>
                          </SelectItem>
                          <SelectItem value="média">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              Média
                            </div>
                          </SelectItem>
                          <SelectItem value="alta">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              Alta
                            </div>
                          </SelectItem>
                          <SelectItem value="urgente">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              Urgente
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activityStatus">Status</Label>
                      <Select value={activityStatus} onValueChange={setActivityStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                          <SelectItem value="Em andamento">Em andamento</SelectItem>
                          <SelectItem value="Parado">Parado</SelectItem>
                          <SelectItem value="Feito">Feito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Departamentos Envolvidos</Label>
                      <div className="flex flex-wrap gap-2">
                        {departments.map((dept) => (
                          <Badge
                            key={dept.id}
                            className={`cursor-pointer ${
                              selectedDepartments.includes(dept.id)
                                ? "bg-primary"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                            onClick={() => {
                              if (selectedDepartments.includes(dept.id)) {
                                setSelectedDepartments(
                                  selectedDepartments.filter((id) => id !== dept.id)
                                );
                              } else {
                                setSelectedDepartments([...selectedDepartments, dept.id]);
                              }
                            }}
                          >
                            {dept.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activityDeadline">Prazo</Label>
                      <Input
                        id="activityDeadline"
                        type="date"
                        value={activityDeadline}
                        onChange={(e) => setActivityDeadline(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="activityScheduleStart">Início do Cronograma</Label>
                      <Input
                        id="activityScheduleStart"
                        type="date"
                        value={activityScheduleStart}
                        onChange={(e) => setActivityScheduleStart(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="activityScheduleEnd">Fim do Cronograma</Label>
                      <Input
                        id="activityScheduleEnd"
                        type="date"
                        value={activityScheduleEnd}
                        onChange={(e) => setActivityScheduleEnd(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Criar Atividade
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Activities List */}
      {isActivitiesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ProjectActivitiesTable
          activities={filteredActivities}
          isLoading={isActivitiesLoading}
          departments={departments}
          profiles={profiles}
          onUpdateActivity={handleUpdateActivity}
          onDeleteActivity={handleDeleteActivity}
          onEditActivity={handleEditActivity}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
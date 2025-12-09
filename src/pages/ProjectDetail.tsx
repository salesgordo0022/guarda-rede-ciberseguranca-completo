import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Search, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type ActivityStatus = Database['public']['Enums']['activity_status'];

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
  name: string;
  description: string | null;
  status: ActivityStatus;
  deadline: string | null;
  deadline_status: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin, isGestor } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateActivityDialogOpen, setIsCreateActivityDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state for new activity
  const [activityName, setActivityName] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityDeadline, setActivityDeadline] = useState("");

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

  // Fetch project activities
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
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
    activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId || !profile?.id) {
      toast.error("Erro: Projeto não encontrado ou usuário não autenticado");
      return;
    }

    try {
      const { error } = await supabase
        .from("project_activities")
        .insert({
          project_id: projectId,
          name: activityName,
          description: activityDescription || null,
          deadline: activityDeadline || null,
          created_by: profile.id,
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

  const resetActivityForm = () => {
    setActivityName("");
    setActivityDescription("");
    setActivityDeadline("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluida": return "bg-green-100 text-green-800";
      case "em_andamento": return "bg-blue-100 text-blue-800";
      case "cancelada": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "concluida": return "Concluída";
      case "em_andamento": return "Em andamento";
      case "cancelada": return "Cancelada";
      case "pendente": return "Pendente";
      default: return status;
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
            <Dialog open={isCreateActivityDialogOpen} onOpenChange={setIsCreateActivityDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Atividade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Atividade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateActivity} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityName">Nome da Atividade *</Label>
                    <Input
                      id="activityName"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      placeholder="Ex: Revisar documentação"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="activityDescription">Descrição</Label>
                    <Textarea
                      id="activityDescription"
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      placeholder="Descreva a atividade..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activityDeadline">Prazo</Label>
                    <Input
                      id="activityDeadline"
                      type="date"
                      value={activityDeadline}
                      onChange={(e) => setActivityDeadline(e.target.value)}
                    />
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

      {/* Activities Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isActivitiesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando atividades...
                  </TableCell>
                </TableRow>
              ) : filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{activity.name}</span>
                        {activity.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {activity.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={activity.status}
                        onValueChange={(value) => handleUpdateActivityStatus(activity.id, value as ActivityStatus)}
                      >
                        <SelectTrigger className={`w-[140px] h-8 ${getStatusColor(activity.status)} border-0`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {activity.deadline 
                        ? format(new Date(activity.deadline), "dd/MM/yyyy", { locale: ptBR })
                        : "—"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {(isAdmin || isGestor) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteActivity(activity.id)}
                        >
                          Excluir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetail;
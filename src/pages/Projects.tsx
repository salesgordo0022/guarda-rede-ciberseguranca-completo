import { useState, useEffect } from "react";
import { Plus, Search, Grid, Kanban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  status: string;
  deadline: string | null;
  deadline_status: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const Projects = () => {
  const { profile, isAdmin, selectedCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  // Fetch projects
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ["projects", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!selectedCompanyId,
  });

  // Fetch all project activities
  const { data: allActivities = [] } = useQuery({
    queryKey: ["all-project-activities", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      // Get all project IDs for this company
      const { data: projectIdsData, error: projectIdsError } = await supabase
        .from("projects")
        .select("id")
        .eq("company_id", selectedCompanyId);

      if (projectIdsError) throw projectIdsError;
      
      if (!projectIdsData || projectIdsData.length === 0) return [];

      const projectIds = projectIdsData.map(p => p.id);

      const { data, error } = await supabase
        .from("project_activities")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProjectActivity[];
    },
    enabled: !!selectedCompanyId,
  });

  // Filter projects: exclude completed projects (status = 'concluido' or all activities done)
  const activeProjects = projects.filter(project => {
    // Exclude projects with status 'concluido'
    if ((project as any).status === 'concluido') return false;
    
    const projectActivities = allActivities.filter(a => a.project_id === project.id);
    // Keep project if it has no activities or has at least one non-completed activity
    if (projectActivities.length === 0) return true;
    const allCompleted = projectActivities.every(a => a.status === "concluida");
    return !allCompleted;
  });

  // Filter projects based on search query
  const filteredProjects = activeProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate project progress
  const calculateProjectProgress = (projectId: string) => {
    const projectActivities = allActivities.filter(a => a.project_id === projectId);
    const totalActivities = projectActivities.length;
    const completedActivities = projectActivities.filter(a => a.status === "concluida").length;
    
    const completionPercentage = totalActivities > 0 
      ? Math.round((completedActivities / totalActivities) * 100) 
      : 0;

    return {
      totalActivities,
      completedActivities,
      completionPercentage
    };
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Categorize activities for Kanban view by activity status
  const categorizeActivities = () => {
    const categorized: Record<string, ProjectActivity[]> = {
      'Não Iniciado': [],
      'Pendente': [],
      'Em Andamento': [],
      'Concluída': [],
      'Cancelada': []
    };

    // Categorize all activities by status
    allActivities.forEach(activity => {
      switch (activity.status) {
        case 'nao_iniciado':
          categorized['Não Iniciado'].push(activity);
          break;
        case 'pendente':
          categorized['Pendente'].push(activity);
          break;
        case 'em_andamento':
          categorized['Em Andamento'].push(activity);
          break;
        case 'concluida':
          categorized['Concluída'].push(activity);
          break;
        case 'cancelada':
          categorized['Cancelada'].push(activity);
          break;
        default:
          categorized['Pendente'].push(activity);
      }
    });

    return categorized;
  };

  const categorizedActivities = categorizeActivities();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId || !profile?.id) {
      toast.error("Erro: Empresa não encontrada ou usuário não autenticado");
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: projectDescription,
          company_id: selectedCompanyId,
          created_by: profile.id,
        });

      if (error) throw error;

      toast.success("Projeto criado com sucesso!");
      setIsCreateDialogOpen(false);
      setProjectName("");
      setProjectDescription("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (error) {
      toast.error("Erro ao criar projeto: " + (error as Error).message);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">Erro ao carregar projetos: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie seus projetos transversais entre departamentos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2"
            >
              <Grid className="h-4 w-4" />
              Grade
            </Button>
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              onClick={() => setViewMode('kanban')}
              className="flex items-center gap-2"
            >
              <Kanban className="h-4 w-4" />
              Kanban
            </Button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar projetos..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Projeto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Nome do Projeto *</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Ex: Projeto de Expansão"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Descrição</Label>
                    <textarea
                      id="projectDescription"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Descreva o objetivo do projeto..."
                      className="w-full min-h-[100px] p-3 border rounded-md bg-background text-foreground"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Criar Projeto
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
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
      ) : viewMode === 'grid' ? (
        filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="space-y-3">
              <div className="text-2xl font-bold">Nenhum projeto encontrado</div>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Nenhum projeto corresponde à sua busca" 
                  : "Comece criando seu primeiro projeto"}
              </p>
              {isAdmin && !searchQuery && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Projeto
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const progress = calculateProjectProgress(project.id);
              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-lg transition-all hover-scale cursor-pointer"
                  onClick={() => {
                    window.location.href = `/projects/${project.id}`;
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span className="truncate">{project.name}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Criado em {new Date(project.created_at).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{progress.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getProgressColor(progress.completionPercentage)}`}
                            style={{ width: `${progress.completionPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{progress.completedActivities} de {progress.totalActivities} atividades</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        // Kanban view
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(categorizedActivities).map(([category, activities]) => {
              // Define colors based on category
              let bgColor = "bg-gray-50 border-gray-100";
              if (category === "Não Iniciado") bgColor = "bg-gray-50 border-gray-100";
              else if (category === "Pendente") bgColor = "bg-gray-100 border-gray-200";
              else if (category === "Em Andamento") bgColor = "bg-blue-50 border-blue-200";
              else if (category === "Concluída") bgColor = "bg-green-50 border-green-200";
              else if (category === "Cancelada") bgColor = "bg-red-50 border-red-200";
              
              return (
                <Card key={category} className={`flex flex-col h-full ${bgColor}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription>{activities.length} atividades</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto max-h-[600px] space-y-3">
                    {activities.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        Nenhuma atividade
                      </div>
                    ) : (
                      activities.map((activity) => {
                        const project = projects.find(p => p.id === activity.project_id);
                        return (
                          <Card 
                            key={activity.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow bg-white"
                            onClick={() => {
                              window.location.href = `/projects/${activity.project_id}`;
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div>
                                  <h3 className="font-medium text-sm truncate">{activity.name}</h3>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {project?.name || 'Projeto desconhecido'}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs px-2 py-1 bg-muted rounded">
                                    {activity.status}
                                  </span>
                                  {activity.deadline && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(activity.deadline).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
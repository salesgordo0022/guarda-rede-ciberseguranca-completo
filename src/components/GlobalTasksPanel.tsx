import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, Building2, FolderKanban, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useGlobalMetrics, UnifiedActivity } from "@/hooks/useGlobalMetrics";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Database } from "@/integrations/supabase/types";

interface GroupStats {
  name: string;
  id?: string;
  type: 'project' | 'department';
  overdue: number;
  in_progress: number;
  pending: number;
  completed: number;
}

const getBadgeColor = (type: string, count: number) => {
  if (count === 0) return "bg-muted text-muted-foreground cursor-default";

  switch (type) {
    case "overdue":
      return "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer transition-colors";
    case "in_progress":
      return "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer transition-colors";
    case "pending":
      return "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer transition-colors";
    case "completed":
      return "bg-green-600 text-white hover:bg-green-700 cursor-pointer transition-colors";
    default:
      return "bg-muted cursor-default";
  }
};

const getCategoryLabel = (type: string) => {
  switch (type) {
    case "overdue":
      return "Atrasadas";
    case "in_progress":
      return "Em Andamento";
    case "pending":
      return "Pendentes";
    case "completed":
      return "Concluídas";
    default:
      return type;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pendente":
      return "Pendente";
    case "em_andamento":
      return "Em Andamento";
    case "concluida":
      return "Concluída";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
};

export function GlobalTasksPanel() {
  const { activities } = useGlobalMetrics();
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState(true);
  const [expandedDepartments, setExpandedDepartments] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    category: string;
    type: 'project' | 'department';
    activities: UnifiedActivity[];
  } | null>(null);

  const handleActivityClick = (activity: UnifiedActivity) => {
    // Fechar o dialog primeiro
    setSelectedCategory(null);
    
    // Navegar para a página correspondente
    if (activity.type === 'department') {
      navigate(`/activities?department=${activity.source_id}&activityId=${activity.id}`);
    } else {
      navigate(`/projects/${activity.source_id}?activityId=${activity.id}`);
    }
  };

  // Agrupar por fonte (projeto ou departamento)
  const getGroupStats = (): { projects: GroupStats[]; departments: GroupStats[] } => {
    if (!activities.length) return { projects: [], departments: [] };

    const projectMap = new Map<string, GroupStats>();
    const deptMap = new Map<string, GroupStats>();

    activities.forEach((activity) => {
      const map = activity.type === 'project' ? projectMap : deptMap;
      const key = activity.source_name;

      if (!map.has(key)) {
        map.set(key, {
          name: key,
          id: activity.source_id,
          type: activity.type,
          overdue: 0,
          in_progress: 0,
          pending: 0,
          completed: 0,
        });
      }

      const stats = map.get(key)!;

      if (activity.status === "concluida") {
        stats.completed++;
      } else if (activity.deadline_status === "fora_do_prazo") {
        stats.overdue++;
      } else if (activity.status === "em_andamento") {
        stats.in_progress++;
      } else if (activity.status === "pendente") {
        stats.pending++;
      }
    });

    return {
      projects: Array.from(projectMap.values()),
      departments: Array.from(deptMap.values()),
    };
  };

  const { projects, departments } = getGroupStats();

  const handleCategoryClick = (
    name: string,
    category: string,
    type: 'project' | 'department',
    count: number
  ) => {
    if (count === 0) return;

    const filteredActivities = activities.filter((activity) => {
      if (activity.source_name !== name || activity.type !== type) return false;

      switch (category) {
        case "overdue":
          return activity.deadline_status === "fora_do_prazo" && activity.status !== "concluida";
        case "in_progress":
          return activity.status === "em_andamento" && activity.deadline_status !== "fora_do_prazo";
        case "pending":
          return activity.status === "pendente" && activity.deadline_status !== "fora_do_prazo";
        case "completed":
          return activity.status === "concluida";
        default:
          return false;
      }
    });

    setSelectedCategory({
      name,
      category: getCategoryLabel(category),
      type,
      activities: filteredActivities,
    });
  };

  const renderGroupRow = (stats: GroupStats) => (
    <div className="grid grid-cols-6 gap-4 py-2 items-center hover:bg-muted/50 rounded transition-colors">
      <div className="font-medium text-sm flex items-center gap-2">
        {stats.type === 'project' ? (
          <FolderKanban className="h-4 w-4 text-emerald-600" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-600" />
        )}
        {stats.name}
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("overdue", stats.overdue)} min-w-[40px] justify-center text-xs`}
          onClick={() => handleCategoryClick(stats.name, "overdue", stats.type, stats.overdue)}
        >
          {stats.overdue}
        </Badge>
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("in_progress", stats.in_progress)} min-w-[40px] justify-center text-xs`}
          onClick={() => handleCategoryClick(stats.name, "in_progress", stats.type, stats.in_progress)}
        >
          {stats.in_progress}
        </Badge>
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("pending", stats.pending)} min-w-[40px] justify-center text-xs`}
          onClick={() => handleCategoryClick(stats.name, "pending", stats.type, stats.pending)}
        >
          {stats.pending}
        </Badge>
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("completed", stats.completed)} min-w-[40px] justify-center text-xs`}
          onClick={() => handleCategoryClick(stats.name, "completed", stats.type, stats.completed)}
        >
          {stats.completed}
        </Badge>
      </div>
      <div></div>
    </div>
  );

  return (
    <>
      <Card className="p-4 md:p-6 overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 md:gap-4 mb-3 pb-2 border-b min-w-[500px]">
          <div className="col-span-1 font-semibold text-xs md:text-sm">Fonte</div>
          <div className="text-center font-semibold text-xs md:text-sm">Atrasadas</div>
          <div className="text-center font-semibold text-xs md:text-sm">Em Andamento</div>
          <div className="text-center font-semibold text-xs md:text-sm">Pendentes</div>
          <div className="text-center font-semibold text-xs md:text-sm">Concluídas</div>
          <div></div>
        </div>

        {/* Projetos */}
        {projects.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setExpandedProjects(!expandedProjects)}
              className="w-full mb-2 pb-2 border-b flex items-center justify-between hover:bg-muted/50 rounded px-2 transition-colors"
            >
              <span className="font-semibold text-sm flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-emerald-600" />
                Projetos ({projects.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedProjects ? 'rotate-180' : ''}`} />
            </button>

            {expandedProjects && (
              <div className="space-y-1 pl-2">
                {projects.map((project) => (
                  <div key={project.id}>
                    {renderGroupRow(project)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Departamentos */}
        {departments.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedDepartments(!expandedDepartments)}
              className="w-full mb-2 pb-2 border-b flex items-center justify-between hover:bg-muted/50 rounded px-2 transition-colors"
            >
              <span className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Departamentos ({departments.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedDepartments ? 'rotate-180' : ''}`} />
            </button>

            {expandedDepartments && (
              <div className="space-y-1 pl-2">
                {departments.map((dept) => (
                  <div key={dept.id}>
                    {renderGroupRow(dept)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {projects.length === 0 && departments.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma atividade encontrada
          </div>
        )}
      </Card>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategory?.type === 'project' ? (
                <FolderKanban className="h-5 w-5 text-emerald-600" />
              ) : (
                <Building2 className="h-5 w-5 text-blue-600" />
              )}
              {selectedCategory?.category} - {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.activities.length} atividade(s) encontrada(s) •{" "}
              {selectedCategory?.type === 'project' ? 'Projeto' : 'Departamento'}
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCategory?.activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                selectedCategory?.activities.map((activity) => (
                  <TableRow 
                    key={activity.id}
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <TableCell>
                      <Badge variant={activity.type === 'project' ? 'default' : 'secondary'} className="text-xs">
                        {activity.type === 'project' ? 'Projeto' : 'Departamento'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell>
                      {activity.deadline
                        ? new Date(activity.deadline).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getStatusLabel(activity.status)}</Badge>
                    </TableCell>
                    <TableCell>{activity.source_name}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver detalhes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}

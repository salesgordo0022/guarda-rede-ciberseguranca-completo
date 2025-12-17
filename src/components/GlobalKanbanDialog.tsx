import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Building2, FolderKanban } from "lucide-react";
import { useGlobalMetrics, UnifiedActivity } from "@/hooks/useGlobalMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type StatusColumn = 'nao_iniciado' | 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

const COLUMNS: { id: StatusColumn; label: string; color: string }[] = [
  { id: "nao_iniciado", label: "Não Iniciado", color: "bg-gray-50 border-gray-100" },
  { id: "pendente", label: "Pendente", color: "bg-gray-100 border-gray-200" },
  { id: "em_andamento", label: "Em Andamento", color: "bg-blue-50 border-blue-200" },
  { id: "concluida", label: "Concluída", color: "bg-green-50 border-green-200" },
  { id: "cancelada", label: "Cancelada", color: "bg-red-50 border-red-200" },
];

export function GlobalKanbanDialog() {
  const { activities, isLoading } = useGlobalMetrics();

  const getActivitiesByStatus = (status: StatusColumn): UnifiedActivity[] => {
    return activities.filter(a => a.status === status);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
          <LayoutGrid className="h-4 w-4 mr-2" />
          Quadro Kanban
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-blue-600" />
            Quadro Kanban - Visão Geral (Projetos + Departamentos)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-x-auto p-6 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : (
            <div className="flex gap-4 h-full min-w-[1000px]">
              {COLUMNS.map((column) => {
                const columnActivities = getActivitiesByStatus(column.id);
                const projectCount = columnActivities.filter(a => a.type === 'project').length;
                const deptCount = columnActivities.filter(a => a.type === 'department').length;

                return (
                  <div key={column.id} className={`flex-1 flex flex-col rounded-lg border ${column.color} h-full`}>
                    <div className="p-3 font-semibold text-sm uppercase tracking-wider bg-white/50 rounded-t-lg border-b">
                      <div className="flex justify-between items-center">
                        {column.label}
                        <Badge variant="secondary" className="ml-2">
                          {columnActivities.length}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-1 text-xs font-normal normal-case">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <FolderKanban className="h-3 w-3" /> {projectCount}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600">
                          <Building2 className="h-3 w-3" /> {deptCount}
                        </span>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-2">
                      <div className="space-y-2">
                        {columnActivities.map((activity) => (
                          <Card key={`${activity.type}-${activity.id}`} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                {activity.type === 'project' ? (
                                  <FolderKanban className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                )}
                                <span className="font-medium text-sm line-clamp-2">{activity.name}</span>
                              </div>

                              <Badge 
                                variant={activity.type === 'project' ? 'default' : 'secondary'} 
                                className="text-[10px] px-1 h-5"
                              >
                                {activity.source_name}
                              </Badge>

                              {activity.deadline && (
                                <div className={`text-xs flex items-center gap-1 ${
                                  activity.deadline_status === 'fora_do_prazo'
                                    ? 'text-red-600 font-medium'
                                    : 'text-muted-foreground'
                                }`}>
                                  📅 {new Date(activity.deadline).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        
                        {columnActivities.length === 0 && (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            Nenhuma atividade
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type ActivityStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

interface KanbanActivity {
    id: string;
    name: string;
    status: ActivityStatus;
    deadline: string | null;
    deadline_status: string | null;
    project?: {
        name: string;
        company_id: string;
    };
}

const COLUMNS: { id: ActivityStatus; label: string; color: string }[] = [
    { id: "pendente", label: "Pendente", color: "bg-gray-100 border-gray-200" },
    { id: "em_andamento", label: "Em Andamento", color: "bg-blue-50 border-blue-200" },
    { id: "concluida", label: "Concluída", color: "bg-green-50 border-green-200" },
    { id: "cancelada", label: "Cancelada", color: "bg-red-50 border-red-200" },
];

export function KanbanBoardDialog() {
    const { selectedCompanyId, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: activities, isLoading } = useQuery({
        queryKey: ['kanban-activities', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            const { data, error } = await supabase
                .from('project_activities')
                .select(`
                    id,
                    name,
                    status,
                    deadline,
                    deadline_status,
                    project:projects(name, company_id)
                `);

            if (error) throw error;
            
            // Filtrar por empresa
            return (data || []).filter(
                (activity: any) => activity.project?.company_id === selectedCompanyId
            ) as KanbanActivity[];
        },
        enabled: !!selectedCompanyId
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: ActivityStatus }) => {
            const updateData: any = { status };
            
            if (status === 'concluida') {
                updateData.completed_at = new Date().toISOString();
            } else {
                updateData.completed_at = null;
            }

            const { error } = await supabase
                .from('project_activities')
                .update(updateData)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kanban-activities'] });
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            toast({ title: "Status atualizado" });
        },
        onError: (error) => {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        }
    });

    const getActivitiesByStatus = (status: ActivityStatus) => {
        return activities?.filter(a => a.status === status) || [];
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
                        Quadro Kanban - {isAdmin ? "Visão Geral" : "Minhas Atividades"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-x-auto p-6 pt-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-muted-foreground">Carregando...</div>
                        </div>
                    ) : (
                        <div className="flex gap-4 h-full min-w-[1000px]">
                            {COLUMNS.map((column) => (
                                <div key={column.id} className={`flex-1 flex flex-col rounded-lg border ${column.color} h-full`}>
                                    <div className="p-3 font-semibold text-sm uppercase tracking-wider flex justify-between items-center bg-white/50 rounded-t-lg border-b">
                                        {column.label}
                                        <Badge variant="secondary" className="ml-2">
                                            {getActivitiesByStatus(column.id).length}
                                        </Badge>
                                    </div>

                                    <ScrollArea className="flex-1 p-2">
                                        <div className="space-y-2">
                                            {getActivitiesByStatus(column.id).map((activity) => (
                                                <Card key={activity.id} className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                                    <CardContent className="p-3 space-y-2">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <span className="font-medium text-sm line-clamp-2">{activity.name}</span>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    {COLUMNS.map((col) => (
                                                                        <DropdownMenuItem
                                                                            key={col.id}
                                                                            disabled={col.id === activity.status}
                                                                            onClick={() => updateStatusMutation.mutate({ id: activity.id, status: col.id })}
                                                                        >
                                                                            Mover para {col.label}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>

                                                        {activity.project && (
                                                            <Badge variant="outline" className="text-[10px] px-1 h-5">
                                                                {activity.project.name}
                                                            </Badge>
                                                        )}

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
                                            
                                            {getActivitiesByStatus(column.id).length === 0 && (
                                                <div className="text-center text-muted-foreground text-sm py-8">
                                                    Nenhuma atividade
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

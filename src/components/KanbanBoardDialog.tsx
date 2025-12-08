import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskStatus } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

interface KanbanTask {
    id: string;
    title: string;
    status: TaskStatus;
    priority: string;
    responsible: string | null;
    deadline: string | null;
    department_id: string;
    department?: {
        name: string;
    };
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: "Não iniciado", label: "Não Iniciado", color: "bg-gray-100 border-gray-200" },
    { id: "Em andamento", label: "Em Andamento", color: "bg-blue-50 border-blue-200" },
    { id: "Parado", label: "Parado", color: "bg-red-50 border-red-200" },
    { id: "Feito", label: "Feito", color: "bg-green-50 border-green-200" },
];

export function KanbanBoardDialog() {
    const { selectedCompanyId, isAdmin, profile } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['kanban-tasks', selectedCompanyId, isAdmin, profile?.department_id],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            let query = supabase
                .from('tasks')
                .select(`
          id,
          title,
          status,
          priority,
          responsible,
          deadline,
          department_id,
          department:departments(name)
        `)
                .eq('company_id', selectedCompanyId);

            // Filter logic
            if (!isAdmin && profile?.department_id) {
                query = query.eq('department_id', profile.department_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as KanbanTask[];
        },
        enabled: !!selectedCompanyId
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
            const { error } = await supabase
                .from('tasks')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Update other lists too
            queryClient.invalidateQueries({ queryKey: ['tasks-panel'] });
            toast({ title: "Status atualizado" });
        },
        onError: (error) => {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        }
    });

    const getTasksByStatus = (status: TaskStatus) => {
        return tasks?.filter(t => t.status === status) || [];
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
                        Quadro Kanban - {isAdmin ? "Visão Geral (Todos os Departamentos)" : "Meu Departamento"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-x-auto p-6 pt-2">
                    <div className="flex gap-4 h-full min-w-[1000px]">
                        {COLUMNS.map((column) => (
                            <div key={column.id} className={`flex-1 flex flex-col rounded-lg border ${column.color} h-full`}>
                                <div className="p-3 font-semibold text-sm uppercase tracking-wider flex justify-between items-center bg-white/50 rounded-t-lg border-b">
                                    {column.label}
                                    <Badge variant="secondary" className="ml-2">
                                        {getTasksByStatus(column.id).length}
                                    </Badge>
                                </div>

                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-2">
                                        {getTasksByStatus(column.id).map((task) => (
                                            <Card key={task.id} className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                                <CardContent className="p-3 space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="font-medium text-sm line-clamp-2">{task.title}</span>
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
                                                                        disabled={col.id === task.status}
                                                                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: col.id })}
                                                                    >
                                                                        Mover para {col.label}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                                                        {isAdmin && task.department && (
                                                            <Badge variant="outline" className="text-[10px] px-1 h-5">
                                                                {task.department.name}
                                                            </Badge>
                                                        )}
                                                        {task.responsible && (
                                                            <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                                {task.responsible}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {task.deadline && (
                                                        <div className={`text-xs flex items-center gap-1 ${new Date(task.deadline) < new Date() && task.status !== 'Feito'
                                                                ? 'text-red-600 font-medium'
                                                                : 'text-muted-foreground'
                                                            }`}>
                                                            📅 {new Date(task.deadline).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

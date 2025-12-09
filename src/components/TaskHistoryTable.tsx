import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const TaskHistoryTable = () => {
    const { selectedCompanyId } = useAuth();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['completed-activities', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            const { data, error } = await supabase
                .from('project_activities')
                .select(`
                    *,
                    project:projects(id, name, company_id)
                `)
                .eq('status', 'concluida')
                .order('completed_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            
            return (data || []).filter((activity: any) => 
                activity.project?.company_id === selectedCompanyId
            );
        },
        enabled: !!selectedCompanyId
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "concluida": return "bg-green-100 text-green-800 border-green-200";
            case "cancelada": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "concluida": return "Concluída";
            case "cancelada": return "Cancelada";
            case "em_andamento": return "Em andamento";
            case "pendente": return "Pendente";
            default: return status;
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Carregando histórico...</div>;
    }

    if (!tasks || tasks.length === 0) {
        return (
            <Card className="p-12">
                <div className="text-center space-y-3">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Nenhum histórico encontrado</h3>
                    <p className="text-muted-foreground">
                        Atividades concluídas aparecerão aqui.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[300px]">Atividade</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Concluído em</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map((task: any) => (
                            <TableRow key={task.id}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-foreground">{task.name}</span>
                                        {task.description && (
                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                {task.description}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                        {task.project?.name || "—"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`${getStatusColor(task.status)} border-0`}>
                                        {getStatusLabel(task.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-muted-foreground">
                                        {task.completed_at ? format(new Date(task.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
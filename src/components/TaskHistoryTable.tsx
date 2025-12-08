import { useTasks } from "@/hooks/useTasks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Clock } from "lucide-react";

export const TaskHistoryTable = () => {
    const { tasks, isLoading } = useTasks({
        status: ['Feito', 'Parado']
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Feito": return "bg-green-100 text-green-800 border-green-200";
            case "Parado": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const formatSchedule = (start: string | null, end: string | null) => {
        if (!start || !end) return "—";
        try {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const startFormatted = format(startDate, "dd/MM", { locale: ptBR });
            const endFormatted = format(endDate, "dd/MM", { locale: ptBR });
            return `${startFormatted} – ${endFormatted}`;
        } catch {
            return "—";
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
                        Tarefas concluídas ou paradas aparecerão aqui.
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
                            <TableHead>Departamento</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Concluído em</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map((task) => (
                            <TableRow key={task.id}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-foreground">{task.title}</span>
                                        {task.description && (
                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                {task.description}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                        {task.department?.name || "Geral"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {task.responsible ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {task.responsible.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm">{task.responsible}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`${getStatusColor(task.status)} border-0`}>
                                        {task.status}
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

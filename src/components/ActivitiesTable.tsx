import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Task, TaskPriority, TaskStatus, TaskWithRelations } from "@/types/task";
import { formatSchedule, getPriorityBadge, getStatusColor } from "@/utils/taskUtils";

interface ActivitiesTableProps {
    tasks: TaskWithRelations[] | undefined;
    isLoading: boolean;
    isAdmin: boolean;
    isGestor?: boolean;
    profiles: { id: string; full_name: string | null }[];
    onUpdateTask: (data: Partial<Task> & { id: string }) => void;
    onDeleteTask: (id: string) => void;
    onCompleteTask: (id: string) => void;
    onEditTask: (task: Task) => void;
}

export const ActivitiesTable = ({
    tasks,
    isLoading,
    isAdmin,
    isGestor = false,
    profiles,
    onUpdateTask,
    onDeleteTask,
    onCompleteTask,
    onEditTask
}: ActivitiesTableProps) => {
    const canEditDetails = isAdmin || isGestor;
    const canEditDates = isAdmin;

    return (
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[300px]">Atividade</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead>Departamento</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cronograma</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    Carregando atividades...
                                </TableCell>
                            </TableRow>
                        ) : tasks?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertCircle className="h-8 w-8 opacity-50" />
                                        <p>Nenhuma atividade encontrada.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks?.map((task) => (
                                <TableRow key={task.id} className="group hover:bg-muted/50 transition-colors">
                                    <TableCell className="min-w-[200px]">
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
                                        {canEditDetails ? (
                                            <Select
                                                defaultValue={task.priority}
                                                onValueChange={(value) => onUpdateTask({ id: task.id, priority: value as TaskPriority })}
                                            >
                                                <SelectTrigger className="w-[130px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="urgente" className="text-red-600 font-medium">🔴 Obrigação</SelectItem>
                                                    <SelectItem value="alta" className="text-orange-500 font-medium">🟠 Ação</SelectItem>
                                                    <SelectItem value="média" className="text-yellow-600 font-medium">🟡 Rotina</SelectItem>
                                                    <SelectItem value="baixa" className="text-green-600 font-medium">🟢 Baixa</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            getPriorityBadge(task.priority || "média")
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal">
                                            {task.department?.name || "Geral"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {canEditDetails ? (
                                            <Select
                                                defaultValue={task.responsible || ""}
                                                onValueChange={(value) => onUpdateTask({ id: task.id, responsible: value })}
                                            >
                                                <SelectTrigger className="h-8 w-[150px]">
                                                    <SelectValue placeholder="Responsável..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {profiles.map((profile) => (
                                                        <SelectItem key={profile.id} value={profile.full_name || ""}>
                                                            {profile.full_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            task.responsible ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                        {task.responsible.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm">{task.responsible}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={task.status}
                                            onValueChange={(value) => onUpdateTask({ id: task.id, status: value as TaskStatus })}
                                        >
                                            <SelectTrigger className={`w-[140px] h-8 ${getStatusColor(task.status)} border-0`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                                                <SelectItem value="Em andamento">Em andamento</SelectItem>
                                                <SelectItem value="Parado">Parado</SelectItem>
                                                <SelectItem value="Feito">Feito</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        {canEditDates ? (
                                            <div className="flex flex-col gap-1">
                                                <Input
                                                    type="date"
                                                    className="h-7 text-xs w-[130px]"
                                                    defaultValue={task.schedule_start || ""}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== task.schedule_start) {
                                                            onUpdateTask({ id: task.id, schedule_start: e.target.value });
                                                        }
                                                    }}
                                                />
                                                <Input
                                                    type="date"
                                                    className="h-7 text-xs w-[130px]"
                                                    defaultValue={task.schedule_end || ""}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== task.schedule_end) {
                                                            onUpdateTask({ id: task.id, schedule_end: e.target.value, deadline: e.target.value });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {formatSchedule(task.schedule_start, task.schedule_end)}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {task.status !== "Feito" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => onCompleteTask(task.id)}
                                                    title="Concluir atividade"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canEditDetails && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditTask(task)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

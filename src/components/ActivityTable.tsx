import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type ActivityStatus = Database['public']['Enums']['activity_status'];
type DeadlineStatus = Database['public']['Enums']['deadline_status'];

interface Assignee {
  user_id: string;
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}

interface Activity {
  id: string;
  name: string;
  description?: string | null;
  status: ActivityStatus;
  deadline?: string | null;
  scheduled_date?: string | null;
  deadline_status?: DeadlineStatus | null;
  updated_at: string;
  priority?: string | null;
  assignees?: Assignee[];
  department?: {
    name: string;
  } | null;
}

interface ActivityTableProps {
  activities: Activity[];
  isLoading: boolean;
  onStatusChange: (id: string, status: ActivityStatus) => void;
  onEdit?: (activity: Activity) => void;
  onDelete?: (id: string) => void;
  onComplete?: (id: string) => void;
  onView?: (activity: Activity) => void;
  showActions?: boolean;
  emptyMessage?: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "concluida": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "em_andamento": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "cancelada": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "concluida": return "Finalizado";
    case "em_andamento": return "Em andamento";
    case "cancelada": return "Cancelado";
    case "pendente": return "Não iniciado";
    default: return status;
  }
};

const getPriorityBadge = (priority: string | null | undefined) => {
  switch (priority) {
    case 'urgente':
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Urgente</Badge>;
    case 'nao_urgente':
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Não Urgente</Badge>;
    case 'media':
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">Média</Badge>;
    default:
      return <span className="text-muted-foreground">—</span>;
  }
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch (e) {
    return "—";
  }
};

const getAssigneeName = (assignees: Assignee[] | undefined) => {
  if (!assignees || assignees.length === 0) return "—";
  const firstAssignee = assignees[0];
  return firstAssignee.profiles?.full_name || "—";
};

export const ActivityTable = ({
  activities,
  isLoading,
  onStatusChange,
  onEdit,
  onDelete,
  onComplete,
  onView,
  showActions = true,
  emptyMessage = "Nenhuma atividade encontrada.",
  currentUserId,
  isAdmin = false
}: ActivityTableProps) => {

  const canCompleteActivity = (activity: Activity) => {
    if (isAdmin) return true;
    if (!currentUserId || !activity.assignees) return false;
    return activity.assignees.some(a => a.user_id === currentUserId);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs uppercase">
            <TableHead className="w-[280px]">Atividades</TableHead>
            <TableHead className="w-[180px]">Responsável</TableHead>
            <TableHead className="w-[100px]">Prioridade</TableHead>
            <TableHead className="w-[130px]">Status</TableHead>
            <TableHead className="w-[100px]">Departamento</TableHead>
            <TableHead className="w-[100px]">Prazo</TableHead>
            {showActions && <TableHead className="text-right w-[80px]">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8">
                Carregando atividades...
              </TableCell>
            </TableRow>
          ) : activities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-12">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 opacity-50" />
                  <p>{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            activities.map((activity) => (
              <TableRow
                key={activity.id}
                className={`group transition-colors text-sm ${onView ? "cursor-pointer hover:bg-muted/50" : ""}`}
                onClick={(e) => {
                  if (onView) {
                    // Prevent triggering when clicking on buttons
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    onView(activity);
                  }
                }}
              >
                <TableCell className="font-medium whitespace-nowrap min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">➔</span>
                    {activity.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {activity.assignees && activity.assignees.length > 0 && (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {activity.assignees[0].profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="truncate max-w-[150px]">{getAssigneeName(activity.assignees)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getPriorityBadge((activity as any).priority)}
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={activity.status}
                    onValueChange={(value) => onStatusChange(activity.id, value as ActivityStatus)}
                  >
                    <SelectTrigger className={`w-[120px] h-7 text-xs ${getStatusColor(activity.status)} border-0`}>
                      <SelectValue>{getStatusLabel(activity.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Não iniciado</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="concluida">Finalizado</SelectItem>
                      <SelectItem value="cancelada">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {activity.department?.name ? (
                    <Badge variant="secondary" className="font-normal text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {activity.department.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {activity.deadline && !isNaN(new Date(activity.deadline).getTime()) ? (
                    (new Date(activity.deadline) >= new Date() || activity.status === 'concluida') ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ok</span>
                      </div>
                    ) : (
                      <span className="text-red-500 font-bold text-xs">! Atrasado</span>
                    )
                  ) : "—"}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activity.status !== "concluida" && onComplete && canCompleteActivity(activity) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => onComplete(activity.id)}
                          title="Concluir atividade"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(activity)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(activity.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ActivityTable;

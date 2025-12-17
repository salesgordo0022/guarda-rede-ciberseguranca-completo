import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPriorityBadge, getStatusColor } from "@/utils/taskUtils";

interface ProjectActivity {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  responsible: string | null;
  department_ids: string[] | null;
  status: string;
  priority: string;
  deadline: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  schedule_status: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface ProjectActivitiesTableProps {
  activities: ProjectActivity[];
  isLoading: boolean;
  departments: Department[];
  profiles: Profile[];
  onUpdateActivity: (data: Partial<ProjectActivity> & { id: string }) => void;
  onDeleteActivity: (id: string) => void;
  onEditActivity: (activity: ProjectActivity) => void;
}

export const ProjectActivitiesTable = ({
  activities,
  isLoading,
  departments,
  profiles,
  onUpdateActivity,
  onDeleteActivity,
  onEditActivity
}: ProjectActivitiesTableProps) => {
  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[300px]">Atividade</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Departamentos</TableHead>
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
            ) : activities?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 opacity-50" />
                    <p>Nenhuma atividade encontrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              activities?.map((activity) => (
                <TableRow key={activity.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="min-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">{activity.title}</span>
                      {activity.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {activity.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={activity.priority}
                      onValueChange={(value) => onUpdateActivity({ id: activity.id, priority: value })}
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgente" className="text-red-600 font-medium">🔴 Urgente</SelectItem>
                        <SelectItem value="alta" className="text-orange-500 font-medium">🟠 Alta</SelectItem>
                        <SelectItem value="média" className="text-yellow-600 font-medium">🟡 Média</SelectItem>
                        <SelectItem value="baixa" className="text-green-600 font-medium">🟢 Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {activity.department_ids && activity.department_ids.length > 0 ? (
                        activity.department_ids.map((deptId) => {
                          const dept = departments.find(d => d.id === deptId);
                          return dept ? (
                            <Badge key={deptId} variant="outline" className="font-normal text-xs">
                              {dept.name}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={activity.responsible || ""}
                      onValueChange={(value) => onUpdateActivity({ id: activity.id, responsible: value || null })}
                    >
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue placeholder="Responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={activity.status}
                      onValueChange={(value) => onUpdateActivity({ id: activity.id, status: value })}
                    >
                      <SelectTrigger className={`w-[140px] h-8 ${getStatusColor(activity.status as "Não iniciado" | "Em andamento" | "Parado" | "Feito")} border-0`}>
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
                    <div className="flex flex-col gap-1">
                      <Input
                        type="date"
                        className="h-7 text-xs w-[130px]"
                        defaultValue={activity.schedule_start || ""}
                        onBlur={(e) => {
                          if (e.target.value !== activity.schedule_start) {
                            onUpdateActivity({ 
                              id: activity.id, 
                              schedule_start: e.target.value || null,
                              deadline: e.target.value || null
                            });
                          }
                        }}
                      />
                      <Input
                        type="date"
                        className="h-7 text-xs w-[130px]"
                        defaultValue={activity.schedule_end || ""}
                        onBlur={(e) => {
                          if (e.target.value !== activity.schedule_end) {
                            onUpdateActivity({ 
                              id: activity.id, 
                              schedule_end: e.target.value || null 
                            });
                          }
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditActivity(activity)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive" 
                        onClick={() => onDeleteActivity(activity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
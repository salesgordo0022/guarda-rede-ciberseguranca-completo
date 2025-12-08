import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface DepartmentTask {
  department: string;
  department_id?: string;
  obligations: number;
  action: number;
  attention: number;
  pending: number;
  completed: number;
}

interface Activity {
  id: string;
  title: string;
  responsible: string | null;
  deadline: string | null;
  status: string;
  priority: string | null;
  department_id: string | null;
  department?: {
    id: string;
    name: string;
  };
}

const getBadgeColor = (type: string, count: number) => {
  if (count === 0) return "bg-muted text-muted-foreground cursor-default";

  switch (type) {
    case "obligations":
      return "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer transition-colors";
    case "action":
      return "bg-orange-600 text-white hover:bg-orange-700 cursor-pointer transition-colors";
    case "attention":
      return "bg-gray-500 text-white hover:bg-gray-600 cursor-pointer transition-colors";
    case "pending":
      return "bg-green-500 text-white hover:bg-green-600 cursor-pointer transition-colors";
    case "completed":
      return "bg-purple-600 text-white hover:bg-purple-700 cursor-pointer transition-colors";
    default:
      return "bg-muted cursor-default";
  }
};

const getCategoryLabel = (type: string) => {
  switch (type) {
    case "obligations":
      return "Obrigações";
    case "action":
      return "Ação";
    case "attention":
      return "Atenção";
    case "pending":
      return "Pendentes";
    case "completed":
      return "Concluídas";
    default:
      return type;
  }
};

export function DepartmentTasksPanel({ date }: { date?: Date }) {
  const { profile, selectedCompanyId } = useAuth();
  const [solicitacoesOpen, setSolicitacoesOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<{
    department: string;
    category: string;
    tasks: Activity[];
  } | null>(null);

  // Buscar atividades do banco de dados (tabela tasks)
  const { data: activities } = useQuery({
    queryKey: ["tasks-panel", selectedCompanyId, date],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      let query = supabase
        .from("tasks")
        .select(`
          id,
          title,
          responsible,
          deadline,
          status,
          priority,
          department_id,
          department:departments(id, name)
        `)
        .eq('company_id', selectedCompanyId)
        .order("deadline");

      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        query = query.eq('deadline', dateStr);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!selectedCompanyId
  });

  // Agrupar atividades por departamento e categoria
  const getDepartmentStats = (): DepartmentTask[] => {
    if (!activities) return [];

    const departmentMap = new Map<string, DepartmentTask>();

    activities.forEach((activity) => {
      const deptName = activity.department?.name || "Sem Departamento";
      const deptId = activity.department?.id;

      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          department: deptName,
          department_id: deptId,
          obligations: 0,
          action: 0,
          attention: 0,
          pending: 0,
          completed: 0,
        });
      }

      const dept = departmentMap.get(deptName)!;

      // Categorizar atividades baseado em status e prioridade
      if (activity.status === "Feito") {
        dept.completed++;
      } else if (activity.priority === "urgente" || activity.priority === "alta") {
        if (activity.priority === "urgente") {
          dept.obligations++;
        } else {
          dept.action++;
        }
      } else if (activity.deadline) {
        const deadline = new Date(activity.deadline);
        const today = new Date();
        const isOverdue = deadline < today && activity.status !== "Feito";

        if (isOverdue) {
          dept.attention++;
        } else {
          dept.pending++;
        }
      } else {
        dept.pending++;
      }
    });

    return Array.from(departmentMap.values());
  };

  const departmentStats = getDepartmentStats();

  // Separar departamento principal dos outros
  const mainDepartment = departmentStats.find(
    (d) => d.department_id === profile?.department_id
  );
  const otherDepartments = departmentStats.filter(
    (d) => d.department_id !== profile?.department_id
  );

  // Usar departamento principal ou primeiro da lista
  const mainDept = mainDepartment || departmentStats[0];
  const subDepartments = mainDepartment ? otherDepartments : departmentStats.slice(1);

  const handleCategoryClick = (
    department: string,
    category: string,
    count: number
  ) => {
    if (count === 0) return;

    // Filtrar atividades da categoria
    const filteredTasks = activities?.filter((activity) => {
      const deptName = activity.department?.name || "Sem Departamento";
      if (deptName !== department) return false;

      switch (category) {
        case "obligations":
          return activity.priority === "urgente" && activity.status !== "Feito";
        case "action":
          return activity.priority === "alta" && activity.status !== "Feito";
        case "attention":
          if (!activity.deadline || activity.status === "Feito") return false;
          const deadline = new Date(activity.deadline);
          const today = new Date();
          return deadline < today;
        case "pending":
          return (
            activity.status !== "Feito" &&
            activity.priority !== "urgente" &&
            activity.priority !== "alta" &&
            (!activity.deadline || new Date(activity.deadline) >= new Date())
          );
        case "completed":
          return activity.status === "Feito";
        default:
          return false;
      }
    }) || [];

    setSelectedCategory({
      department,
      category: getCategoryLabel(category),
      tasks: filteredTasks,
    });
  };

  return (
    <>
      <Card className="p-6 animate-fade-in">
        {mainDept && (
          <div className="mb-6">
            <div className="grid grid-cols-6 gap-4 mb-3 pb-2 border-b">
              <div className="col-span-1"></div>
              <div className="text-center font-semibold text-sm">Obrigações</div>
              <div className="text-center font-semibold text-sm">Ação</div>
              <div className="text-center font-semibold text-sm">Atenção</div>
              <div className="text-center font-semibold text-sm">Pendentes</div>
              <div className="text-center font-semibold text-sm">Concluídas</div>
            </div>

            <div className="grid grid-cols-6 gap-4 py-2 items-center hover:bg-muted/50 rounded transition-colors">
              <div className="font-medium flex items-center gap-2">
                <span className="text-xs">☰</span>
                {mainDept.department}
              </div>
              <div className="flex justify-center">
                <Badge
                  className={`${getBadgeColor("obligations", mainDept.obligations)} min-w-[40px] justify-center`}
                  onClick={() => handleCategoryClick(mainDept.department, "obligations", mainDept.obligations)}
                >
                  {mainDept.obligations}
                </Badge>
              </div>
              <div className="flex justify-center">
                <Badge
                  className={`${getBadgeColor("action", mainDept.action)} min-w-[40px] justify-center`}
                  onClick={() => handleCategoryClick(mainDept.department, "action", mainDept.action)}
                >
                  {mainDept.action}
                </Badge>
              </div>
              <div className="flex justify-center">
                <Badge
                  className={`${getBadgeColor("attention", mainDept.attention)} min-w-[40px] justify-center`}
                  onClick={() => handleCategoryClick(mainDept.department, "attention", mainDept.attention)}
                >
                  {mainDept.attention}
                </Badge>
              </div>
              <div className="flex justify-center">
                <Badge
                  className={`${getBadgeColor("pending", mainDept.pending)} min-w-[40px] justify-center`}
                  onClick={() => handleCategoryClick(mainDept.department, "pending", mainDept.pending)}
                >
                  {mainDept.pending}
                </Badge>
              </div>
              <div className="flex justify-center">
                <Badge
                  className={`${getBadgeColor("completed", mainDept.completed)} min-w-[40px] justify-center`}
                  onClick={() => handleCategoryClick(mainDept.department, "completed", mainDept.completed)}
                >
                  {mainDept.completed}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {subDepartments.length > 0 && (
          <div>
            <button
              onClick={() => setSolicitacoesOpen(!solicitacoesOpen)}
              className="w-full mb-3 pb-2 border-b flex items-center justify-between hover:bg-muted/50 rounded px-2 transition-colors"
            >
              <div className="grid grid-cols-6 gap-4 flex-1">
                <div className="col-span-1"></div>
                <div className="text-center font-semibold text-sm">Solicitações</div>
                <div className="text-center font-semibold text-sm">Ação</div>
                <div className="text-center font-semibold text-sm">Atenção</div>
                <div className="text-center font-semibold text-sm">Pendentes</div>
                <div className="text-center font-semibold text-sm">Concluídas</div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${solicitacoesOpen ? 'rotate-180' : ''}`} />
            </button>

            {solicitacoesOpen && (
              <div className="space-y-1 animate-accordion-down">
                {subDepartments.map((dept, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4 py-2 items-center hover:bg-muted/50 rounded transition-colors">
                    <div className="font-medium text-sm text-muted-foreground flex items-center gap-2 pl-4">
                      <span className="text-xs">☰</span>
                      {dept.department}
                    </div>
                    <div className="flex justify-center">
                      <Badge
                        className={`${getBadgeColor("obligations", dept.obligations)} min-w-[40px] justify-center text-xs`}
                        onClick={() => handleCategoryClick(dept.department, "obligations", dept.obligations)}
                      >
                        {dept.obligations}
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge
                        className={`${getBadgeColor("action", dept.action)} min-w-[40px] justify-center text-xs`}
                        onClick={() => handleCategoryClick(dept.department, "action", dept.action)}
                      >
                        {dept.action}
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge
                        className={`${getBadgeColor("attention", dept.attention)} min-w-[40px] justify-center text-xs`}
                        onClick={() => handleCategoryClick(dept.department, "attention", dept.attention)}
                      >
                        {dept.attention}
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge
                        className={`${getBadgeColor("pending", dept.pending)} min-w-[40px] justify-center text-xs`}
                        onClick={() => handleCategoryClick(dept.department, "pending", dept.pending)}
                      >
                        {dept.pending}
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge
                        className={`${getBadgeColor("completed", dept.completed)} min-w-[40px] justify-center text-xs`}
                        onClick={() => handleCategoryClick(dept.department, "completed", dept.completed)}
                      >
                        {dept.completed}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="mt-6 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
          <span>Legenda de Tarefas</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </Card>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory?.category} - {selectedCategory?.department}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.tasks.length} atividade(s) encontrada(s)
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Departamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCategory?.tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                selectedCategory?.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.responsible || "-"}</TableCell>
                    <TableCell>
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.status}</Badge>
                    </TableCell>
                    <TableCell>{task.department?.name || "-"}</TableCell>
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

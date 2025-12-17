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

interface DepartmentStats {
  department: string;
  department_id?: string;
  urgent: number;
  high: number;
  overdue: number;
  pending: number;
  completed: number;
}

interface Activity {
  id: string;
  name: string;
  deadline: string | null;
  status: string;
  deadline_status: string | null;
  department_id: string | null;
  department?: {
    id: string;
    name: string;
  };
}

const getBadgeColor = (type: string, count: number) => {
  if (count === 0) return "bg-muted text-muted-foreground cursor-default";

  switch (type) {
    case "urgent":
      return "bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors";
    case "high":
      return "bg-orange-600 text-white hover:bg-orange-700 cursor-pointer transition-colors";
    case "overdue":
      return "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer transition-colors";
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
    case "urgent":
      return "Urgente";
    case "high":
      return "Alta Prioridade";
    case "overdue":
      return "Atrasadas";
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
  const [expandedSection, setExpandedSection] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<{
    department: string;
    category: string;
    activities: Activity[];
  } | null>(null);

  // Buscar atividades de departamentos
  const { data: activities } = useQuery({
    queryKey: ["department-activities-panel", selectedCompanyId, date],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data, error } = await supabase
        .from("department_activities")
        .select(`
          id,
          name,
          deadline,
          status,
          deadline_status,
          department_id,
          department:departments(id, name, company_id)
        `)
        .order("deadline");

      if (error) throw error;
      
      // Filtrar por empresa
      return (data || []).filter(
        (activity: any) => activity.department?.company_id === selectedCompanyId
      ) as Activity[];
    },
    enabled: !!selectedCompanyId
  });

  // Agrupar atividades por departamento
  const getDepartmentStats = (): DepartmentStats[] => {
    if (!activities) return [];

    const departmentMap = new Map<string, DepartmentStats>();

    activities.forEach((activity) => {
      const deptName = activity.department?.name || "Sem Departamento";
      const deptId = activity.department?.id;

      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          department: deptName,
          department_id: deptId,
          urgent: 0,
          high: 0,
          overdue: 0,
          pending: 0,
          completed: 0,
        });
      }

      const dept = departmentMap.get(deptName)!;

      if (activity.status === "concluida") {
        dept.completed++;
      } else if (activity.deadline_status === "fora_do_prazo") {
        dept.overdue++;
      } else if (activity.status === "pendente") {
        dept.pending++;
      } else if (activity.status === "em_andamento") {
        dept.high++;
      }
    });

    return Array.from(departmentMap.values());
  };

  const departmentStats = getDepartmentStats();

  const mainDepartment = departmentStats.find(
    (d) => d.department_id === profile?.department_id
  );
  const otherDepartments = departmentStats.filter(
    (d) => d.department_id !== profile?.department_id
  );

  const mainDept = mainDepartment || departmentStats[0];
  const subDepartments = mainDepartment ? otherDepartments : departmentStats.slice(1);

  const handleCategoryClick = (
    department: string,
    category: string,
    count: number
  ) => {
    if (count === 0) return;

    const filteredActivities = activities?.filter((activity) => {
      const deptName = activity.department?.name || "Sem Departamento";
      if (deptName !== department) return false;

      switch (category) {
        case "urgent":
          return activity.status === "pendente" && activity.deadline_status === "fora_do_prazo";
        case "high":
          return activity.status === "em_andamento";
        case "overdue":
          return activity.deadline_status === "fora_do_prazo";
        case "pending":
          return activity.status === "pendente" && activity.deadline_status !== "fora_do_prazo";
        case "completed":
          return activity.status === "concluida";
        default:
          return false;
      }
    }) || [];

    setSelectedCategory({
      department,
      category: getCategoryLabel(category),
      activities: filteredActivities,
    });
  };

  const renderDepartmentRow = (dept: DepartmentStats, isMain: boolean = false) => (
    <div className={`grid grid-cols-6 gap-4 py-2 items-center hover:bg-muted/50 rounded transition-colors ${!isMain ? 'pl-4' : ''}`}>
      <div className={`font-medium ${!isMain ? 'text-sm text-muted-foreground' : ''} flex items-center gap-2`}>
        <span className="text-xs">☰</span>
        {dept.department}
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("overdue", dept.overdue)} min-w-[40px] justify-center ${!isMain ? 'text-xs' : ''}`}
          onClick={() => handleCategoryClick(dept.department, "overdue", dept.overdue)}
        >
          {dept.overdue}
        </Badge>
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("high", dept.high)} min-w-[40px] justify-center ${!isMain ? 'text-xs' : ''}`}
          onClick={() => handleCategoryClick(dept.department, "high", dept.high)}
        >
          {dept.high}
        </Badge>
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("pending", dept.pending)} min-w-[40px] justify-center ${!isMain ? 'text-xs' : ''}`}
          onClick={() => handleCategoryClick(dept.department, "pending", dept.pending)}
        >
          {dept.pending}
        </Badge>
      </div>
      <div className="flex justify-center">
        <Badge
          className={`${getBadgeColor("completed", dept.completed)} min-w-[40px] justify-center ${!isMain ? 'text-xs' : ''}`}
          onClick={() => handleCategoryClick(dept.department, "completed", dept.completed)}
        >
          {dept.completed}
        </Badge>
      </div>
      <div></div>
    </div>
  );

  return (
    <>
      <Card className="p-6 animate-fade-in">
        {mainDept && (
          <div className="mb-6">
            <div className="grid grid-cols-6 gap-4 mb-3 pb-2 border-b">
              <div className="col-span-1"></div>
              <div className="text-center font-semibold text-sm">Atrasadas</div>
              <div className="text-center font-semibold text-sm">Em Andamento</div>
              <div className="text-center font-semibold text-sm">Pendentes</div>
              <div className="text-center font-semibold text-sm">Concluídas</div>
              <div></div>
            </div>
            {renderDepartmentRow(mainDept, true)}
          </div>
        )}

        {subDepartments.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedSection(!expandedSection)}
              className="w-full mb-3 pb-2 border-b flex items-center justify-between hover:bg-muted/50 rounded px-2 transition-colors"
            >
              <span className="font-semibold text-sm">Outros Departamentos</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection && (
              <div className="space-y-1 animate-accordion-down">
                {subDepartments.map((dept, index) => (
                  <div key={index}>
                    {renderDepartmentRow(dept, false)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {departmentStats.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma atividade encontrada
          </div>
        )}
      </Card>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory?.category} - {selectedCategory?.department}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.activities.length} atividade(s) encontrada(s)
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Departamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCategory?.activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                selectedCategory?.activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell>
                      {activity.deadline
                        ? new Date(activity.deadline).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{activity.status}</Badge>
                    </TableCell>
                    <TableCell>{activity.department?.name || "-"}</TableCell>
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

import { useState } from "react";
import { CheckCircle2, TrendingUp, Clock, XCircle, Building2, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGlobalMetrics, UnifiedActivity } from "@/hooks/useGlobalMetrics";
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

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pendente":
      return "Pendente";
    case "em_andamento":
      return "Em Andamento";
    case "concluida":
      return "Concluída";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
};

type CategoryType = 'completed' | 'in_progress' | 'overdue' | 'pending';

export function GlobalMetricsCards() {
  const { activities, metrics } = useGlobalMetrics();
  const [selectedCategory, setSelectedCategory] = useState<{
    title: string;
    activities: UnifiedActivity[];
  } | null>(null);

  const handleCategoryClick = (category: CategoryType) => {
    let filtered: UnifiedActivity[] = [];
    let title = "";

    switch (category) {
      case "completed":
        filtered = activities.filter(a => a.status === "concluida");
        title = "Atividades Concluídas";
        break;
      case "in_progress":
        filtered = activities.filter(a => a.status === "em_andamento");
        title = "Atividades Em Andamento";
        break;
      case "overdue":
        filtered = activities.filter(a => a.deadline_status === "fora_do_prazo" && a.status !== "concluida");
        title = "Atividades Atrasadas";
        break;
      case "pending":
        filtered = activities.filter(a => a.status === "pendente" && a.deadline_status !== "fora_do_prazo");
        title = "Atividades Pendentes";
        break;
    }

    setSelectedCategory({ title, activities: filtered });
  };

  const projectCount = (list: UnifiedActivity[]) => list.filter(a => a.type === 'project').length;
  const deptCount = (list: UnifiedActivity[]) => list.filter(a => a.type === 'department').length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-green-200 bg-green-50/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCategoryClick('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{metrics?.completed || 0}</div>
            <p className="text-xs text-green-600 mt-1">
              {metrics?.total ? ((metrics.completed / metrics.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-blue-200 bg-blue-50/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCategoryClick('in_progress')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{metrics?.in_progress || 0}</div>
            <p className="text-xs text-blue-600 mt-1">Atividades sendo executadas</p>
          </CardContent>
        </Card>

        <Card 
          className="border-orange-200 bg-orange-50/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCategoryClick('overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{metrics?.overdue || 0}</div>
            <p className="text-xs text-orange-600 mt-1">Requerem atenção urgente</p>
          </CardContent>
        </Card>

        <Card 
          className="border-gray-200 bg-gray-50/50 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCategoryClick('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <XCircle className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{metrics?.pending || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Aguardando início</p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCategory?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              <span>{selectedCategory?.activities.length} atividade(s) encontrada(s)</span>
              {selectedCategory && (
                <>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <FolderKanban className="h-4 w-4" /> {projectCount(selectedCategory.activities)} projetos
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <Building2 className="h-4 w-4" /> {deptCount(selectedCategory.activities)} departamentos
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedCategory?.activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                selectedCategory?.activities.map((activity) => (
                  <TableRow key={`${activity.type}-${activity.id}`}>
                    <TableCell>
                      <Badge variant={activity.type === 'project' ? 'default' : 'secondary'} className="text-xs">
                        {activity.type === 'project' ? (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" /> Projeto
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> Depto
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell>
                      {activity.deadline
                        ? new Date(activity.deadline).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getStatusLabel(activity.status)}</Badge>
                    </TableCell>
                    <TableCell>{activity.source_name}</TableCell>
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

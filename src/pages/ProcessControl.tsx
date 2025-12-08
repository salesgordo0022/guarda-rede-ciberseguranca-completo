import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Filter
} from "lucide-react";

interface Process {
  id: string;
  title: string;
  status: "Em andamento" | "Pendente" | "Concluído" | "Atrasado";
  department: string;
  responsible: string;
  startDate: string;
  deadline: string;
  progress: number;
}

const mockProcesses: Process[] = [
  {
    id: "1",
    title: "Certificado Digital - Cliente ABC",
    status: "Em andamento",
    department: "CERTIFICADO DIGITAL",
    responsible: "Anna Chan",
    startDate: "15/01/2025",
    deadline: "20/01/2025",
    progress: 60,
  },
  {
    id: "2",
    title: "Procuração - Empresa XYZ",
    status: "Pendente",
    department: "COMERCIAL",
    responsible: "Matheus Sales",
    startDate: "18/01/2025",
    deadline: "25/01/2025",
    progress: 0,
  },
  {
    id: "3",
    title: "Validação de Documentos",
    status: "Concluído",
    department: "CONTABILIDADE",
    responsible: "Lucas Silva",
    startDate: "10/01/2025",
    deadline: "17/01/2025",
    progress: 100,
  },
  {
    id: "4",
    title: "Folha de Pagamento",
    status: "Atrasado",
    department: "DEPARTAMENTO PESSOAL",
    responsible: "Marina Costa",
    startDate: "05/01/2025",
    deadline: "15/01/2025",
    progress: 45,
  },
];

const getStatusColor = (status: Process["status"]) => {
  switch (status) {
    case "Concluído":
      return "bg-status-completed text-white";
    case "Em andamento":
      return "bg-status-in-progress text-white";
    case "Pendente":
      return "bg-status-not-started text-white";
    case "Atrasado":
      return "bg-destructive text-white";
    default:
      return "bg-muted";
  }
};

const getStatusIcon = (status: Process["status"]) => {
  switch (status) {
    case "Concluído":
      return <CheckCircle2 className="h-4 w-4" />;
    case "Em andamento":
      return <Clock className="h-4 w-4" />;
    case "Pendente":
      return <FileText className="h-4 w-4" />;
    case "Atrasado":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return null;
  }
};

const ProcessControl = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Controle de Processos</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe todos os processos em andamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Processos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProcesses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-in-progress">
              {mockProcesses.filter(p => p.status === "Em andamento").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-completed">
              {mockProcesses.filter(p => p.status === "Concluído").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {mockProcesses.filter(p => p.status === "Atrasado").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processes List */}
      <div className="grid gap-4">
        {mockProcesses.map((process) => (
          <Card key={process.id} className="hover:shadow-lg transition-all cursor-pointer animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{process.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {process.department}
                    </Badge>
                    <Badge className={getStatusColor(process.status)}>
                      <span className="mr-1">{getStatusIcon(process.status)}</span>
                      {process.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Responsável:</span>
                  <p className="font-medium">{process.responsible}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Início:</span>
                  <p className="font-medium">{process.startDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prazo:</span>
                  <p className="font-medium">{process.deadline}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Progresso</span>
                  <span className="text-sm font-medium">{process.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${process.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProcessControl;

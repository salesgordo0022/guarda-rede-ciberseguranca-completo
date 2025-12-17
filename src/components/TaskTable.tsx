import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface Task {
  id: string;
  activity: string;
  responsible: {
    name: string;
    avatar: string;
  };
  progress: number;
  status: "Não começou" | "Em progresso" | "Concluído";
  department: string;
  startDate: string;
  endDate: string;
  deadline: string;
}

const mockTasks: Task[] = [
  {
    id: "1",
    activity: "Pesquisar referências para a sala de podcast",
    responsible: {
      name: "Anna Chan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    },
    progress: 0,
    status: "Não começou",
    department: "TI",
    startDate: "",
    endDate: "",
    deadline: "",
  },
  {
    id: "2",
    activity: "Pesquisar referências para um cenário de vídeo no escritório do Sr. Luciano",
    responsible: {
      name: "Anna Chan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    },
    progress: 0,
    status: "Não começou",
    department: "TI",
    startDate: "",
    endDate: "",
    deadline: "",
  },
  {
    id: "3",
    activity: "APRENDER COM HELIA A FORMA DE ENTRAR EM CONTATO COM OS CLIENTES E EMITIR O CERTIFICADO POR VIDEO...",
    responsible: {
      name: "Anna Chan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    },
    progress: 0,
    status: "Não começou",
    department: "TI",
    startDate: "",
    endDate: "",
    deadline: "",
  },
  {
    id: "4",
    activity: "ALINHAR COM HELIA OS CERTIFICADOS QUE FORAM FEITOS",
    responsible: {
      name: "Anna Chan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    },
    progress: 0,
    status: "Não começou",
    department: "TI",
    startDate: "22/09/2025",
    endDate: "",
    deadline: "",
  },
  {
    id: "5",
    activity: "ALTERAÇÃO DO PRAZO DOS CERTIFICADOS",
    responsible: {
      name: "Anna Chan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    },
    progress: 0,
    status: "Não começou",
    department: "TI",
    startDate: "",
    endDate: "",
    deadline: "",
  },
];

const getStatusColor = (status: Task["status"]) => {
  switch (status) {
    case "Não começou":
      return "bg-status-not-started text-white";
    case "Em progresso":
      return "bg-status-in-progress text-white";
    case "Concluído":
      return "bg-status-completed text-white";
    default:
      return "bg-muted";
  }
};

export function TaskTable() {
  const [tasks] = useState<Task[]>(mockTasks);

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Atividades</h2>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-table-header hover:bg-table-header">
              <TableHead className="font-bold">Atividades</TableHead>
              <TableHead className="font-bold">Responsável</TableHead>
              <TableHead className="font-bold">Progresso</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Departamento</TableHead>
              <TableHead className="font-bold">Data Inicial</TableHead>
              <TableHead className="font-bold">Data Final</TableHead>
              <TableHead className="font-bold">Prazo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                className="bg-table-row hover:bg-table-row-hover transition-colors cursor-pointer"
              >
                <TableCell className="font-medium max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">📋</span>
                    {task.activity}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={task.responsible.avatar} />
                      <AvatarFallback>
                        {task.responsible.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.responsible.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{task.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(task.status)} variant="secondary">
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell>{task.department}</TableCell>
                <TableCell className="text-sm">{task.startDate || "-"}</TableCell>
                <TableCell className="text-sm">{task.endDate || "-"}</TableCell>
                <TableCell className="text-sm">{task.deadline || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <span>CONTAGEM {tasks.length}</span>
      </div>
    </div>
  );
}

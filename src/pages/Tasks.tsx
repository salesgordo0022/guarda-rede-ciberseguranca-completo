// Importações de bibliotecas e dependências
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Importações de componentes de UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Importações de utilitários
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface que define a estrutura de uma tarefa
interface Task {
  id: string;                                   // Identificador único da tarefa
  title: string;                                // Título/descrição da tarefa
  responsible: string | null;                   // Pessoa responsável pela tarefa (ou null)
  status: "Em andamento" | "Feito" | "Parado" | "Não iniciado"; // Status atual da tarefa
  deadline: string | null;                      // Data limite para conclusão (ou null)
  schedule_start: string | null;                // Data de início planejada (ou null)
  schedule_end: string | null;                  // Data de término planejada (ou null)
  schedule_status: "Dentro do prazo" | "Atrasado" | null; // Status em relação ao cronograma
  updated_at: string;                           // Data da última atualização
  created_at: string;                           // Data de criação da tarefa
}

// Objeto que mapeia status de tarefas para classes CSS de cores
const statusColors = {
  "Em andamento": "bg-blue-500 text-white",    // Azul para tarefas em andamento
  "Feito": "bg-green-500 text-white",         // Verde para tarefas concluídas
  "Parado": "bg-red-500 text-white",          // Vermelho para tarefas paradas
  "Não iniciado": "bg-gray-500 text-white",   // Cinza para tarefas não iniciadas
};

// Componente principal da página de gerenciamento de tarefas
const Tasks = () => {
  // Estados para gerenciar as tarefas e o formulário
  const [tasks, setTasks] = useState<Task[]>([]);           // Lista de tarefas
  const [open, setOpen] = useState(false);                  // Controle de abertura do diálogo
  const [editing, setEditing] = useState<Task | null>(null); // Tarefa sendo editada (ou null)

  // Estados para os campos do formulário
  const [title, setTitle] = useState("");                  // Título da tarefa
  const [responsible, setResponsible] = useState("");      // Responsável pela tarefa
  const [status, setStatus] = useState<Task["status"]>("Não iniciado"); // Status da tarefa
  const [deadline, setDeadline] = useState("");            // Prazo da tarefa
  const [scheduleStart, setScheduleStart] = useState("");  // Início do cronograma
  const [scheduleEnd, setScheduleEnd] = useState("");      // Fim do cronograma

  // Efeito para carregar as tarefas quando o componente é montado
  useEffect(() => {
    fetchTasks();
  }, []); // Array de dependências vazio significa que só executa uma vez

  // Função assíncrona para buscar tarefas do banco de dados
  const fetchTasks = async () => {
    // Consulta todas as tarefas ordenadas pela data de criação (mais recentes primeiro)
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    // Trata erros na consulta
    if (error) {
      toast.error("Erro ao carregar tarefas");
      return;
    }

    // Atualiza o estado com as tarefas obtidas (ou array vazio se null)
    setTasks(data || []);
  };

  // Função para calcular o status do cronograma com base nas datas
  const calculateScheduleStatus = (deadline: string | null, scheduleEnd: string | null): Task["schedule_status"] => {
    // Retorna null se alguma das datas não estiver definida
    if (!deadline || !scheduleEnd) return null;

    // Converte strings para objetos Date
    const deadlineDate = new Date(deadline);
    const scheduleEndDate = new Date(scheduleEnd);
    const today = new Date();

    // Verifica se hoje ultrapassou alguma das datas
    if (today > deadlineDate || today > scheduleEndDate) {
      return "Atrasado";
    }
    // Caso contrário, está dentro do prazo
    return "Dentro do prazo";
  };

  // Função para lidar com o envio do formulário (criar ou atualizar tarefa)
  const handleSubmit = async (e: React.FormEvent) => {
    // Previne o comportamento padrão do formulário
    e.preventDefault();

    // Calcula o status do cronograma
    const scheduleStatus = calculateScheduleStatus(deadline, scheduleEnd);

    // Prepara os dados da tarefa
    const taskData = {
      title,
      responsible: responsible || null,
      status,
      deadline: deadline || null,
      schedule_start: scheduleStart || null,
      schedule_end: scheduleEnd || null,
      schedule_status: scheduleStatus,
    };

    // Se estiver editando uma tarefa existente
    if (editing) {
      // Atualiza a tarefa no banco de dados
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", editing.id);

      // Trata erros na atualização
      if (error) {
        toast.error("Erro ao atualizar tarefa");
        return;
      }

      // Exibe mensagem de sucesso
      toast.success("Tarefa atualizada!");
    } else {
      // Cria uma nova tarefa no banco de dados
      const { error } = await supabase.from("tasks").insert(taskData);

      // Trata erros na criação
      if (error) {
        toast.error("Erro ao criar tarefa");
        return;
      }

      // Exibe mensagem de sucesso
      toast.success("Tarefa criada!");
    }

    // Fecha o diálogo e reseta o formulário
    setOpen(false);
    resetForm();
    // Atualiza a lista de tarefas
    fetchTasks();
  };

  // Função para preparar a edição de uma tarefa existente
  const handleEdit = (task: Task) => {
    setEditing(task);                           // Define a tarefa que será editada
    setTitle(task.title);                       // Preenche o campo título
    setResponsible(task.responsible || "");    // Preenche o campo responsável
    setStatus(task.status);                     // Preenche o campo status
    setDeadline(task.deadline || "");          // Preenche o campo prazo
    setScheduleStart(task.schedule_start || ""); // Preenche o campo início do cronograma
    setScheduleEnd(task.schedule_end || "");   // Preenche o campo fim do cronograma
    setOpen(true);                              // Abre o diálogo de edição
  };

  // Função assíncrona para excluir uma tarefa
  const handleDelete = async (id: string) => {
    // Confirma com o usuário antes de excluir
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    // Exclui a tarefa do banco de dados
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    // Trata erros na exclusão
    if (error) {
      toast.error("Erro ao excluir tarefa");
      return;
    }

    // Exibe mensagem de sucesso
    toast.success("Tarefa excluída!");
    // Atualiza a lista de tarefas
    fetchTasks();
  };

  // Função para resetar todos os campos do formulário
  const resetForm = () => {
    setTitle("");              // Limpa o campo título
    setResponsible("");        // Limpa o campo responsável
    setStatus("Não iniciado");  // Reseta o status para o valor padrão
    setDeadline("");           // Limpa o campo prazo
    setScheduleStart("");      // Limpa o campo início do cronograma
    setScheduleEnd("");        // Limpa o campo fim do cronograma
    setEditing(null);           // Limpa a tarefa que estava sendo editada
  };

  // Função para formatar o período do cronograma
  const formatSchedule = (start: string | null, end: string | null) => {
    // Retorna traço se alguma das datas não estiver definida
    if (!start || !end) return "—";

    try {
      // Converte strings para objetos Date
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Formata as datas usando date-fns com localização em português
      const startFormatted = format(startDate, "MMM d", { locale: ptBR });
      const endFormatted = format(endDate, "d", { locale: ptBR });

      // Retorna o período formatado
      return `${startFormatted}–${endFormatted}`;
    } catch {
      // Retorna traço em caso de erro
      return "—";
    }
  };

  // Função para formatar a data da última atualização
  const formatLastUpdate = (date: string) => {
    try {
      // Retorna a distância relativa até agora com sufixo ("há X minutos", etc.)
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,    // Adiciona sufixo como "há" ou "atrás"
        locale: ptBR        // Usa localização em português
      });
    } catch {
      // Retorna traço em caso de erro
      return "—";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas e acompanhe o progresso</p>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Tarefa" : "Nova Tarefa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tarefa *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da tarefa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible">Responsável</Label>
                <Input
                  id="responsible"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Nome da pessoa responsável"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Task["status"])} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Parado">Parado</SelectItem>
                    <SelectItem value="Feito">Feito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule_start">Início do Cronograma</Label>
                  <Input
                    id="schedule_start"
                    type="date"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule_end">Fim do Cronograma</Label>
                <Input
                  id="schedule_end"
                  type="date"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                {editing ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Cronograma</TableHead>
                <TableHead>Situação do Cronograma</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa cadastrada. Clique em "Nova Tarefa" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.responsible || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[task.status]}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.deadline ? format(new Date(task.deadline), "dd/MM", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell>
                      {formatSchedule(task.schedule_start, task.schedule_end)}
                    </TableCell>
                    <TableCell>
                      {task.schedule_status === "Dentro do prazo" && (
                        <span className="text-green-600">✔ Dentro do prazo</span>
                      )}
                      {task.schedule_status === "Atrasado" && (
                        <span className="text-red-600">❗ Atrasado</span>
                      )}
                      {!task.schedule_status && "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLastUpdate(task.updated_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks;

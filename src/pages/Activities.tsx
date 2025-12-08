import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useTasks } from "@/hooks/useTasks";
import { Task, TaskPriority, TaskStatus } from "@/types/task";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ActivitiesTable } from "@/components/ActivitiesTable";
import { useSearchParams, useNavigate } from "react-router-dom";

interface Department {
  id: string;
  name: string;
}

const Activities = () => {
  const { getCategoryColor } = useSystemSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const departmentFilterId = searchParams.get("department");
  const { isAdmin, isGestor, selectedCompanyId, profile } = useAuth();

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', selectedCompanyId)
        .order('name');

      return data as Department[] || [];
    },
    enabled: !!selectedCompanyId
  });

  // Redirect to first department if none selected
  useEffect(() => {
    if (departments.length > 0 && !departmentFilterId) {
      navigate(`/activities?department=${departments[0].id}`, { replace: true });
    }
  }, [departments, departmentFilterId, navigate]);

  const filters = useMemo(() => ({
    status: ['Não iniciado', 'Em andamento'] as TaskStatus[],
    department_id: departmentFilterId || undefined
  }), [departmentFilterId]);

  const { tasks, createTask, updateTask, deleteTask, completeTask, isLoading } = useTasks(filters);

  // Fetch profiles for the responsible select
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    }
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState<TaskStatus>("Não iniciado");
  const [priority, setPriority] = useState<TaskPriority>("média");
  const [deadline, setDeadline] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  // Update departmentId when filter changes or modal opens
  useEffect(() => {
    if (departmentFilterId && !editing) {
      setDepartmentId(departmentFilterId);
    }
  }, [departmentFilterId, open, editing]);

  const calculateScheduleStatus = (deadline: string | null, scheduleEnd: string | null) => {
    if (!deadline || !scheduleEnd) return null;
    const deadlineDate = new Date(deadline);
    const scheduleEndDate = new Date(scheduleEnd);
    const today = new Date();
    if (today > deadlineDate || today > scheduleEndDate) {
      return "Atrasado";
    }
    return "Dentro do prazo";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const scheduleStatus = calculateScheduleStatus(deadline, scheduleEnd);

    const taskData: any = {
      title,
      description,
      department_id: departmentId,
      responsible: responsible || null,
      status,
      priority,
      deadline: deadline || null,
      schedule_start: scheduleStart || null,
      schedule_end: scheduleEnd || null,
      schedule_status: scheduleStatus,
      has_fine: false // Default
    };

    if (editing) {
      updateTask({ id: editing.id, ...taskData });
    } else {
      createTask(taskData);
    }

    setOpen(false);
    resetForm();
  };

  const handleEdit = (task: Task) => {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setDepartmentId(task.department_id || "");
    setResponsible(task.responsible || "");
    setStatus(task.status);
    setPriority(task.priority);
    setDeadline(task.deadline || "");
    setScheduleStart(task.schedule_start || "");
    setScheduleEnd(task.schedule_end || "");
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;
    deleteTask(id);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDepartmentId(departmentFilterId || "");
    setResponsible("");
    setStatus("Não iniciado");
    setPriority("média");
    setDeadline("");
    setScheduleStart("");
    setScheduleEnd("");
    setEditing(null);
  };

  const currentDepartmentName = departments.find(d => d.id === departmentFilterId)?.name;

  if (!departmentFilterId && departments.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground animate-fade-in">
        <p>Nenhum departamento encontrado. Crie um novo em Configurações.</p>
      </div>
    );
  }

  if (!departmentFilterId) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {currentDepartmentName || "Departamento"}
          </h1>
          <p className="text-muted-foreground">
            Gerencie as atividades deste departamento
          </p>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editing ? "Editar Atividade" : "Criar Nova Atividade"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">Título da Atividade *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Fechamento Mensal"
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes sobre a atividade..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento *</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length > 0 ? (
                        departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum departamento encontrado.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsável</Label>
                  <Select value={responsible} onValueChange={setResponsible}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.full_name || ""}>
                          {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Tipo / Prioridade *</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgente">🔴 Obrigação (Urgente)</SelectItem>
                      <SelectItem value="alta">🟠 Ação (Alta)</SelectItem>
                      <SelectItem value="média">🟡 Rotina (Média)</SelectItem>
                      <SelectItem value="baixa">🟢 Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                      <SelectItem value="Em andamento">Em andamento</SelectItem>
                      <SelectItem value="Parado">Parado</SelectItem>
                      <SelectItem value="Feito">Feito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule_start">Início</Label>
                  <Input
                    id="schedule_start"
                    type="date"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule_end">Fim (Prazo)</Label>
                  <Input
                    id="schedule_end"
                    type="date"
                    value={scheduleEnd}
                    onChange={(e) => {
                      setScheduleEnd(e.target.value);
                      setDeadline(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editing ? "Salvar Alterações" : "Criar Atividade"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ActivitiesTable
        tasks={tasks}
        isLoading={isLoading}
        isAdmin={isAdmin}
        isGestor={isGestor}
        profiles={profiles}
        onUpdateTask={updateTask}
        onDeleteTask={handleDelete}
        onCompleteTask={completeTask}
        onEditTask={handleEdit}
      />
    </div>
  );
};

export default Activities;

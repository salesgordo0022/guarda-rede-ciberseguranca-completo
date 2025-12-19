import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

type ActivityStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";

type Activity = Tables<'project_activities'>;

const statusColors: Record<ActivityStatus, string> = {
  "em_andamento": "bg-blue-500 text-white",
  "concluida": "bg-green-500 text-white",
  "cancelada": "bg-red-500 text-white",
  "pendente": "bg-gray-500 text-white",
};

const statusLabels: Record<ActivityStatus, string> = {
  "pendente": "Pendente",
  "em_andamento": "Em Andamento",
  "concluida": "Concluída",
  "cancelada": "Cancelada",
};

const Tasks = () => {
  const { selectedCompanyId, user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ActivityStatus>("pendente");
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (selectedCompanyId) {
      fetchActivities();
      fetchProjects();
    }
  }, [selectedCompanyId]);

  const fetchProjects = async () => {
    if (!selectedCompanyId) return;
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", selectedCompanyId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar projetos");
      return;
    }
    setProjects(data || []);
  };

  const fetchActivities = async () => {
    if (!selectedCompanyId) return;

    const { data: projectIds } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", selectedCompanyId);

    if (!projectIds || projectIds.length === 0) {
      setActivities([]);
      return;
    }

    const { data, error } = await supabase
      .from("project_activities")
      .select("*")
      .in("project_id", projectIds.map(p => p.id))
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar atividades");
      return;
    }

    setActivities(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Usuário não autenticado. Faça login novamente.");
      return;
    }

    if (!projectId) {
      toast.error("Selecione um projeto");
      return;
    }

    const activityData = {
      name,
      description: description || null,
      status: status as ActivityStatus,
      deadline: deadline || null,
      project_id: projectId,
      created_by: user.id,
    };

    if (editing) {
      const { error } = await supabase
        .from("project_activities")
        .update({
          name,
          description: description || null,
          status: status as ActivityStatus,
          deadline: deadline || null,
        })
        .eq("id", editing.id);

      if (error) {
        toast.error("Erro ao atualizar atividade");
        return;
      }
      toast.success("Atividade atualizada!");
    } else {
      const { error } = await supabase.from("project_activities").insert(activityData);

      if (error) {
        toast.error("Erro ao criar atividade");
        return;
      }
      toast.success("Atividade criada!");
    }

    setOpen(false);
    resetForm();
    fetchActivities();
  };

  const handleEdit = (activity: Activity) => {
    setEditing(activity);
    setName(activity.name);
    setDescription(activity.description || "");
    setStatus((activity.status as ActivityStatus) || "pendente");
    setDeadline(activity.deadline || "");
    setProjectId(activity.project_id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;

    const { error } = await supabase.from("project_activities").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir atividade");
      return;
    }
    toast.success("Atividade excluída!");
    fetchActivities();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setStatus("pendente");
    setDeadline("");
    setProjectId("");
    setEditing(null);
  };

  const formatLastUpdate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atividades</h1>
          <p className="text-muted-foreground">Gerencie as atividades dos projetos</p>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Atividade" : "Nova Atividade"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Projeto *</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da atividade"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição da atividade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ActivityStatus)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Prazo</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
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
          <CardTitle>Lista de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma atividade cadastrada. Clique em "Nova Atividade" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell>{activity.description || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[(activity.status as ActivityStatus) || "pendente"]}>
                        {statusLabels[(activity.status as ActivityStatus) || "pendente"]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.deadline ? format(new Date(activity.deadline), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLastUpdate(activity.updated_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(activity)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(activity.id)}>
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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type ActivityStatus = Database['public']['Enums']['activity_status'];

interface Department {
  id: string;
  name: string;
}

const Activities = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const departmentFilterId = searchParams.get("department");
  const { isAdmin, isGestor, selectedCompanyId, profile } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [deadline, setDeadline] = useState("");

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

  // Update departmentId when filter changes
  useEffect(() => {
    if (departmentFilterId && !editing) {
      setDepartmentId(departmentFilterId);
    }
  }, [departmentFilterId, open, editing]);

  // Fetch department activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['department-activities', departmentFilterId, selectedCompanyId],
    queryFn: async () => {
      if (!departmentFilterId || !selectedCompanyId) return [];

      const { data, error } = await supabase
        .from('department_activities')
        .select(`
          *,
          department:departments(id, name, company_id)
        `)
        .eq('department_id', departmentFilterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).filter((activity: any) => 
        activity.department?.company_id === selectedCompanyId
      );
    },
    enabled: !!departmentFilterId && !!selectedCompanyId
  });

  // Create activity mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; department_id: string; deadline?: string }) => {
      if (!profile?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('department_activities')
        .insert({
          name: data.name,
          description: data.description || null,
          department_id: data.department_id,
          deadline: data.deadline || null,
          created_by: profile.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade criada com sucesso!');
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar atividade: ${error.message}`);
    }
  });

  // Update activity mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; status?: ActivityStatus; deadline?: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('department_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade atualizada!');
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar atividade: ${error.message}`);
    }
  });

  // Delete activity mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade excluída!');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir atividade: ${error.message}`);
    }
  });

  // Complete activity mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_activities')
        .update({
          status: 'concluida' as ActivityStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-activities'] });
      toast.success('Atividade concluída!');
    },
    onError: (error) => {
      toast.error(`Erro ao concluir atividade: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name,
        description,
        deadline: deadline || undefined,
      });
    } else {
      createMutation.mutate({
        name,
        description,
        department_id: departmentId,
        deadline: deadline || undefined,
      });
    }
  };

  const handleEdit = (activity: any) => {
    setEditing(activity);
    setName(activity.name);
    setDescription(activity.description || "");
    setDepartmentId(activity.department_id || "");
    setDeadline(activity.deadline || "");
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) return;
    deleteMutation.mutate(id);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDepartmentId(departmentFilterId || "");
    setDeadline("");
    setEditing(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluida": return "bg-green-100 text-green-800";
      case "em_andamento": return "bg-blue-100 text-blue-800";
      case "cancelada": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "concluida": return "Concluída";
      case "em_andamento": return "Em andamento";
      case "cancelada": return "Cancelada";
      case "pendente": return "Pendente";
      default: return status;
    }
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
    return null;
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editing ? "Editar Atividade" : "Criar Nova Atividade"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Atividade *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Fechamento Mensal"
                  required
                />
              </div>

              <div className="space-y-2">
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
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
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

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Atividade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando atividades...
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-50" />
                      <p>Nenhuma atividade encontrada.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity: any) => (
                  <TableRow key={activity.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="min-w-[200px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground">{activity.name}</span>
                        {activity.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {activity.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={activity.status}
                        onValueChange={(value) => updateMutation.mutate({ id: activity.id, status: value as ActivityStatus })}
                      >
                        <SelectTrigger className={`w-[140px] h-8 ${getStatusColor(activity.status)} border-0`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {activity.deadline ? format(new Date(activity.deadline), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activity.status !== "concluida" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => completeMutation.mutate(activity.id)}
                            title="Concluir atividade"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {(isAdmin || isGestor) && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(activity)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(activity.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

export default Activities;
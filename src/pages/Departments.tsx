import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLoading } from "@/contexts/LoadingContext";

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { profile, isAdmin, selectedCompanyId } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acesso não autorizado");
      navigate("/");
      return;
    }
    fetchDepartments();
  }, [isAdmin, navigate, selectedCompanyId]);

  const fetchDepartments = async () => {
    if (!selectedCompanyId) return;

    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq('company_id', selectedCompanyId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar departamentos");
      return;
    }

    setDepartments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id || !selectedCompanyId) {
      toast.error("Usuário não autenticado");
      return;
    }

    showLoading(editing ? "Atualizando departamento..." : "Criando departamento...");

    try {
      if (editing) {
        const { error } = await supabase
          .from("departments")
          .update({ name, description })
          .eq("id", editing.id);

        if (error) {
          toast.error("Erro ao atualizar departamento");
          return;
        }

        toast.success("Departamento atualizado!");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({
            name,
            description,
            company_id: selectedCompanyId,
            created_by: profile.id,
          });

        if (error) {
          toast.error("Erro ao criar departamento");
          return;
        }

        toast.success("Departamento criado!");
      }

      setOpen(false);
      resetForm();
      fetchDepartments();
    } finally {
      hideLoading();
    }
  };

  const handleEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este departamento?")) return;

    showLoading("Excluindo departamento...");

    try {
      const { error } = await supabase.from("departments").delete().eq("id", id);

      if (error) {
        toast.error("Erro ao excluir departamento");
        return;
      }

      toast.success("Departamento excluído!");
      fetchDepartments();
    } finally {
      hideLoading();
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditing(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">Gerencie os departamentos da empresa</p>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Novo Departamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Departamento" : "Novo Departamento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
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
          <CardTitle>Lista de Departamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.description}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(dept)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(dept.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Departments;
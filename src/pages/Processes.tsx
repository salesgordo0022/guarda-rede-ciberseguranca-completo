import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Process {
  id: string;
  name: string;
  description: string | null;
  reference_date: string | null;
  deadline_days: number;
  email_notification: boolean;
  created_at: string;
}

const Processes = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(0);
  const [emailNotification, setEmailNotification] = useState(false);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    const { data, error } = await supabase
      .from("processes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar processos");
      return;
    }

    setProcesses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const processData = {
      name,
      description,
      reference_date: referenceDate || null,
      deadline_days: deadlineDays,
      email_notification: emailNotification,
    };

    if (editing) {
      const { error } = await supabase
        .from("processes")
        .update(processData)
        .eq("id", editing.id);

      if (error) {
        toast.error("Erro ao atualizar processo");
        return;
      }

      toast.success("Processo atualizado!");
    } else {
      const { error } = await supabase.from("processes").insert(processData);

      if (error) {
        toast.error("Erro ao criar processo");
        return;
      }

      toast.success("Processo criado!");
    }

    setOpen(false);
    resetForm();
    fetchProcesses();
  };

  const handleEdit = (process: Process) => {
    setEditing(process);
    setName(process.name);
    setDescription(process.description || "");
    setReferenceDate(process.reference_date || "");
    setDeadlineDays(process.deadline_days);
    setEmailNotification(process.email_notification);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este processo?")) return;

    const { error } = await supabase.from("processes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir processo");
      return;
    }

    toast.success("Processo excluído!");
    fetchProcesses();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setReferenceDate("");
    setDeadlineDays(0);
    setEmailNotification(false);
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processos</h1>
          <p className="text-muted-foreground">Gerencie os processos com múltiplas atividades</p>
        </div>
        
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Processo" : "Novo Processo"}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceDate">Data de Referência</Label>
                  <Input
                    id="referenceDate"
                    type="date"
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadlineDays">Prazo (dias)</Label>
                  <Input
                    id="deadlineDays"
                    type="number"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email_notification"
                  checked={emailNotification}
                  onCheckedChange={(checked) => setEmailNotification(checked as boolean)}
                />
                <Label htmlFor="email_notification">Notificação por e-mail ao finalizar</Label>
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
          <CardTitle>Lista de Processos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data Referência</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Notificação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">{process.name}</TableCell>
                  <TableCell>
                    {process.reference_date ? (
                      new Date(process.reference_date).toLocaleDateString("pt-BR")
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{process.deadline_days} dias</Badge>
                  </TableCell>
                  <TableCell>
                    {process.email_notification ? (
                      <Badge className="bg-green-500">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(process)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(process.id)}>
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

export default Processes;

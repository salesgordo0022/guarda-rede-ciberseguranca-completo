import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Department { id: string; name: string }
interface SubTask { title: string; description: string }

const GenerateActivity = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [cancellationType, setCancellationType] = useState("");
  const [requiresJustification, setRequiresJustification] = useState(false);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceUnit, setRecurrenceUnit] = useState("");
  const [recurrenceEvery, setRecurrenceEvery] = useState(1);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) {
        toast.error("Erro ao carregar departamentos");
        return;
      }
      setDepartments(data || []);
    };
    fetchDepartments();
  }, []);

  const addSubTask = () => setSubTasks([...subTasks, { title: "", description: "" }]);
  const removeSubTask = (index: number) => setSubTasks(subTasks.filter((_, i) => i !== index));
  const updateSubTask = (index: number, field: keyof SubTask, value: string) => {
    const copy = [...subTasks];
    copy[index] = { ...copy[index], [field]: value };
    setSubTasks(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !departmentId) {
      toast.error("Informe título e departamento");
      return;
    }
    if (recurrenceEnabled) {
      if (!recurrenceUnit) {
        toast.error("Selecione a frequência da recorrência");
        return;
      }
      if (!recurrenceEvery || recurrenceEvery < 1) {
        toast.error("Informe um intervalo mínimo de 1");
        return;
      }
      if (!recurrenceStartDate) {
        toast.error("Informe a data de início da recorrência");
        return;
      }
    }
    const { data, error } = await supabase.from("activities").insert({
      title,
      description,
      department_id: departmentId,
      cancellation_type: cancellationType || null,
      requires_justification: requiresJustification,
      recurrence_enabled: recurrenceEnabled,
      recurrence_unit: recurrenceEnabled ? (recurrenceUnit || null) : null,
      recurrence_every: recurrenceEnabled ? recurrenceEvery : null,
      recurrence_start_date: recurrenceEnabled && recurrenceStartDate ? recurrenceStartDate : null,
    }).select("id").single();
    if (error) {
      toast.error(`Erro ao criar tarefa: ${error.message}`);
      return;
    }

    const activityId = data?.id;
    if (activityId && subTasks.length > 0) {
      const rows = subTasks
        .filter(st => st.title.trim().length > 0)
        .map((st, idx) => ({ activity_id: activityId, title: st.title, description: st.description, order_index: idx }));
      const { error: subErr } = await supabase.from("sub_activities").insert(rows);
      if (subErr) {
        toast.error(`Tarefa criada, mas houve erro ao salvar subtarefas: ${subErr.message}`);
      }
    }

    toast.success("Tarefa criada com sucesso!");
    setTitle("");
    setDescription("");
    setDepartmentId("");
    setCancellationType("");
    setRequiresJustification(false);
    setSubTasks([]);
    setRecurrenceEnabled(false);
    setRecurrenceUnit("");
    setRecurrenceEvery(1);
    setRecurrenceStartDate("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Gerar Tarefa</h1>
      <p className="text-muted-foreground">Crie uma tarefa única, com opção de subtarefas</p>
      <Card>
        <CardHeader>
          <CardTitle>Nova Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Solicitar documentos" required />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="rec" checked={recurrenceEnabled} onCheckedChange={(v) => setRecurrenceEnabled(!!v)} />
                <Label htmlFor="rec">Ativar recorrência automática</Label>
              </div>
              {recurrenceEnabled && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label id="recUnitLabel">Frequência</Label>
                    <Select value={recurrenceUnit} onValueChange={setRecurrenceUnit} required>
                      <SelectTrigger aria-labelledby="recUnitLabel"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Diária</SelectItem>
                        <SelectItem value="week">Semanal</SelectItem>
                        <SelectItem value="month">Mensal</SelectItem>
                        <SelectItem value="year">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recEvery">A cada</Label>
                    <Input id="recEvery" aria-label="A cada" type="number" min={1} value={recurrenceEvery} onChange={(e) => setRecurrenceEvery(parseInt(e.target.value || "1", 10))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recStart">Início</Label>
                    <Input id="recStart" aria-label="Data de início" type="date" value={recurrenceStartDate} onChange={(e) => setRecurrenceStartDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento *</Label>
                <Select value={departmentId} onValueChange={setDepartmentId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cancelamento</Label>
                <Input value={cancellationType} onChange={(e) => setCancellationType(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={requiresJustification} onCheckedChange={(v) => setRequiresJustification(!!v)} id="just" />
                <Label htmlFor="just">Exige justificativa de cancelamento</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subtarefas</Label>
                <Button type="button" variant="outline" onClick={addSubTask}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
              </div>
              {subTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma subtarefa adicionada</p>
              )}
              {subTasks.map((st, idx) => (
                <div key={idx} className="grid md:grid-cols-2 gap-4 items-start">
                  <Input value={st.title} onChange={(e) => updateSubTask(idx, "title", e.target.value)} placeholder={`Subtarefa #${idx + 1} título`} />
                  <div className="flex gap-2">
                    <Textarea value={st.description} onChange={(e) => updateSubTask(idx, "description", e.target.value)} placeholder="Descrição opcional" />
                    <Button type="button" variant="destructive" onClick={() => removeSubTask(idx)} className="self-start"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Criar Tarefa</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateActivity;
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Activity { id: string; title: string; departments?: { name: string } }

const GenerateProcess = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(0);
  const [emailNotification, setEmailNotification] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Activity[]>([]);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceUnit, setRecurrenceUnit] = useState("");
  const [recurrenceEvery, setRecurrenceEvery] = useState(1);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, departments:department_id (name)")
        .order("order_index");
      if (error) {
        toast.error("Erro ao carregar atividades");
        return;
      }
      setActivities(data || []);
    };
    load();
  }, []);

  const addActivity = (activity: Activity) => {
    if (selected.find(a => a.id === activity.id)) return;
    setSelected([...selected, activity]);
  };
  const removeActivity = (id: string) => setSelected(selected.filter(a => a.id !== id));
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...selected];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    setSelected(copy);
  };
  const moveDown = (idx: number) => {
    if (idx === selected.length - 1) return;
    const copy = [...selected];
    [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
    setSelected(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selected.length === 0) {
      toast.error("Informe nome e selecione pelo menos uma tarefa");
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
    const { data, error } = await supabase
      .from("processes")
      .insert({
        name,
        description,
        reference_date: referenceDate || null,
        deadline_days: deadlineDays,
        email_notification: emailNotification,
        recurrence_enabled: recurrenceEnabled,
        recurrence_unit: recurrenceEnabled ? (recurrenceUnit || null) : null,
        recurrence_every: recurrenceEnabled ? recurrenceEvery : null,
        recurrence_start_date: recurrenceEnabled && recurrenceStartDate ? recurrenceStartDate : null,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(`Erro ao criar processo: ${error.message}`);
      return;
    }
    const processId = data?.id;
    const rows = selected.map((a, idx) => ({ process_id: processId, activity_id: a.id, order_index: idx }));
    const { error: paErr } = await supabase.from("process_activities").insert(rows);
    if (paErr) {
      toast.error(`Processo criado, erro ao associar tarefas: ${paErr.message}`);
      return;
    }
    toast.success("Processo criado com sucesso!");
    setName("");
    setDescription("");
    setReferenceDate("");
    setDeadlineDays(0);
    setEmailNotification(false);
    setSelected([]);
    setRecurrenceEnabled(false);
    setRecurrenceUnit("");
    setRecurrenceEvery(1);
    setRecurrenceStartDate("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Gerar Processo</h1>
      <p className="text-muted-foreground">Monte um processo com tarefas em ordem sequencial</p>
      <Card>
        <CardHeader>
          <CardTitle>Novo Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Onboarding de Cliente" required />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="recProc" checked={recurrenceEnabled} onCheckedChange={(v) => setRecurrenceEnabled(!!v)} />
                <Label htmlFor="recProc">Ativar recorrência automática</Label>
              </div>
              {recurrenceEnabled && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label id="recUnitProcLabel">Frequência</Label>
                    <Select value={recurrenceUnit} onValueChange={setRecurrenceUnit} required>
                      <SelectTrigger aria-labelledby="recUnitProcLabel"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Diária</SelectItem>
                        <SelectItem value="week">Semanal</SelectItem>
                        <SelectItem value="month">Mensal</SelectItem>
                        <SelectItem value="year">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recEveryProc">A cada</Label>
                    <Input id="recEveryProc" aria-label="A cada" type="number" min={1} value={recurrenceEvery} onChange={(e) => setRecurrenceEvery(parseInt(e.target.value || "1", 10))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recStartProc">Início</Label>
                    <Input id="recStartProc" aria-label="Data de início" type="date" value={recurrenceStartDate} onChange={(e) => setRecurrenceStartDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data de Referência</Label>
                <Input type="date" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prazo (dias)</Label>
                <Input type="number" value={deadlineDays} onChange={(e) => setDeadlineDays(parseInt(e.target.value || "0", 10))} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="emailNotify" checked={emailNotification} onCheckedChange={(v) => setEmailNotification(!!v)} />
                <Label htmlFor="emailNotify">Enviar e-mail ao responsável</Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Selecione Tarefas</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.departments?.name || "-"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" onClick={() => addActivity(a)}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <Label>Ordem do Processo</Label>
              {selected.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa selecionada</p>}
              {selected.map((a, idx) => (
                <div key={a.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{idx + 1}. {a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.departments?.name || "-"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => moveUp(idx)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => moveDown(idx)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" variant="destructive" onClick={() => removeActivity(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Criar Processo</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateProcess;
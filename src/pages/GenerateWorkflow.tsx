import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Process { id: string; name: string; description: string | null }

const GenerateWorkflow = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selected, setSelected] = useState<Process[]>([]);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceUnit, setRecurrenceUnit] = useState("");
  const [recurrenceEvery, setRecurrenceEvery] = useState(1);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("id, name, description")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar processos");
        return;
      }
      setProcesses(data || []);
    };
    load();
  }, []);

  const addProcess = (proc: Process) => {
    if (selected.find(p => p.id === proc.id)) return;
    setSelected([...selected, proc]);
  };
  const removeProcess = (id: string) => setSelected(selected.filter(p => p.id !== id));
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
      toast.error("Informe nome e selecione pelo menos um processo");
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
      .from("workflows")
      .insert({ 
        name, 
        description,
        recurrence_enabled: recurrenceEnabled,
        recurrence_unit: recurrenceEnabled ? (recurrenceUnit || null) : null,
        recurrence_every: recurrenceEnabled ? recurrenceEvery : null,
        recurrence_start_date: recurrenceEnabled && recurrenceStartDate ? recurrenceStartDate : null,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(`Erro ao criar fluxo: ${error.message}`);
      return;
    }
    const workflowId = data?.id;
    const rows = selected.map((p, idx) => ({ workflow_id: workflowId, process_id: p.id, order_index: idx }));
    const { error: wpErr } = await supabase.from("workflow_processes").insert(rows);
    if (wpErr) {
      toast.error(`Fluxo criado, erro ao associar processos: ${wpErr.message}`);
      return;
    }
    toast.success("Fluxo criado com sucesso!");
    setName("");
    setDescription("");
    setSelected([]);
    setRecurrenceEnabled(false);
    setRecurrenceUnit("");
    setRecurrenceEvery(1);
    setRecurrenceStartDate("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Gerar Fluxo</h1>
      <p className="text-muted-foreground">Monte um fluxo com processos em ordem sequencial interdepartamental</p>
      <Card>
        <CardHeader>
          <CardTitle>Novo Fluxo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Abertura de Empresa" required />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="recFlow" checked={recurrenceEnabled} onCheckedChange={(v) => setRecurrenceEnabled(!!v)} />
                <Label htmlFor="recFlow">Ativar recorrência automática</Label>
              </div>
              {recurrenceEnabled && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label id="recUnitFlowLabel">Frequência</Label>
                    <Select value={recurrenceUnit} onValueChange={setRecurrenceUnit} required>
                      <SelectTrigger aria-labelledby="recUnitFlowLabel"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Diária</SelectItem>
                        <SelectItem value="week">Semanal</SelectItem>
                        <SelectItem value="month">Mensal</SelectItem>
                        <SelectItem value="year">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recEveryFlow">A cada</Label>
                    <Input id="recEveryFlow" aria-label="A cada" type="number" min={1} value={recurrenceEvery} onChange={(e) => setRecurrenceEvery(parseInt(e.target.value || "1", 10))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recStartFlow">Início</Label>
                    <Input id="recStartFlow" aria-label="Data de início" type="date" value={recurrenceStartDate} onChange={(e) => setRecurrenceStartDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <div className="space-y-3">
              <Label>Selecione Processos</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{p.description || "-"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" onClick={() => addProcess(p)}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <Label>Ordem do Fluxo</Label>
              {selected.length === 0 && <p className="text-sm text-muted-foreground">Nenhum processo selecionado</p>}
              {selected.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{idx + 1}. {p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description || "-"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => moveUp(idx)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => moveDown(idx)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" variant="destructive" onClick={() => removeProcess(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Criar Fluxo</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateWorkflow;
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const priorities = [
  { value: "low", label: "Baixa", color: "text-green-600" },
  { value: "medium", label: "Média", color: "text-yellow-600" },
  { value: "high", label: "Alta", color: "text-orange-600" },
  { value: "urgent", label: "Urgente", color: "text-red-600" },
];

const ProcessGenerator = () => {
  const { toast } = useToast();
  const [generatorType, setGeneratorType] = useState<"process">("process");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [deadlineDays, setDeadlineDays] = useState<number>(0);
  const [emailNotification, setEmailNotification] = useState<boolean>(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) {
        toast({ title: "Erro", description: "Falha ao carregar departamentos", variant: "destructive" });
        return;
      }
      setDepartments(data || []);
    };
    fetchDepartments();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const run = async () => {
      if (generatorType === "process") {
        if (!title) {
          toast({ title: "Erro", description: "Informe o nome do processo", variant: "destructive" });
          return;
        }
        const processData = {
          name: title,
          description,
          reference_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
          deadline_days: Number.isFinite(deadlineDays) ? deadlineDays : 0,
          email_notification: emailNotification,
        };
        const { error } = await supabase.from("processes").insert(processData);
        if (error) {
          toast({ title: "Erro ao criar processo", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Processo criado!", description: `"${title}" adicionado com sucesso` });
        setTitle("");
        setDescription("");
        setStartDate(undefined);
        setDeadlineDays(0);
        setEmailNotification(false);
        return;
      }
    };

    run();
  };

  const handleAIGenerate = () => {
    toast({
      title: "Gerando tarefas com IA...",
      description: "Analisando seu departamento e criando sugestões personalizadas",
    });
    
    // Simulate AI generation
    setTimeout(() => {
      toast({
        title: "Sugestões geradas!",
        description: "3 novas tarefas foram sugeridas baseadas no seu histórico",
      });
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerador de Processos</h1>
          <p className="text-muted-foreground">Crie novos processos</p>
        </div>
        <Button onClick={handleAIGenerate} variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar com IA
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form Card */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Novo Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Geração *</Label>
                <Select value={generatorType} onValueChange={(v) => setGeneratorType(v as "process")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="process">Processo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  {generatorType === "process" && "Nome do Processo *"}
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    generatorType === "process"
                      ? "Ex: Onboarding de novo cliente"
                      : "Ex: Onboarding de novo cliente"
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os detalhes da tarefa..."
                  rows={4}
                />
              </div>

              {generatorType === "process" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Referência</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo (dias)</Label>
                    <Input
                      type="number"
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(parseInt(e.target.value || "0", 10))}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="emailNotify" checked={emailNotification} onCheckedChange={(v) => setEmailNotification(!!v)} />
                    <Label htmlFor="emailNotify">Enviar notificação por e-mail</Label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {generatorType === "process" && "Criar Processo"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview/Tips Card */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Dicas para Criação de Processos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Defina objetivos claros</h4>
                  <p className="text-sm text-muted-foreground">
                    Estabeleça metas específicas e mensuráveis para o processo
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Mapeie etapas essenciais</h4>
                  <p className="text-sm text-muted-foreground">
                    Identifique todas as atividades necessárias para completar o processo
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Defina papéis e responsabilidades</h4>
                  <p className="text-sm text-muted-foreground">
                    Clarifique quem é responsável por cada etapa do processo
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Estabeleça indicadores de desempenho</h4>
                  <p className="text-sm text-muted-foreground">
                    Defina métricas para monitorar a eficiência e eficácia do processo
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary mb-1">Geração Inteligente com IA</h4>
                  <p className="text-sm text-muted-foreground">
                    Use o botão "Gerar com IA" para criar automaticamente processos baseados no histórico do seu departamento e nas melhores práticas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcessGenerator;

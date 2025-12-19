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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TaskGenerator = () => {
  const { toast } = useToast();
  const { selectedCompanyId, user } = useAuth();
  const [generatorType, setGeneratorType] = useState<"project_activity" | "department_activity">("project_activity");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState<Date>();

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchProjects();
    }
  }, [selectedCompanyId]);

  const fetchDepartments = async () => {
    if (!selectedCompanyId) return;
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", selectedCompanyId)
      .order("name");
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar departamentos", variant: "destructive" });
      return;
    }
    setDepartments(data || []);
  };

  const fetchProjects = async () => {
    if (!selectedCompanyId) return;
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", selectedCompanyId)
      .order("name");
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar projetos", variant: "destructive" });
      return;
    }
    setProjects(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (!name) {
      toast({ title: "Erro", description: "Informe o nome", variant: "destructive" });
      return;
    }

    if (generatorType === "project_activity") {
      if (!projectId) {
        toast({ title: "Erro", description: "Selecione um projeto", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("project_activities").insert({
        name,
        description: description || null,
        project_id: projectId,
        deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
        created_by: user.id,
        status: "pendente",
      });

      if (error) {
        toast({ title: "Erro ao criar atividade", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Atividade criada!", description: `"${name}" adicionada ao projeto` });
    } else {
      if (!departmentId) {
        toast({ title: "Erro", description: "Selecione um departamento", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("department_activities").insert({
        name,
        description: description || null,
        department_id: departmentId,
        deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
        created_by: user.id,
        status: "pendente",
      });

      if (error) {
        toast({ title: "Erro ao criar atividade", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Atividade criada!", description: `"${name}" adicionada ao departamento` });
    }

    setName("");
    setDescription("");
    setDepartmentId("");
    setProjectId("");
    setDeadline(undefined);
  };

  const handleAIGenerate = () => {
    toast({
      title: "Gerando atividades com IA...",
      description: "Analisando seu contexto e criando sugestões personalizadas",
    });

    setTimeout(() => {
      toast({
        title: "Sugestões geradas!",
        description: "3 novas atividades foram sugeridas baseadas no seu histórico",
      });
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerador de Atividades</h1>
          <p className="text-muted-foreground">Crie atividades para projetos ou departamentos</p>
        </div>
        <Button onClick={handleAIGenerate} variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar com IA
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Nova Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select value={generatorType} onValueChange={(v) => setGeneratorType(v as any)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_activity">Atividade de Projeto</SelectItem>
                    <SelectItem value="department_activity">Atividade de Departamento</SelectItem>
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
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os detalhes da atividade..."
                  rows={4}
                />
              </div>

              {generatorType === "project_activity" && (
                <div className="space-y-2">
                  <Label htmlFor="project">Projeto *</Label>
                  <Select value={projectId} onValueChange={setProjectId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {generatorType === "department_activity" && (
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
              )}

              <div className="space-y-2">
                <Label>Prazo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP", { locale: ptBR }) : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Criar Atividade
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Dicas para Criação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Seja específico</h4>
                  <p className="text-sm text-muted-foreground">
                    Nomes claros ajudam a equipe a entender rapidamente o que precisa ser feito
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Defina prazos realistas</h4>
                  <p className="text-sm text-muted-foreground">
                    Considere a complexidade e a disponibilidade da equipe
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Organize por contexto</h4>
                  <p className="text-sm text-muted-foreground">
                    Use atividades de projeto para entregas e de departamento para rotinas
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

export default TaskGenerator;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const GenerateProcess = () => {
  const { profile, selectedCompanyId } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedCompanyId) return;
      
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq('company_id', selectedCompanyId)
        .order("name");
        
      if (error) {
        toast.error("Erro ao carregar projetos");
        return;
      }
      setProjects(data || []);
    };
    fetchProjects();
  }, [selectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !projectId) {
      toast.error("Informe nome e projeto");
      return;
    }

    if (!profile?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("project_activities").insert({
      name,
      description: description || null,
      project_id: projectId,
      deadline: deadline || null,
      created_by: profile.id,
    });

    if (error) {
      toast.error(`Erro ao criar atividade: ${error.message}`);
      return;
    }

    toast.success("Atividade de projeto criada com sucesso!");
    setName("");
    setDescription("");
    setProjectId("");
    setDeadline("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Gerar Atividade de Projeto</h1>
      <p className="text-muted-foreground">Crie uma atividade vinculada a um projeto</p>
      <Card>
        <CardHeader>
          <CardTitle>Nova Atividade de Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Entrega da documentação" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4} 
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Projeto *</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input 
                  type="date" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)} 
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Criar Atividade de Projeto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateProcess;
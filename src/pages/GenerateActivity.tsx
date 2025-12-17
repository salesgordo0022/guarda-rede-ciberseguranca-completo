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

interface Department { id: string; name: string }

const GenerateActivity = () => {
  const { profile, selectedCompanyId } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!selectedCompanyId) return;
      
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq('company_id', selectedCompanyId)
        .order("name");
        
      if (error) {
        toast.error("Erro ao carregar departamentos");
        return;
      }
      setDepartments(data || []);
    };
    fetchDepartments();
  }, [selectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !departmentId) {
      toast.error("Informe nome e departamento");
      return;
    }

    if (!profile?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("department_activities").insert({
      name,
      description: description || null,
      department_id: departmentId,
      deadline: deadline || null,
      created_by: profile.id,
    });

    if (error) {
      toast.error(`Erro ao criar atividade: ${error.message}`);
      return;
    }

    toast.success("Atividade criada com sucesso!");
    setName("");
    setDescription("");
    setDepartmentId("");
    setDeadline("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Gerar Atividade</h1>
      <p className="text-muted-foreground">Crie uma atividade para um departamento</p>
      <Card>
        <CardHeader>
          <CardTitle>Nova Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Solicitar documentos" 
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
                <Label>Prazo</Label>
                <Input 
                  type="date" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)} 
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Criar Atividade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateActivity;
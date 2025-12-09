import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const GenerateWorkflow = () => {
  const { profile, selectedCompanyId } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast.error("Informe o nome do projeto");
      return;
    }

    if (!profile?.id || !selectedCompanyId) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("projects").insert({
      name,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      company_id: selectedCompanyId,
      created_by: profile.id,
    });

    if (error) {
      toast.error(`Erro ao criar projeto: ${error.message}`);
      return;
    }

    toast.success("Projeto criado com sucesso!");
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Criar Projeto</h1>
      <p className="text-muted-foreground">Crie um novo projeto para organizar suas atividades</p>
      <Card>
        <CardHeader>
          <CardTitle>Novo Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Projeto *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Abertura de Empresa" 
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
                <Label>Data de Início</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Criar Projeto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateWorkflow;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Esta página requer tabelas que não existem no banco de dados atual
// Redirecionamos para a página de projetos que tem funcionalidade similar
const Processes = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processos</h1>
          <p className="text-muted-foreground">Gerencie os processos do sistema</p>
        </div>
      </div>

      <Card className="p-12 text-center">
        <CardHeader>
          <CardTitle>Funcionalidade em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A funcionalidade de Processos está sendo desenvolvida. 
            Por enquanto, você pode usar a página de Projetos para organizar suas atividades.
          </p>
          <Button onClick={() => navigate('/projects')} className="gap-2">
            Ir para Projetos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Processes;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

// Esta página requer tabelas que não existem no banco de dados atual
const ProcessGenerator = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerador de Processos</h1>
          <p className="text-muted-foreground">Crie novos processos automaticamente</p>
        </div>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" disabled>
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar com IA
        </Button>
      </div>

      <Card className="p-12 text-center">
        <CardHeader>
          <CardTitle>Funcionalidade em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O gerador de processos está sendo desenvolvido.
            Por enquanto, você pode criar projetos e atividades manualmente.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/generate-workflow')} variant="outline" className="gap-2">
              Criar Projeto
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate('/generate-activity')} className="gap-2">
              Criar Atividade
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessGenerator;
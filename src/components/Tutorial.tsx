import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Play,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  selector?: string; // CSS selector for highlighting elements
  position?: "top" | "bottom" | "left" | "right";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Bem-vindo ao TaskFlow!",
    content: "Este é um guia rápido para ajudá-lo a entender como usar o sistema de gerenciamento de tarefas."
  },
  {
    id: 2,
    title: "Painel de Controle",
    content: "Aqui você encontra um resumo das suas tarefas, métricas importantes e gráficos de desempenho.",
    selector: "[data-tutorial='dashboard']"
  },
  {
    id: 3,
    title: "Gerenciamento de Departamentos",
    content: "Os departamentos organizam suas atividades. Você pode criar, editar e visualizar departamentos aqui.",
    selector: "[data-tutorial='departments']"
  },
  {
    id: 4,
    title: "Equipe e Usuários",
    content: "Gerencie sua equipe, adicione novos membros e defina permissões de acesso.",
    selector: "[data-tutorial='team']"
  },
  {
    id: 5,
    title: "Atividades",
    content: "Visualize e gerencie todas as atividades do seu departamento selecionado.",
    selector: "[data-tutorial='activities']"
  },
  {
    id: 6,
    title: "Configurações",
    content: "Personalize o sistema, gerencie departamentos e configure preferências.",
    selector: "[data-tutorial='settings']"
  },
  {
    id: 7,
    title: "Concluído!",
    content: "Você completou o tutorial básico. Agora você está pronto para usar o TaskFlow efetivamente!"
  }
];

export function Tutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Check if tutorial was completed before
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("tutorial-completed");
    if (tutorialCompleted) {
      setCompleted(true);
    }
  }, []);

  // Handle element highlighting
  useEffect(() => {
    if (!isOpen) return;
    
    const currentStepData = tutorialSteps[currentStep];
    if (currentStepData.selector) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const element = document.querySelector(currentStepData.selector!) as HTMLElement;
        if (element) {
          setHighlightElement(element);
          scrollToElement(element);
        } else {
          setHighlightElement(null);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setHighlightElement(null);
    }
  }, [currentStep, isOpen]);

  const scrollToElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const startTutorial = () => {
    setIsOpen(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < tutorialSteps.length) {
      setCurrentStep(step);
    }
  };

  const finishTutorial = () => {
    setIsOpen(false);
    setCompleted(true);
    setHighlightElement(null);
    localStorage.setItem("tutorial-completed", "true");
  };

  const resetTutorial = () => {
    setCompleted(false);
    localStorage.removeItem("tutorial-completed");
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <>
      <button 
        onClick={startTutorial}
        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90 hover-scale w-full"
      >
        <Play className="h-5 w-5 flex-shrink-0" />
        <span className="text-[15px]">Primeiros Passos</span>
        {completed && <CheckCircle className="h-4 w-4 ml-auto" />}
      </button>

      {/* Highlight overlay */}
      {highlightElement && (
        <div 
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            background: 'rgba(0, 0, 0, 0.5)'
          }}
        />
      )}

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setHighlightElement(null);
        }
      }}>
        <DialogOverlay className="bg-black/50" />
        <DialogContent className="max-w-md mx-auto mt-20 rounded-lg p-0 relative z-50">
          <Card className="border-0 shadow-none">
            <CardHeader className="relative pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold">
                  {currentStepData.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                {currentStepData.content}
              </p>
              
              {currentStep > 0 && currentStep < tutorialSteps.length - 1 && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Dica: Clique nos elementos destacados na tela para interagir com eles diretamente.
                  </p>
                </div>
              )}
              
              <div className="flex justify-center mt-4 space-x-1">
                {tutorialSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToStep(index)}
                    className={`w-2 h-2 rounded-full ${index === currentStep ? "bg-primary" : "bg-muted"}`}
                    aria-label={`Ir para o passo ${index + 1}`}
                  ></button>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <Button
                onClick={nextStep}
                className="gap-2"
              >
                {currentStep === tutorialSteps.length - 1 ? "Concluir" : "Próximo"}
                {currentStep !== tutorialSteps.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
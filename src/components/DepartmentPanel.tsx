import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface DepartmentItem {
  department: string;
  obligations: number;
  action: number;
  attention: number;
  pending: number;
  completed: number;
}

const mockData: DepartmentItem[] = [
  {
    department: "TI",
    obligations: 1,
    action: 0,
    attention: 0,
    pending: 0,
    completed: 2,
  },
];

const solicitacoesData: DepartmentItem[] = [
  {
    department: "CERTIFICADO DIGITAL",
    obligations: 0,
    action: 0,
    attention: 0,
    pending: 0,
    completed: 1,
  },
  {
    department: "COMERCIAL",
    obligations: 0,
    action: 4,
    attention: 0,
    pending: 0,
    completed: 0,
  },
  {
    department: "CONTABILIDADE",
    obligations: 0,
    action: 0,
    attention: 0,
    pending: 0,
    completed: 1,
  },
  {
    department: "DEPARTAMENTO PESSOAL",
    obligations: 0,
    action: 0,
    attention: 0,
    pending: 0,
    completed: 1,
  },
  {
    department: "DIRETORIA",
    obligations: 0,
    action: 0,
    attention: 0,
    pending: 0,
    completed: 1,
  },
  {
    department: "FINANCEIRO",
    obligations: 0,
    action: 0,
    attention: 0,
    pending: 0,
    completed: 2,
  },
  {
    department: "TI",
    obligations: 0,
    action: 0,
    attention: 0,
    pending: 43,
    completed: 7,
  },
];

const getBadgeColor = (type: string, count: number) => {
  if (count === 0) return "bg-muted text-muted-foreground";
  
  switch (type) {
    case "obligations":
      return "bg-yellow-500 text-white";
    case "action":
      return "bg-orange-600 text-white";
    case "attention":
      return "bg-muted text-muted-foreground";
    case "pending":
      return "bg-green-500 text-white";
    case "completed":
      return "bg-purple-600 text-white";
    default:
      return "bg-muted";
  }
};

export function DepartmentPanel() {
  const [solicitacoesOpen, setSolicitacoesOpen] = useState(true);

  return (
    <Card className="p-6 animate-fade-in">
      <div className="mb-6">
        <div className="grid grid-cols-6 gap-4 mb-3 pb-2 border-b">
          <div className="col-span-1"></div>
          <div className="text-center font-semibold text-sm">Obrigações</div>
          <div className="text-center font-semibold text-sm">Ação</div>
          <div className="text-center font-semibold text-sm">Atenção</div>
          <div className="text-center font-semibold text-sm">Pendentes</div>
          <div className="text-center font-semibold text-sm">Concluídas</div>
        </div>

        {mockData.map((dept) => (
          <div key={dept.department} className="grid grid-cols-6 gap-4 py-2 items-center hover:bg-muted/50 rounded transition-colors">
            <div className="font-medium flex items-center gap-2">
              <span className="text-xs">☰</span>
              {dept.department}
            </div>
            <div className="flex justify-center">
              <Badge className={`${getBadgeColor("obligations", dept.obligations)} min-w-[40px] justify-center`}>
                {dept.obligations}
              </Badge>
            </div>
            <div className="flex justify-center">
              <Badge className={`${getBadgeColor("action", dept.action)} min-w-[40px] justify-center`}>
                {dept.action}
              </Badge>
            </div>
            <div className="flex justify-center">
              <Badge className={`${getBadgeColor("attention", dept.attention)} min-w-[40px] justify-center`}>
                {dept.attention}
              </Badge>
            </div>
            <div className="flex justify-center">
              <Badge className={`${getBadgeColor("pending", dept.pending)} min-w-[40px] justify-center`}>
                {dept.pending}
              </Badge>
            </div>
            <div className="flex justify-center">
              <Badge className={`${getBadgeColor("completed", dept.completed)} min-w-[40px] justify-center`}>
                {dept.completed}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div>
        <button
          onClick={() => setSolicitacoesOpen(!solicitacoesOpen)}
          className="w-full mb-3 pb-2 border-b flex items-center justify-between hover:bg-muted/50 rounded px-2 transition-colors"
        >
          <div className="grid grid-cols-6 gap-4 flex-1">
            <div className="col-span-1"></div>
            <div className="text-center font-semibold text-sm">Solicitações</div>
            <div className="text-center font-semibold text-sm">Ação</div>
            <div className="text-center font-semibold text-sm">Atenção</div>
            <div className="text-center font-semibold text-sm">Pendentes</div>
            <div className="text-center font-semibold text-sm">Concluídas</div>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${solicitacoesOpen ? 'rotate-180' : ''}`} />
        </button>

        {solicitacoesOpen && (
          <div className="space-y-1 animate-accordion-down">
            {solicitacoesData.map((dept, index) => (
              <div key={index} className="grid grid-cols-6 gap-4 py-2 items-center hover:bg-muted/50 rounded transition-colors">
                <div className="font-medium text-sm text-muted-foreground flex items-center gap-2 pl-4">
                  <span className="text-xs">☰</span>
                  {dept.department}
                </div>
                <div className="flex justify-center">
                  <Badge className={`${getBadgeColor("obligations", dept.obligations)} min-w-[40px] justify-center text-xs`}>
                    {dept.obligations}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Badge className={`${getBadgeColor("action", dept.action)} min-w-[40px] justify-center text-xs`}>
                    {dept.action}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Badge className={`${getBadgeColor("attention", dept.attention)} min-w-[40px] justify-center text-xs`}>
                    {dept.attention}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Badge className={`${getBadgeColor("pending", dept.pending)} min-w-[40px] justify-center text-xs`}>
                    {dept.pending}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Badge className={`${getBadgeColor("completed", dept.completed)} min-w-[40px] justify-center text-xs`}>
                    {dept.completed}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="mt-6 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
        <span>Legenda de Processos</span>
        <ChevronDown className="h-4 w-4" />
      </button>
    </Card>
  );
}
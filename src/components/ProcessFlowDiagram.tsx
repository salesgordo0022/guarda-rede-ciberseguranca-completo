import { useMemo } from "react";
import { ArrowRight, Circle, CheckCircle2, Clock, XCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type ActivityStatus = Database['public']['Enums']['activity_status'];

interface Activity {
  id: string;
  name: string;
  status: ActivityStatus;
}

interface ProcessFlowDiagramProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

const stages = [
  { 
    key: 'pendente' as ActivityStatus, 
    label: 'Não Iniciado', 
    color: 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600',
    textColor: 'text-gray-600 dark:text-gray-400',
    icon: Circle,
    dotColor: 'bg-gray-400'
  },
  { 
    key: 'em_andamento' as ActivityStatus, 
    label: 'Em Andamento', 
    color: 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: Play,
    dotColor: 'bg-blue-500'
  },
  { 
    key: 'concluida' as ActivityStatus, 
    label: 'Finalizado', 
    color: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-600',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500'
  },
  { 
    key: 'cancelada' as ActivityStatus, 
    label: 'Cancelado', 
    color: 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-600',
    textColor: 'text-red-600 dark:text-red-400',
    icon: XCircle,
    dotColor: 'bg-red-500'
  },
];

export const ProcessFlowDiagram = ({ activities, onActivityClick }: ProcessFlowDiagramProps) => {
  const groupedActivities = useMemo(() => {
    const groups: Record<ActivityStatus, Activity[]> = {
      pendente: [],
      em_andamento: [],
      concluida: [],
      cancelada: []
    };

    activities.forEach(activity => {
      if (groups[activity.status]) {
        groups[activity.status].push(activity);
      }
    });

    return groups;
  }, [activities]);

  // Filter out empty stages except the main flow
  const mainStages = stages.filter(s => s.key !== 'cancelada');
  const hasCancelled = groupedActivities.cancelada.length > 0;

  return (
    <div className="space-y-6">
      {/* Main Flow */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-300 via-blue-400 to-emerald-400 dark:from-gray-600 dark:via-blue-500 dark:to-emerald-500 z-0 mx-[80px]" />
        
        <div className="relative z-10 flex justify-between items-start gap-4">
          {mainStages.map((stage, index) => {
            const StageIcon = stage.icon;
            const stageActivities = groupedActivities[stage.key];
            const count = stageActivities.length;
            
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center">
                {/* Stage Header */}
                <div className={cn(
                  "w-16 h-16 rounded-full border-2 flex items-center justify-center bg-background shadow-md",
                  stage.color
                )}>
                  <StageIcon className={cn("h-7 w-7", stage.textColor)} />
                </div>
                
                <div className="mt-3 text-center">
                  <p className={cn("text-sm font-semibold", stage.textColor)}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {count} {count === 1 ? 'atividade' : 'atividades'}
                  </p>
                </div>

                {/* Activities List */}
                <div className="mt-4 w-full max-w-[200px] space-y-2">
                  {stageActivities.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      onClick={() => onActivityClick?.(activity)}
                      className={cn(
                        "p-2 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-md",
                        stage.color,
                        "hover:scale-[1.02]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", stage.dotColor)} />
                        <span className="truncate font-medium text-foreground">
                          {activity.name}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stageActivities.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{stageActivities.length - 5} mais
                    </p>
                  )}
                  {stageActivities.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center italic py-2">
                      Nenhuma atividade
                    </p>
                  )}
                </div>

                {/* Arrow between stages */}
                {index < mainStages.length - 1 && (
                  <div className="hidden md:flex absolute top-6 items-center" style={{ left: `${(index + 1) * 33.33 - 2}%` }}>
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancelled Activities (if any) */}
      {hasCancelled && (
        <div className="mt-6 pt-6 border-t border-dashed">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Canceladas ({groupedActivities.cancelada.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {groupedActivities.cancelada.map((activity) => (
              <div
                key={activity.id}
                onClick={() => onActivityClick?.(activity)}
                className="px-3 py-1.5 rounded-lg border bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-xs cursor-pointer hover:shadow-sm transition-all"
              >
                <span className="text-red-600 dark:text-red-400 line-through">
                  {activity.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessFlowDiagram;

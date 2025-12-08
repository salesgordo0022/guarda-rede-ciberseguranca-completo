import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DailyReportDialog } from "@/components/DailyReportDialog";
import { KanbanBoardDialog } from "@/components/KanbanBoardDialog";

interface ActionButtonsProps {
  onCreateTask?: () => void;
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
}

export function ActionButtons({ onCreateTask, date, onDateChange }: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3 animate-fade-in">
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={onCreateTask}
      >
        <Plus className="h-4 w-4 mr-2" />
        Criar Tarefas
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {date ? format(date, "PPP", { locale: ptBR }) : <span>Filtrar data</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <DailyReportDialog />

      <KanbanBoardDialog />
    </div>
  );
}

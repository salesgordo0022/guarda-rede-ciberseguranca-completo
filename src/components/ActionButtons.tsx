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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { ActivityDetailsSheet } from "@/components/ActivityDetailsSheet";
import { FolderPlus, FilePlus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DailyReportDialog } from "@/components/DailyReportDialog";
import { GlobalKanbanDialog } from "@/components/GlobalKanbanDialog";

interface ActionButtonsProps {
  onCreateTask?: () => void;
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
}

export function ActionButtons({ onCreateTask, date, onDateChange }: ActionButtonsProps) {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3 animate-fade-in">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Criar Novo
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setIsCreateProjectOpen(true)} className="cursor-pointer">
            <FolderPlus className="h-4 w-4 mr-2 text-emerald-600" />
            <span>Novo Projeto</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCreateActivityOpen(true)} className="cursor-pointer">
            <FilePlus className="h-4 w-4 mr-2 text-blue-600" />
            <span>Nova Atividade</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
      />

      <ActivityDetailsSheet
        activity={null}
        mode="create"
        open={isCreateActivityOpen}
        onOpenChange={setIsCreateActivityOpen}
      />

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

      <GlobalKanbanDialog />
    </div>
  );
}

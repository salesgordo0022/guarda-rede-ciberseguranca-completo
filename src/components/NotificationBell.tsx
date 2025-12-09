import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

// Componente simplificado de notificações - a tabela notifications não existe ainda
export function NotificationBell() {
  const [notifications] = useState<any[]>([]);
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-10 w-10 rounded-full"
        >
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={10}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
          </div>
        </div>
        
        <ScrollArea className="h-48">
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma notificação
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
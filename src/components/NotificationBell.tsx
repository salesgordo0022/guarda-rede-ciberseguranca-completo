import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, User, MessageSquare, Clock, RefreshCw, Square, CheckSquare, SquareCheckBig, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "assignment":
      return <User className="h-4 w-4 text-blue-500" />;
    case "mention":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "deadline":
      return <Clock className="h-4 w-4 text-orange-500" />;
    case "status_change":
      return <RefreshCw className="h-4 w-4 text-purple-500" />;
    case "activity_completed":
      return <Check className="h-4 w-4 text-emerald-500" />;
    case "activity_created":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationTypeBadge = (type: string) => {
  switch (type) {
    case "assignment":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Atribuição</Badge>;
    case "mention":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Menção</Badge>;
    case "deadline":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Prazo</Badge>;
    case "status_change":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Status</Badge>;
    case "activity_completed":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Concluída</Badge>;
    case "activity_created":
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Nova</Badge>;
    default:
      return null;
  }
};

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  isSelectionMode,
  isSelected,
  onToggleSelect
}: { 
  notification: Notification; 
  onMarkAsRead: () => void;
  onDelete: () => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "p-3 border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors",
        !notification.read && "bg-primary/5 border-l-2 border-l-primary",
        isSelected && "bg-destructive/10"
      )}
    >
      <div className="flex items-start gap-3">
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
        )}
        <div className="mt-1 flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm leading-tight",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </p>
            {getNotificationTypeBadge(notification.type)}
          </div>
          {notification.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {notification.description}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
        {!isSelectionMode && (
          <div className="flex flex-col gap-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead();
                }}
                title="Marcar como lida"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Excluir"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { profile } = useAuth();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllNotifications,
    deleteMultipleNotifications
  } = useNotifications();

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(notifications.map(n => n.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size > 0) {
      deleteMultipleNotifications.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

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
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 shadow-xl" 
        align="end"
        sideOffset={10}
      >
        {/* Header */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Notificações</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions bar */}
          <div className="flex items-center gap-1 flex-wrap">
            {isSelectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectedIds.size === notifications.length ? deselectAll : selectAll}
                >
                  {selectedIds.size === notifications.length ? (
                    <>
                      <Square className="h-3 w-3 mr-1" />
                      Desmarcar
                    </>
                  ) : (
                    <>
                      <SquareCheckBig className="h-3 w-3 mr-1" />
                      Selecionar tudo
                    </>
                  )}
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir ({selectedIds.size})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={exitSelectionMode}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => markAllAsRead.mutate()}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Concluir todas
                  </Button>
                )}
                {notifications.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsSelectionMode(true)}
                      title="Selecionar múltiplas"
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Selecionar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteAllNotifications.mutate()}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpar tudo
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma notificação</p>
              <p className="text-xs mt-1">Você está em dia!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead.mutate(notification.id)}
                  onDelete={() => deleteNotification.mutate(notification.id)}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.has(notification.id)}
                  onToggleSelect={() => toggleSelect(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
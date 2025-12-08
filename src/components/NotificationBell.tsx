import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "task_created" | "task_completed" | "task_assigned" | "deadline_approaching" | "comment_added";
  created_by: string;
  created_for: string;
  task_id?: string;
  project_id?: string;
  read: boolean;
  created_at: string;
  user_full_name?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "task_created":
      return "➕";
    case "task_completed":
      return "✅";
    case "task_assigned":
      return "👤";
    case "deadline_approaching":
      return "⏰";
    case "comment_added":
      return "💬";
    default:
      return "🔔";
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "task_created":
      return "bg-blue-100 text-blue-800";
    case "task_completed":
      return "bg-green-100 text-green-800";
    case "task_assigned":
      return "bg-purple-100 text-purple-800";
    case "deadline_approaching":
      return "bg-orange-100 text-orange-800";
    case "comment_added":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { profile } = useAuth();

  // Fetch notifications
  const { data: fetchedNotifications = [], refetch } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          creator:created_by(full_name)
        `)
        .eq('created_for', profile?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Map the data to include creator's full name
      const notificationsWithCreator = data.map(notification => ({
        ...notification,
        user_full_name: notification.creator?.full_name || 'Usuário'
      }));
      
      return notificationsWithCreator as Notification[];
    },
    enabled: !!profile?.id
  });

  // Update unread count
  useEffect(() => {
    if (fetchedNotifications.length > 0) {
      setNotifications(fetchedNotifications);
      const unread = fetchedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    }
  }, [fetchedNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      refetch();
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    if (!error) {
      refetch();
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } else {
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }
  };

  return (
    <Dialog>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="relative h-10 w-10 rounded-full"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount}
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
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>
          
          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTrigger asChild>
                          <button 
                            className="text-left w-full"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <p className="text-sm font-medium leading-none">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(notification.created_at)}
                              </span>
                              {!notification.read && (
                                <Badge variant="secondary" className="h-4 text-xs px-1.5">
                                  Novo
                                </Badge>
                              )}
                            </div>
                          </button>
                        </DialogTrigger>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Notificação</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Detalhes completos da notificação seriam mostrados aqui.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
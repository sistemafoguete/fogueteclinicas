import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Bell, Calendar, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface MeetingAlert {
  id: string;
  title: string;
  message: string;
  meeting_date: string;
  meeting_location?: string;
  meeting_room?: string;
  participants: string[];
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Combinar queries de notifications e meeting alerts
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    enabled: !!user?.id,
  });

  const { data: meetingAlerts = [] } = useQuery({
    queryKey: ['meeting-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('meeting_alerts')
        .select('*')
        .contains('participants', [user.id])
        .eq('is_active', true)
        .gte('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data || []) as MeetingAlert[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    enabled: !!user?.id,
  });

  // Configurar realtime para novas reuniões
  useEffect(() => {
    if (!user?.id) return;

    const meetingChannel = supabase
      .channel('meeting_alerts_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meeting_alerts' },
        (payload) => {
          const newMeeting = payload.new as MeetingAlert;
          if (newMeeting.participants?.includes(user.id)) {
            queryClient.invalidateQueries({ queryKey: ['meeting-alerts'] });
            toast({
              title: "Nova Reunião Agendada",
              description: `${newMeeting.title} - ${formatMeetingDate(newMeeting.meeting_date)}`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meeting_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['meeting-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meetingChannel);
    };
  }, [user?.id, queryClient, toast]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      // Silent fail
    }
  };

  const totalUnread = notifications.length + meetingAlerts.length;

  const formatMeetingDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInHours < 48) {
      return `Amanhã às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalUnread === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma notificação nova
              </p>
            ) : (
              <>
                {meetingAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 bg-primary/5 rounded-lg border">
                    <Calendar className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMeetingDate(alert.meeting_date)}
                      </p>
                      {alert.meeting_location && (
                        <p className="text-xs text-muted-foreground">
                          📍 {alert.meeting_location}
                          {alert.meeting_room && ` - ${alert.meeting_room}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {notifications.map(notification => (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 bg-background rounded-lg border">
                    <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Bell, Clock, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TodaySchedule {
  id: string;
  title: string;
  start_time: string;
  clients?: { name: string };
  profiles?: { name: string };
  status: string;
}

export function ScheduleAlerts() {
  const { user } = useAuth();
  const [todaySchedules, setTodaySchedules] = useState<TodaySchedule[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadTodaySchedules();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadTodaySchedules = async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      let query = supabase
        .from('schedules')
        .select(`
          id, title, start_time, status,
          clients (name)
        `)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .in('status', ['scheduled', 'confirmed', 'completed', 'cancelled'])
        .order('start_time');

      // Filter based on user role
      if (userProfile) {
        const isReceptionist = ['receptionist', 'administrative'].includes(userProfile.employee_role);
        const isDirectorOrCoordinator = ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'].includes(userProfile.employee_role);
        
        if (!isDirectorOrCoordinator && !isReceptionist) {
          // Staff members see only their appointments
          query = query.eq('employee_id', user.id);
        }
        // Directors, coordinators and receptionists see all appointments
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTodaySchedules(data || []);
    } catch (error) {
      console.error('Error loading today schedules:', error);
    }
  };

  // Auto refresh every 2 minutes and when userProfile changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && userProfile) {
        loadTodaySchedules();
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [user, userProfile]);

  if (!isVisible || todaySchedules.length === 0) return null;

  const nextAppointment = todaySchedules.find(schedule => {
    const scheduleTime = new Date(schedule.start_time);
    const now = new Date();
    return scheduleTime > now && ['scheduled', 'confirmed'].includes(schedule.status);
  });

  const currentAppointments = todaySchedules.filter(schedule => {
    const scheduleTime = new Date(schedule.start_time);
    const scheduleEnd = new Date(scheduleTime.getTime() + 60 * 60 * 1000); // Assuming 1 hour appointments
    const now = new Date();
    return now >= scheduleTime && now <= scheduleEnd && ['scheduled', 'confirmed'].includes(schedule.status);
  });

  // Calculate different status counts
  const pendingAppointments = todaySchedules.filter(s => ['scheduled', 'confirmed'].includes(s.status));
  const completedAppointments = todaySchedules.filter(s => s.status === 'completed');
  const cancelledAppointments = todaySchedules.filter(s => s.status === 'cancelled');

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-primary">Agendamentos de Hoje</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Current Appointments */}
          {currentAppointments.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <Clock className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-800 mb-2">Atendimentos em Andamento:</div>
                <div className="space-y-1">
                  {currentAppointments.map((schedule) => (
                    <div key={schedule.id} className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3" />
                      <span>{schedule.clients?.name}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{format(new Date(schedule.start_time), 'HH:mm', { locale: ptBR })}</span>
                      <Badge variant="outline" className="text-xs">
                        {schedule.title}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Next Appointment */}
          {nextAppointment && (
            <Alert className="border-blue-200 bg-blue-50">
              <Bell className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="font-medium text-blue-800 mb-2">Próximo Atendimento:</div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3" />
                  <span className="font-medium">{nextAppointment.clients?.name}</span>
                  <span className="text-muted-foreground">às</span>
                  <span className="font-medium">
                    {format(new Date(nextAppointment.start_time), 'HH:mm', { locale: ptBR })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {nextAppointment.title}
                  </Badge>
                   <span className="text-xs text-muted-foreground">
                     Atendimento agendado
                   </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Today's Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{todaySchedules.length}</div>
              <div className="text-xs text-muted-foreground">Total Hoje</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingAppointments.length}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentAppointments.length}</div>
              <div className="text-xs text-muted-foreground">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedAppointments.length}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </div>
          </div>

          {/* Additional Status Information */}
          {cancelledAppointments.length > 0 && (
            <div className="text-center pt-2 border-t">
              <div className="text-sm text-red-600">
                <span className="font-medium">{cancelledAppointments.length}</span> cancelado(s) hoje
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
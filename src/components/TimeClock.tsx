import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, Coffee, Play } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimesheetEntry {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  status: string;
}

export function TimeClock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayTime, setDisplayTime] = useState('');
  const animationRef = useRef<number>();

  // Usar React Query para cache do timesheet
  const { data: currentEntry } = useQuery({
    queryKey: ['timesheet-today', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('employee_timesheet')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as TimesheetEntry | null;
    },
    staleTime: 30 * 1000, // 30 segundos
    enabled: !!user?.id,
  });

  // Atualizar relógio usando requestAnimationFrame para menos re-renders
  useEffect(() => {
    let lastSecond = -1;
    
    const updateClock = () => {
      const now = new Date();
      const currentSecond = now.getSeconds();
      
      // Só atualizar quando o segundo mudar
      if (currentSecond !== lastSecond) {
        lastSecond = currentSecond;
        setCurrentTime(now);
        setDisplayTime(format(now, 'HH:mm:ss'));
      }
      
      animationRef.current = requestAnimationFrame(updateClock);
    };
    
    updateClock();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const calculateTotalHours = (entry: TimesheetEntry): number => {
    if (!entry.clock_in) return 0;
    
    const clockIn = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    
    let totalMinutes = differenceInMinutes(clockOut, clockIn);
    
    if (entry.break_start && entry.break_end) {
      const breakStart = new Date(entry.break_start);
      const breakEnd = new Date(entry.break_end);
      const breakMinutes = differenceInMinutes(breakEnd, breakStart);
      totalMinutes -= breakMinutes;
    }
    
    return totalMinutes / 60;
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('employee_timesheet')
        .insert({
          employee_id: user?.id,
          date: today,
          clock_in: now.toISOString(),
          status: 'pending'
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['timesheet-today'] });
      toast({
        title: "Entrada registrada",
        description: `Ponto batido às ${format(now, 'HH:mm:ss')}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível registrar a entrada."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    try {
      setLoading(true);
      const now = new Date();
      const totalHours = calculateTotalHours({
        ...currentEntry,
        clock_out: now.toISOString()
      });

      const { error } = await supabase
        .from('employee_timesheet')
        .update({
          clock_out: now.toISOString(),
          total_hours: totalHours
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['timesheet-today'] });
      toast({
        title: "Saída registrada",
        description: `Ponto batido às ${format(now, 'HH:mm:ss')}. Total: ${totalHours.toFixed(2)}h`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível registrar a saída."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBreakStart = async () => {
    if (!currentEntry) return;

    try {
      setLoading(true);
      const now = new Date();

      const { error } = await supabase
        .from('employee_timesheet')
        .update({ break_start: now.toISOString() })
        .eq('id', currentEntry.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['timesheet-today'] });
      toast({
        title: "Pausa iniciada",
        description: `Início da pausa às ${format(now, 'HH:mm:ss')}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível iniciar a pausa."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBreakEnd = async () => {
    if (!currentEntry) return;

    try {
      setLoading(true);
      const now = new Date();

      const { error } = await supabase
        .from('employee_timesheet')
        .update({ break_end: now.toISOString() })
        .eq('id', currentEntry.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['timesheet-today'] });
      toast({
        title: "Pausa finalizada",
        description: `Fim da pausa às ${format(now, 'HH:mm:ss')}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível finalizar a pausa."
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorkingTime = () => {
    if (!currentEntry?.clock_in) return '00:00:00';
    
    const clockIn = new Date(currentEntry.clock_in);
    const now = currentEntry.clock_out ? new Date(currentEntry.clock_out) : currentTime;
    
    let totalMinutes = differenceInMinutes(now, clockIn);
    
    if (currentEntry.break_start) {
      const breakStart = new Date(currentEntry.break_start);
      const breakEnd = currentEntry.break_end ? new Date(currentEntry.break_end) : new Date();
      const breakMinutes = differenceInMinutes(breakEnd, breakStart);
      totalMinutes -= breakMinutes;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  };

  const isOnBreak = currentEntry?.break_start && !currentEntry?.break_end;
  const hasClockIn = !!currentEntry?.clock_in;
  const hasClockOut = !!currentEntry?.clock_out;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ponto Eletrônico
          </div>
          {hasClockIn && !hasClockOut && (
            <Badge variant={isOnBreak ? "secondary" : "default"}>
              {isOnBreak ? 'Em Pausa' : 'Trabalhando'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary font-mono">
            {displayTime || format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {hasClockIn && (
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Tempo trabalhado hoje</div>
            <div className="text-2xl font-bold font-mono">{getWorkingTime()}</div>
          </div>
        )}

        {currentEntry && (
          <div className="space-y-2 text-sm">
            {currentEntry.clock_in && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Entrada:</span>
                <span className="font-medium">{format(new Date(currentEntry.clock_in), 'HH:mm:ss')}</span>
              </div>
            )}
            {currentEntry.break_start && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Início Pausa:</span>
                <span className="font-medium">{format(new Date(currentEntry.break_start), 'HH:mm:ss')}</span>
              </div>
            )}
            {currentEntry.break_end && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Fim Pausa:</span>
                <span className="font-medium">{format(new Date(currentEntry.break_end), 'HH:mm:ss')}</span>
              </div>
            )}
            {currentEntry.clock_out && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Saída:</span>
                <span className="font-medium">{format(new Date(currentEntry.clock_out), 'HH:mm:ss')}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {!hasClockIn && (
            <Button onClick={handleClockIn} disabled={loading} className="w-full" size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              Registrar Entrada
            </Button>
          )}

          {hasClockIn && !hasClockOut && (
            <>
              {!currentEntry?.break_start && (
                <Button onClick={handleBreakStart} disabled={loading} variant="outline" className="w-full">
                  <Coffee className="mr-2 h-4 w-4" />
                  Iniciar Pausa
                </Button>
              )}

              {currentEntry?.break_start && !currentEntry?.break_end && (
                <Button onClick={handleBreakEnd} disabled={loading} variant="outline" className="w-full">
                  <Play className="mr-2 h-4 w-4" />
                  Finalizar Pausa
                </Button>
              )}

              <Button onClick={handleClockOut} disabled={loading || isOnBreak} variant="default" className="w-full" size="lg">
                <LogOut className="mr-2 h-4 w-4" />
                Registrar Saída
              </Button>
            </>
          )}

          {hasClockOut && (
            <div className="text-center py-4">
              <Badge variant="outline" className="text-base px-4 py-2">
                Ponto do dia finalizado
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Total trabalhado: {currentEntry?.total_hours?.toFixed(2)}h
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

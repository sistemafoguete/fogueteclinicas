import { useState, useEffect } from 'react';
import { TimeClock } from '@/components/TimeClock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar, Timer, TrendingUp, History } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimesheetEntry {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
}

export default function Timesheet() {
  const { user } = useAuth();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Buscar histórico de ponto do mês
  const { data: monthEntries = [], isLoading } = useQuery({
    queryKey: ['timesheet-month', user?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('employee_timesheet')
        .select('*')
        .eq('employee_id', user.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as TimesheetEntry[];
    },
    staleTime: 60 * 1000,
    enabled: !!user?.id,
  });

  // Calcular estatísticas
  const weekEntries = monthEntries.filter(e => {
    const date = parseISO(e.date);
    return date >= weekStart && date <= weekEnd;
  });

  const totalHoursMonth = monthEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
  const totalHoursWeek = weekEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
  const daysWorkedMonth = monthEntries.filter(e => e.clock_in && e.clock_out).length;

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-6">
      {/* Header moderno com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Ponto Eletrônico</h1>
              <p className="text-orange-100 mt-1">
                Registre sua entrada, pausas e saída
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="text-lg font-medium">
              {format(today, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 dark:bg-blue-800/20 rounded-full -translate-y-16 translate-x-16" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Horas Hoje</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {monthEntries.find(e => e.date === format(today, 'yyyy-MM-dd'))?.total_hours?.toFixed(1) || '0.0'}h
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-200/50 dark:bg-blue-800/50">
                <Timer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -translate-y-16 translate-x-16" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Horas Semana</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {totalHoursWeek.toFixed(1)}h
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-200/50 dark:bg-green-800/50">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 dark:bg-purple-800/20 rounded-full -translate-y-16 translate-x-16" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Horas Mês</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {totalHoursMonth.toFixed(1)}h
                </p>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                  {daysWorkedMonth} dias trabalhados
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-200/50 dark:bg-purple-800/50">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relógio de Ponto */}
        <TimeClock />

        {/* Histórico Recente */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-gray-600" />
              Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : monthEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado este mês</p>
              </div>
            ) : (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {monthEntries.slice(0, 10).map((entry) => (
                  <div 
                    key={entry.id} 
                    className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(parseISO(entry.date), "EEEE, dd/MM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.clock_in && format(parseISO(entry.clock_in), 'HH:mm')}
                          {entry.clock_out && ` - ${format(parseISO(entry.clock_out), 'HH:mm')}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {entry.total_hours !== null ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400">
                          {entry.total_hours.toFixed(1)}h
                        </Badge>
                      ) : entry.clock_in && !entry.clock_out ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          Em andamento
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Hook para pré-carregar dados críticos do sistema após login
 * Isso melhora significativamente a performance da navegação
 */
export const useAppPreload = () => {
  const queryClient = useQueryClient();

  const preloadCriticalData = async (userId: string, userRole: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');

    const isDirector = userRole === 'director';
    const isCoordinator = userRole?.startsWith('coordinator');
    const isManager = isDirector || isCoordinator;

    // Execute all prefetch operations in parallel for maximum speed
    const prefetchPromises: Promise<void>[] = [];

    // 1. Perfil do usuário (crítico - alta prioridade)
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['user-profile', userId],
        queryFn: async () => {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, id, name, employee_role, department, unit, avatar_url, is_active, phone, email')
            .eq('user_id', userId)
            .single();
          return data;
        },
        staleTime: 5 * 60 * 1000,
      })
    );

    // 2. Ponto eletrônico de hoje
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['timesheet-today', userId],
        queryFn: async () => {
          const { data } = await supabase
            .from('employee_timesheet')
            .select('id, clock_in, clock_out, break_start, break_end, status, total_hours')
            .eq('employee_id', userId)
            .eq('date', today)
            .maybeSingle();
          return data;
        },
        staleTime: 30 * 1000,
      })
    );

    // 3. Pacientes vinculados (seleção otimizada)
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['my-clients', userId],
        queryFn: async () => {
          if (isManager) {
            const { data } = await supabase
              .from('clients')
              .select('id, name, cpf, phone, unit, is_active, birth_date')
              .eq('is_active', true)
              .order('name')
              .limit(50);
            return data || [];
          }
          
          const { data: assignments } = await supabase
            .from('client_assignments')
            .select('client_id')
            .eq('employee_id', userId)
            .eq('is_active', true);
          
          if (!assignments?.length) return [];
          
          const clientIds = assignments.map(a => a.client_id).filter(Boolean);
          const { data: clients } = await supabase
            .from('clients')
            .select('id, name, cpf, phone, unit, is_active, birth_date')
            .in('id', clientIds)
            .eq('is_active', true)
            .order('name');
          
          return clients || [];
        },
        staleTime: 2 * 60 * 1000,
      })
    );

    // 4. Agendamentos da semana (seleção otimizada)
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['schedules-week', weekStart, weekEnd, userId],
        queryFn: async () => {
          let query = supabase
            .from('schedules')
            .select('id, client_id, employee_id, schedule_date, start_time, end_time, status, unit, service_type')
            .gte('schedule_date', weekStart)
            .lte('schedule_date', weekEnd)
            .order('schedule_date')
            .order('start_time');

          if (!isManager) {
            query = query.eq('employee_id', userId);
          }

          const { data } = await query.limit(100);
          return data || [];
        },
        staleTime: 60 * 1000,
      })
    );

    // 5. Notificações não lidas
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['notifications-unread', userId],
        queryFn: async () => {
          const { data } = await supabase
            .from('appointment_notifications')
            .select('id, title, message, notification_type, is_read, created_at')
            .eq('employee_id', userId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);
          return data || [];
        },
        staleTime: 30 * 1000,
      })
    );

    // 6. Dados para coordenadores e diretores
    if (isManager) {
      // Lista de funcionários
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['employees-list'],
          queryFn: async () => {
            const { data } = await supabase
              .from('profiles')
              .select('user_id, name, employee_role, unit, is_active, department')
              .eq('is_active', true)
              .not('employee_role', 'is', null)
              .order('name')
              .limit(100);
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        })
      );

      // Atendimentos pendentes de validação
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['pending-validations'],
          queryFn: async () => {
            const { count } = await supabase
              .from('attendance_reports')
              .select('id', { count: 'exact', head: true })
              .eq('validation_status', 'pending_validation');
            return count || 0;
          },
          staleTime: 60 * 1000,
        })
      );
    }

    // 7. Permissões customizadas
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['custom-permissions', userId],
        queryFn: async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('permissions')
            .eq('user_id', userId)
            .single();
          return profile?.permissions || {};
        },
        staleTime: 10 * 60 * 1000,
      })
    );

    // Execute all prefetches in parallel
    try {
      await Promise.allSettled(prefetchPromises);
      console.log('✅ Dados críticos pré-carregados com sucesso');
    } catch (error) {
      console.warn('⚠️ Alguns dados não puderam ser pré-carregados:', error);
    }
  };

  return { preloadCriticalData };
};

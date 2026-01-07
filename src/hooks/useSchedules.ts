import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ScheduleFilters {
  status?: string;
  employeeId?: string;
  clientId?: string;
  viewMode?: 'day' | 'week';
}

/**
 * Hook otimizado para carregar agendamentos com cache e permissões
 */
export const useSchedules = (date: Date, userProfile?: any, filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: ['schedules', format(date, 'yyyy-MM-dd'), userProfile?.user_id, filters],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (filters?.viewMode === 'week') {
        // Calcular início e fim da semana (segunda a domingo)
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para segunda-feira
        startDate = new Date(date);
        startDate.setDate(date.getDate() + diff);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      }

      let query = supabase
        .from('schedules')
        .select(`
          *,
          patient_arrived,
          arrived_at,
          arrived_confirmed_by,
          clients (id, name, phone, cpf, email, unit),
          profiles (id, name, employee_role, phone, unit)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .in('status', ['scheduled', 'confirmed', 'completed', 'cancelled', 'pending_validation'])
        .order('start_time');

      // Aplicar filtros de permissão baseados no role
      if (userProfile) {
        if (userProfile.employee_role === 'coordinator_madre') {
          const { data: clientsInUnit } = await supabase
            .from('clients')
            .select('id')
            .or('unit.eq.madre,unit.is.null')
            .eq('is_active', true);
          const clientIds = clientsInUnit?.map(c => c.id) || [];
          if (clientIds.length > 0) query = query.in('client_id', clientIds);
        } else if (userProfile.employee_role === 'coordinator_floresta') {
          const { data: clientsInUnit } = await supabase
            .from('clients')
            .select('id')
            .eq('unit', 'floresta')
            .eq('is_active', true);
          const clientIds = clientsInUnit?.map(c => c.id) || [];
          if (clientIds.length > 0) query = query.in('client_id', clientIds);
        } else if (userProfile.employee_role === 'receptionist') {
          const userUnit = userProfile.unit || 'madre';
          const { data: clientsInUnit } = await supabase
            .from('clients')
            .select('id')
            .eq('unit', userUnit)
            .eq('is_active', true);
          const clientIds = clientsInUnit?.map(c => c.id) || [];
          if (clientIds.length > 0) query = query.in('client_id', clientIds);
        } else if (userProfile.employee_role !== 'director') {
          query = query.eq('employee_id', userProfile.user_id);
        }
      }

      // Filtros adicionais
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      const { data, error } = await query;
      
      if (error) {
        // Fallback sem profiles se houver erro
        const fallbackQuery = supabase
          .from('schedules')
          .select(`*, clients (name)`)
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString())
          .in('status', ['scheduled', 'confirmed', 'completed', 'cancelled', 'pending_validation'])
          .order('start_time');

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;

        return fallbackData || [];
      }
      
      return data || [];
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!userProfile,
  });
};

/**
 * Hook para criar agendamento
 */
export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scheduleData: any) => {
      const { data, error } = await supabase
        .from('schedules')
        .insert([scheduleData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

/**
 * Hook para atualizar agendamento
 */
export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: updated, error } = await supabase
        .from('schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

/**
 * Hook para deletar agendamento
 */
export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

/**
 * Hook para carregar agendamentos do dia atual
 */
export const useTodaySchedules = (userProfile?: any) => {
  return useQuery({
    queryKey: ['schedules', 'today', userProfile?.user_id],
    queryFn: async () => {
      if (!userProfile) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let query = supabase
        .from('schedules')
        .select(`
          id,
          title,
          start_time,
          status,
          clients (name),
          profiles (name)
        `)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time');

      if (userProfile.employee_role === 'staff') {
        query = query.eq('employee_id', userProfile.user_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!userProfile,
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * Hook otimizado para carregar estatísticas do dashboard com batch queries
 */
export const useDashboardStats = (userProfile?: any) => {
  return useQuery({
    queryKey: ['dashboard', 'stats', userProfile?.user_id, userProfile?.employee_role],
    queryFn: async () => {
      if (!userProfile) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const isDirector = userProfile.employee_role === 'director';
      const isCoordinator = userProfile.employee_role === 'coordinator_madre' || 
                          userProfile.employee_role === 'coordinator_floresta' ||
                          userProfile.employee_role === 'coordinator_atendimento_floresta';
      const isStaff = !isDirector && !isCoordinator;

      // Batch de queries em paralelo usando Promise.all
      const [
        clientsResult,
        todaySchedulesResult,
        monthlyRevenueResult,
        employeesResult
      ] = await Promise.all([
        // Total de clientes
        (async () => {
          if (isStaff) {
            // Staff: apenas clientes vinculados
            const { count } = await supabase
              .from('client_assignments')
              .select('client_id', { count: 'exact', head: true })
              .eq('employee_id', userProfile.user_id)
              .eq('is_active', true);
            return count || 0;
          } else {
            // Director/Coordinator: todos os clientes
            const { count } = await supabase
              .from('clients')
              .select('id', { count: 'exact', head: true })
              .eq('is_active', true);
            return count || 0;
          }
        })(),

        // Agendamentos de hoje
        (async () => {
          let query = supabase
            .from('schedules')
            .select('id', { count: 'exact', head: true })
            .gte('start_time', today.toISOString())
            .lt('start_time', tomorrow.toISOString());

          if (isStaff) {
            query = query.eq('employee_id', userProfile.user_id);
          }

          const { count } = await query;
          return count || 0;
        })(),

        // Receita mensal (apenas para director/coordinator)
        (async () => {
          if (isStaff) return 0;

          const [financialRecords, clientPayments, automaticRecords] = await Promise.all([
            supabase
              .from('financial_records')
              .select('amount')
              .eq('type', 'income')
              .gte('date', monthStart.toISOString().split('T')[0])
              .lte('date', monthEnd.toISOString().split('T')[0]),
            supabase
              .from('client_payments')
              .select('amount_paid')
              .gte('created_at', monthStart.toISOString())
              .lte('created_at', monthEnd.toISOString()),
            supabase
              .from('automatic_financial_records')
              .select('amount')
              .eq('transaction_type', 'income')
              .gte('payment_date', monthStart.toISOString())
              .lte('payment_date', monthEnd.toISOString())
          ]);

          const total = 
            (financialRecords.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0) +
            (clientPayments.data?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0) +
            (automaticRecords.data?.reduce((sum, a) => sum + Number(a.amount), 0) || 0);

          return total;
        })(),

        // Total de funcionários (apenas para director/coordinator)
        (async () => {
          if (isStaff) return 0;

          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .not('employee_role', 'is', null)
            .eq('is_active', true);
          return count || 0;
        })()
      ]);

      return {
        totalClients: clientsResult,
        todayAppointments: todaySchedulesResult,
        monthlyRevenue: monthlyRevenueResult,
        totalEmployees: employeesResult,
      };
    },
    staleTime: 60000, // 1 minuto
    enabled: !!userProfile,
  });
};

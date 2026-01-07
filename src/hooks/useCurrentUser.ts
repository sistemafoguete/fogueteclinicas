import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { EmployeeRole } from './useRolePermissions';

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  employee_role: EmployeeRole | null;
  phone: string | null;
  document_cpf: string | null;
  is_active: boolean | null;
  hire_date: string | null;
  department: string | null;
  unit: string | null;
  address: string | null;
  birth_date: string | null;
  document_rg: string | null;
  salary: number | null;
  permissions: any | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook centralizado para carregar perfil do usuário atual
 * Usa React Query para cache automático e compartilhamento entre componentes
 * staleTime: 5 minutos - evita re-fetches desnecessários
 */
export const useCurrentUser = () => {
  const { user } = useAuth();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos de cache
    enabled: !!user?.id,
  });

  return {
    profile,
    loading: isLoading,
    error,
    refetch,
    // Helpers convenientes
    userName: profile?.name || user?.email || '',
    userRole: profile?.employee_role,
    userUnit: profile?.unit,
    isActive: profile?.is_active ?? false,
    avatarUrl: profile?.avatar_url || null,
  };
};

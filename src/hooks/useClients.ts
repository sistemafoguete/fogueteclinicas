import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientFilters {
  unit?: string;
  isActive?: boolean;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// Colunas otimizadas para listagem (evita carregar campos grandes)
const LIST_COLUMNS = 'id, name, cpf, phone, email, unit, is_active, birth_date, created_at';

// Colunas completas para detalhes
const DETAIL_COLUMNS = '*';

/**
 * Hook otimizado para carregar clientes com cache e filtros
 * Usa select específico para reduzir payload
 */
export const useClients = (filters?: ClientFilters) => {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(LIST_COLUMNS)
        .order('name');

      if (filters?.unit) {
        query = query.eq('unit', filters.unit);
      }
      
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.searchTerm) {
        query = query.or(
          `name.ilike.%${filters.searchTerm}%,cpf.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`
        );
      }

      // Paginação para listas grandes
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache válido por 1 minuto
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000, // Mantém em cache por 5 minutos
  });
};

/**
 * Hook para carregar detalhes completos de um cliente
 */
export const useClientDetails = (clientId: string | null) => {
  return useQuery({
    queryKey: ['client-details', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select(DETAIL_COLUMNS)
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
    staleTime: 30000,
  });
};

/**
 * Hook para contagem de clientes (mais rápido que carregar todos)
 */
export const useClientsCount = (unit?: string) => {
  return useQuery({
    queryKey: ['clients', 'count', unit],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (unit) {
        query = query.eq('unit', unit);
      }

      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    },
    staleTime: 300000, // 5 minutos
  });
};


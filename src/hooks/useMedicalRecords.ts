import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MedicalRecord {
  id: string;
  client_id: string;
  employee_id: string;
  session_date: string;
  session_type: string;
  session_duration?: number;
  progress_notes: string;
  treatment_plan?: string;
  symptoms?: string;
  vital_signs?: any;
  medications?: any[];
  attachments?: any[];
  status?: string;
  next_appointment_notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    employee_role: string;
  };
}

/**
 * Hook para carregar prontuários de um paciente específico
 */
export const useMedicalRecords = (clientId: string | null) => {
  return useQuery({
    queryKey: ['medical-records', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // Carregar medical records
      const { data: records, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false });
      
      if (error) throw error;
      if (!records || records.length === 0) return [];

      // Carregar profiles dos funcionários
      const employeeIds = [...new Set(records.map(r => r.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, employee_role')
        .in('user_id', employeeIds);

      // Combinar dados
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return records.map(record => ({
        ...record,
        profiles: profilesMap.get(record.employee_id)
      })) as MedicalRecord[];
    },
    enabled: !!clientId,
    staleTime: 30000, // 30 segundos
  });
};

/**
 * Hook para criar novo registro no prontuário
 */
export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', variables.client_id] });
      toast({
        title: 'Sucesso',
        description: 'Registro adicionado ao prontuário',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o registro',
        variant: 'destructive',
      });
      console.error('Error creating medical record:', error);
    },
  });
};

/**
 * Hook para atualizar registro do prontuário
 */
export const useUpdateMedicalRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MedicalRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', data.client_id] });
      toast({
        title: 'Sucesso',
        description: 'Registro atualizado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o registro',
        variant: 'destructive',
      });
      console.error('Error updating medical record:', error);
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  client_id: string;
  employee_id: string;
  schedule_id?: string;
  prescription_date: string;
  medications: Medication[];
  diagnosis?: string;
  general_instructions?: string;
  follow_up_notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  employee?: { name: string; employee_role: string };
}

export const usePrescriptions = (clientId: string | null) => {
  return useQuery({
    queryKey: ['prescriptions', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('client_id', clientId)
        .order('prescription_date', { ascending: false });

      if (error) throw error;

      // Fetch employee profiles
      if (data && data.length > 0) {
        const employeeIds = [...new Set(data.map(p => p.employee_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, employee_role')
          .in('user_id', employeeIds);

        return data.map(prescription => ({
          ...prescription,
          medications: (prescription.medications as unknown as Medication[]) || [],
          employee: profiles?.find(p => p.user_id === prescription.employee_id)
        })) as Prescription[];
      }

      return [] as Prescription[];
    },
    enabled: !!clientId
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prescription: Omit<Prescription, 'id' | 'created_at' | 'updated_at' | 'employee'>) => {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert([{
          client_id: prescription.client_id,
          employee_id: prescription.employee_id,
          schedule_id: prescription.schedule_id || null,
          prescription_date: prescription.prescription_date,
          medications: JSON.parse(JSON.stringify(prescription.medications)),
          diagnosis: prescription.diagnosis || null,
          general_instructions: prescription.general_instructions || null,
          follow_up_notes: prescription.follow_up_notes || null,
          status: prescription.status || 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', variables.client_id] });
      toast({
        title: 'Sucesso',
        description: 'Receita criada com sucesso!'
      });
    },
    onError: (error) => {
      console.error('Error creating prescription:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar a receita.'
      });
    }
  });
};

export const useUpdatePrescription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId, ...updates }: { id: string; clientId: string } & Partial<Prescription>) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.prescription_date) updateData.prescription_date = updates.prescription_date;
      if (updates.diagnosis !== undefined) updateData.diagnosis = updates.diagnosis;
      if (updates.general_instructions !== undefined) updateData.general_instructions = updates.general_instructions;
      if (updates.follow_up_notes !== undefined) updateData.follow_up_notes = updates.follow_up_notes;
      if (updates.status) updateData.status = updates.status;
      if (updates.medications) updateData.medications = JSON.parse(JSON.stringify(updates.medications));

      const { data, error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', result.clientId] });
      toast({
        title: 'Sucesso',
        description: 'Receita atualizada com sucesso!'
      });
    },
    onError: (error) => {
      console.error('Error updating prescription:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a receita.'
      });
    }
  });
};

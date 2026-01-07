import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogData {
  entityType: string;
  entityId?: string;
  action: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = useCallback(async (data: AuditLogData) => {
    if (!user) return;

    try {
      console.log('📝 Salvando log de auditoria:', {
        user_id: user.id,
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
      });

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          entity_type: data.entityType,
          entity_id: data.entityId || null,
          action: data.action,
          old_data: data.oldData || null,
          new_data: data.newData || null,
          metadata: data.metadata || {},
        });

      if (error) {
        console.error('❌ Erro ao salvar log de auditoria:', error);
        throw error;
      }

      console.log('✅ Log de auditoria salvo com sucesso');
    } catch (error) {
      console.error('Erro inesperado ao registrar ação de auditoria:', error);
    }
  }, [user]);

  return { logAction };
};
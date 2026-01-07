import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  old_data?: any;
  new_data?: any;
  metadata?: any;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

export class AuditService {
  static async logAction(data: {
    entityType: string;
    entityId?: string;
    action: string;
    oldData?: any;
    newData?: any;
    metadata?: any;
  }) {
    try {
      const auditData = {
        entity_type: data.entityType,
        entity_id: data.entityId || null,
        action: data.action,
        old_data: data.oldData || null,
        new_data: data.newData || null,
        metadata: {
          ...data.metadata,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        },
        ip_address: null, // Will be set by trigger if needed
      };

      // Log to console for debugging
      console.log('Audit Service Log:', auditData);

      // Save to database
      const { error } = await supabase
        .from('audit_logs')
        .insert(auditData);

      if (error) {
        console.error('Error saving audit log:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error logging audit action:', error);
    }
  }

  static async getUserAuditLogs(userId?: string, limit = 100): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      return [];
    }
  }

  static async getEntityAuditLogs(entityType: string, entityId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      return [];
    }
  }

  // Update user session activity
  static async updateUserActivity() {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (currentUser?.user) {
        // First, deactivate any existing active sessions for this user
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', currentUser.user.id)
          .eq('is_active', true);

        // Then insert a new active session
        const { error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: currentUser.user.id,
            session_token: `session_${currentUser.user.id}_${Date.now()}`,
            last_activity: new Date().toISOString(),
            is_active: true,
            user_agent: navigator.userAgent
          });

        if (error) {
          console.error('Error updating user activity:', error);
        }
      }
    } catch (error) {
      console.error('Unexpected error updating user activity:', error);
    }
  }
}
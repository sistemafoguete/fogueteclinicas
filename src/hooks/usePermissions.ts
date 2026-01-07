import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export type Permission = 
  | 'view_clients' | 'create_clients' | 'edit_clients' | 'delete_clients'
  | 'view_employees' | 'create_employees' | 'edit_employees' | 'delete_employees'
  | 'view_financial' | 'create_financial' | 'edit_financial' | 'delete_financial'
  | 'view_schedules' | 'create_schedules' | 'edit_schedules' | 'delete_schedules'
  | 'view_stock' | 'create_stock' | 'edit_stock' | 'delete_stock'
  | 'view_reports' | 'create_reports' | 'edit_reports' | 'delete_reports'
  | 'view_documents' | 'create_documents' | 'edit_documents' | 'delete_documents'
  | 'manage_roles' | 'manage_permissions' | 'view_audit_logs' | 'system_admin';

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_permissions');
        
        if (error) {
          console.error('Erro ao buscar permissões:', error);
          setPermissions([]);
        } else {
          setPermissions(data?.map((row: any) => row.permission) || []);
        }
      } catch (error) {
        console.error('Erro inesperado ao buscar permissões:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const canManageUsers = (): boolean => {
    return hasAnyPermission(['manage_roles', 'system_admin', 'view_employees']);
  };

  const canManageClients = (): boolean => {
    return hasAnyPermission(['create_clients', 'edit_clients', 'delete_clients']);
  };

  const canViewFinancial = (): boolean => {
    return hasPermission('view_financial');
  };

  const canManageFinancial = (): boolean => {
    return hasAnyPermission(['create_financial', 'edit_financial', 'delete_financial']);
  };

  const isAdmin = (): boolean => {
    return hasPermission('system_admin');
  };

  const isDirector = (): boolean => {
    return hasPermission('system_admin') || hasPermission('manage_roles');
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    canManageUsers,
    canManageClients,
    canViewFinancial,
    canManageFinancial,
    isAdmin,
    isDirector,
  };
};
import { supabase } from '@/integrations/supabase/client';
import { Permission } from '@/hooks/usePermissions';

type EmployeeRole = 
  | 'director' 
  | 'coordinator_madre' 
  | 'coordinator_floresta' 
  | 'coordinator_atendimento_floresta'
  | 'staff' 
  | 'intern' 
  | 'terapeuta_ocupacional'
  | 'terapeuta_ocupacional_integracao'
  | 'psiquiatra'
  | 'neuropediatra'
  | 'advogada'
  | 'musictherapist' 
  | 'financeiro' 
  | 'receptionist' 
  | 'psychologist' 
  | 'psychopedagogue' 
  | 'speech_therapist' 
  | 'nutritionist' 
  | 'physiotherapist';

export class PermissionService {
  /**
   * Verifica se o usuário atual tem uma permissão específica
   */
  static async checkUserPermission(permission: Permission): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        required_permission: permission
      });

      if (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Erro inesperado ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Obtém todas as permissões do usuário atual
   */
  static async getUserPermissions(): Promise<Permission[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions');

      if (error) {
        console.error('Erro ao buscar permissões do usuário:', error);
        return [];
      }

      return data?.map((row: any) => row.permission) || [];
    } catch (error) {
      console.error('Erro inesperado ao buscar permissões:', error);
      return [];
    }
  }

  /**
   * Obtém permissões por cargo
   */
  static async getPermissionsByRole(role: EmployeeRole) {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission, granted')
        .eq('employee_role', role as any);

      if (error) {
        console.error('Erro ao buscar permissões do cargo:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro inesperado ao buscar permissões do cargo:', error);
      return [];
    }
  }

  /**
   * Atualiza permissões de um cargo (apenas diretores)
   */
  static async updateRolePermissions(role: EmployeeRole, permissions: { permission: Permission; granted: boolean }[]) {
    try {
      // Primeiro verifica se o usuário tem permissão para gerenciar roles
      const canManage = await this.checkUserPermission('manage_permissions');
      if (!canManage) {
        throw new Error('Sem permissão para gerenciar permissões');
      }

      // Remove permissões existentes do cargo
      await supabase
        .from('role_permissions')
        .delete()
        .eq('employee_role', role as any);

      // Insere as novas permissões
      const { error } = await supabase
        .from('role_permissions')
        .insert(
          permissions.map(p => ({
            employee_role: role as any,
            permission: p.permission,
            granted: p.granted
          }))
        );

      if (error) {
        console.error('Erro ao atualizar permissões:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar permissões do cargo:', error);
      throw error;
    }
  }

  /**
   * Lista todos os cargos disponíveis
   */
  static getAvailableRoles(): { value: EmployeeRole; label: string }[] {
    return [
      { value: 'director', label: 'Diretor(a)' },
      { value: 'coordinator_madre', label: 'Coordenador(a) Madre' },
      { value: 'coordinator_floresta', label: 'Coordenador(a) Floresta' },
      { value: 'coordinator_atendimento_floresta', label: 'Coordenador(a) Atendimento Floresta' },
      { value: 'staff', label: 'Funcionário(a) Geral' },
      { value: 'intern', label: 'Estagiário(a)' },
      { value: 'terapeuta_ocupacional', label: 'Terapeuta Ocupacional' },
      { value: 'terapeuta_ocupacional_integracao', label: 'Terapeuta Ocupacional - Integração Sensorial' },
      { value: 'psiquiatra', label: 'Psiquiatra' },
      { value: 'neuropediatra', label: 'Neuropediatra' },
      { value: 'advogada', label: 'Advogada' },
      { value: 'musictherapist', label: 'Musicoterapeuta' },
      { value: 'financeiro', label: 'Financeiro' },
      { value: 'receptionist', label: 'Recepcionista' },
      { value: 'psychologist', label: 'Psicólogo(a)' },
      { value: 'psychopedagogue', label: 'Psicopedagogo(a)' },
      { value: 'speech_therapist', label: 'Fonoaudiólogo(a)' },
      { value: 'nutritionist', label: 'Nutricionista' },
      { value: 'physiotherapist', label: 'Fisioterapeuta' }
    ];
  }

  /**
   * Lista todas as permissões disponíveis
   */
  static getAvailablePermissions(): { permission: Permission; label: string; category: string }[] {
    return [
      // Clientes
      { permission: 'view_clients', label: 'Visualizar Clientes', category: 'Clientes' },
      { permission: 'create_clients', label: 'Criar Clientes', category: 'Clientes' },
      { permission: 'edit_clients', label: 'Editar Clientes', category: 'Clientes' },
      { permission: 'delete_clients', label: 'Excluir Clientes', category: 'Clientes' },
      
      // Funcionários
      { permission: 'view_employees', label: 'Visualizar Funcionários', category: 'Funcionários' },
      { permission: 'create_employees', label: 'Criar Funcionários', category: 'Funcionários' },
      { permission: 'edit_employees', label: 'Editar Funcionários', category: 'Funcionários' },
      { permission: 'delete_employees', label: 'Excluir Funcionários', category: 'Funcionários' },
      
      // Financeiro
      { permission: 'view_financial', label: 'Visualizar Financeiro', category: 'Financeiro' },
      { permission: 'create_financial', label: 'Criar Registros Financeiros', category: 'Financeiro' },
      { permission: 'edit_financial', label: 'Editar Registros Financeiros', category: 'Financeiro' },
      { permission: 'delete_financial', label: 'Excluir Registros Financeiros', category: 'Financeiro' },
      
      // Agendamentos
      { permission: 'view_schedules', label: 'Visualizar Agendamentos', category: 'Agendamentos' },
      { permission: 'create_schedules', label: 'Criar Agendamentos', category: 'Agendamentos' },
      { permission: 'edit_schedules', label: 'Editar Agendamentos', category: 'Agendamentos' },
      { permission: 'delete_schedules', label: 'Excluir Agendamentos', category: 'Agendamentos' },
      
      // Estoque
      { permission: 'view_stock', label: 'Visualizar Estoque', category: 'Estoque' },
      { permission: 'create_stock', label: 'Criar Itens de Estoque', category: 'Estoque' },
      { permission: 'edit_stock', label: 'Editar Itens de Estoque', category: 'Estoque' },
      { permission: 'delete_stock', label: 'Excluir Itens de Estoque', category: 'Estoque' },
      
      // Relatórios
      { permission: 'view_reports', label: 'Visualizar Relatórios', category: 'Relatórios' },
      { permission: 'create_reports', label: 'Criar Relatórios', category: 'Relatórios' },
      { permission: 'edit_reports', label: 'Editar Relatórios', category: 'Relatórios' },
      { permission: 'delete_reports', label: 'Excluir Relatórios', category: 'Relatórios' },
      
      // Documentos
      { permission: 'view_documents', label: 'Visualizar Documentos', category: 'Documentos' },
      { permission: 'create_documents', label: 'Criar Documentos', category: 'Documentos' },
      { permission: 'edit_documents', label: 'Editar Documentos', category: 'Documentos' },
      { permission: 'delete_documents', label: 'Excluir Documentos', category: 'Documentos' },
      
      // Administração
      { permission: 'manage_roles', label: 'Gerenciar Cargos', category: 'Administração' },
      { permission: 'manage_permissions', label: 'Gerenciar Permissões', category: 'Administração' },
      { permission: 'view_audit_logs', label: 'Visualizar Logs de Auditoria', category: 'Administração' },
      { permission: 'system_admin', label: 'Administrador do Sistema', category: 'Administração' }
    ];
  }
}
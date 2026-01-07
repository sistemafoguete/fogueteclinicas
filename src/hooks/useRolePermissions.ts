import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export type EmployeeRole = 
  | 'director'
  | 'coordinator_madre'
  | 'coordinator_floresta'
  | 'coordinator_atendimento_floresta'
  | 'staff'
  | 'receptionist'
  | 'psychologist'
  | 'psychopedagogue'
  | 'musictherapist'
  | 'speech_therapist'
  | 'nutritionist'
  | 'physiotherapist'
  | 'financeiro'
  | 'intern'
  | 'terapeuta_ocupacional'
  | 'terapeuta_ocupacional_integracao'
  | 'psiquiatra'
  | 'neuropediatra'
  | 'advogada';

// Grupos de permissões definidos
export const ROLE_GROUPS = {
  DIRECTOR_ONLY: ['director'] as EmployeeRole[],
  FINANCE_ONLY: ['financeiro'] as EmployeeRole[],
  DIRECTOR_OR_FINANCE: ['director', 'financeiro'] as EmployeeRole[],
  STOCK_MANAGERS: ['director', 'financeiro', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'] as EmployeeRole[],
  COORDINATOR_AND_HIGHER: ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'] as EmployeeRole[],
  NON_FINANCE_ACCESS: ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta', 'staff', 'intern', 'terapeuta_ocupacional', 'terapeuta_ocupacional_integracao', 'psiquiatra', 'neuropediatra', 'advogada', 'musictherapist', 'receptionist', 'psychologist', 'psychopedagogue', 'speech_therapist', 'nutritionist', 'physiotherapist'] as EmployeeRole[],
  PROFESSIONAL_ROLES: ['staff', 'intern', 'terapeuta_ocupacional', 'terapeuta_ocupacional_integracao', 'psiquiatra', 'neuropediatra', 'advogada', 'musictherapist', 'receptionist', 'psychologist', 'psychopedagogue', 'speech_therapist', 'nutritionist', 'physiotherapist'] as EmployeeRole[],
  ALL_ADMIN_VIEW_CLIENTS_AND_EMPLOYEES: ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta', 'receptionist'] as EmployeeRole[]
};

// Labels para exibição dos cargos
export const ROLE_LABELS: Record<EmployeeRole, string> = {
  director: 'Diretoria',
  coordinator_madre: 'Coordenador(a) Madre',
  coordinator_floresta: 'Coordenador(a) Floresta',
  coordinator_atendimento_floresta: 'Coordenador(a) Atendimento Floresta',
  staff: 'Funcionário(a) Geral',
  receptionist: 'Recepcionista',
  psychologist: 'Psicólogo(a)',
  psychopedagogue: 'Psicopedagogo(a)',
  musictherapist: 'Musicoterapeuta',
  speech_therapist: 'Fonoaudiólogo(a)',
  nutritionist: 'Nutricionista',
  physiotherapist: 'Fisioterapeuta',
  financeiro: 'Financeiro',
  intern: 'Estagiário(a)',
  terapeuta_ocupacional: 'Terapeuta Ocupacional',
  terapeuta_ocupacional_integracao: 'Terapeuta Ocupacional - Integração Sensorial',
  psiquiatra: 'Psiquiatra',
  neuropediatra: 'Neuropediatra',
  advogada: 'Advogada'
};

export const useRolePermissions = () => {
  const { user } = useAuth();

  // Usar React Query com cache de 10 minutos (permissões mudam raramente)
  const { data, isLoading } = useQuery({
    queryKey: ['user-role-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return { role: null, unit: null };

      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role, unit, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data?.is_active) {
        return { role: null, unit: null };
      }

      return { 
        role: data.employee_role as EmployeeRole | null, 
        unit: data.unit as string | null 
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos de cache
    enabled: !!user?.id,
  });

  const userRole = data?.role ?? null;
  const userUnit = data?.unit ?? null;

  // Função para verificar se usuário tem um dos roles permitidos
  const hasAnyRole = (allowedRoles: EmployeeRole[]): boolean => {
    return userRole ? allowedRoles.includes(userRole) : false;
  };

  // Função para verificar se usuário tem role específico
  const hasRole = (role: EmployeeRole): boolean => {
    return userRole === role;
  };

  // DIRECTOR HAS GOD-MODE - ALWAYS RETURNS TRUE FOR EVERYTHING
  const isGodMode = (): boolean => {
    return hasRole('director');
  };

  // Verificações específicas baseadas nos grupos - DIRECTOR SEMPRE TEM ACESSO
  const canViewAllClients = (): boolean => {
    return isGodMode() || hasAnyRole(ROLE_GROUPS.ALL_ADMIN_VIEW_CLIENTS_AND_EMPLOYEES);
  };

  const canAccessFinancial = (): boolean => {
    return isGodMode();
  };

  const canManageStock = (): boolean => {
    return isGodMode() || hasAnyRole(ROLE_GROUPS.STOCK_MANAGERS);
  };

  const canViewAllSchedules = (): boolean => {
    return isGodMode() || hasAnyRole(ROLE_GROUPS.ALL_ADMIN_VIEW_CLIENTS_AND_EMPLOYEES);
  };

  const canManageAllSchedules = (): boolean => {
    return isGodMode() || hasAnyRole(ROLE_GROUPS.COORDINATOR_AND_HIGHER);
  };

  const canManageEmployees = (): boolean => {
    return isGodMode() || hasAnyRole(ROLE_GROUPS.COORDINATOR_AND_HIGHER);
  };

  const canManageUsers = (): boolean => {
    return isGodMode();
  };

  const canViewReports = (): boolean => {
    if (isLoading) return true;
    if (isGodMode()) return true;
    if (hasAnyRole(['coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'])) return true;
    return hasAnyRole([
      'director',
      'coordinator_madre', 
      'coordinator_floresta',
      'financeiro',
      'psychologist',
      'psychopedagogue',
      'speech_therapist',
      'nutritionist',
      'physiotherapist',
      'musictherapist',
      'staff',
      'receptionist'
    ]);
  };

  const canConfigureReports = (): boolean => {
    return isGodMode() || hasAnyRole(['coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta']);
  };

  const canExportData = (): boolean => {
    return isGodMode();
  };

  const isProfessional = (): boolean => {
    return isGodMode() || hasAnyRole(ROLE_GROUPS.PROFESSIONAL_ROLES);
  };

  const isDirector = (): boolean => {
    return hasRole('director');
  };

  const isCoordinator = (): boolean => {
    return hasAnyRole(['coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta']);
  };

  const canViewMyPatients = (): boolean => {
    return isGodMode() || hasAnyRole([...ROLE_GROUPS.PROFESSIONAL_ROLES, 'director']);
  };

  const canCreateClients = (): boolean => {
    return isGodMode() || hasAnyRole(['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta', 'receptionist', 'staff']);
  };

  const canDeleteClients = (): boolean => isGodMode();
  const canEditClients = (): boolean => isGodMode() || hasAnyRole(['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta', 'receptionist']);
  const canDeleteEmployees = (): boolean => isGodMode();
  const canEditEmployees = (): boolean => isGodMode() || hasAnyRole(ROLE_GROUPS.COORDINATOR_AND_HIGHER);
  const canViewAuditLogs = (): boolean => isGodMode();
  const canManageSystemSettings = (): boolean => isGodMode();
  const canAccessAllData = (): boolean => isGodMode();
  const canManagePermissions = (): boolean => isGodMode();
  const canViewSensitiveData = (): boolean => isGodMode();
  const canDeleteAnyRecord = (): boolean => isGodMode();
  const canEditAnyRecord = (): boolean => isGodMode();
  const canCreateAnyRecord = (): boolean => isGodMode();
  const canViewAnyRecord = (): boolean => isGodMode();
  const canManageFinancialRecords = (): boolean => isGodMode() || hasRole('financeiro');
  const canDeleteFinancialRecords = (): boolean => isGodMode();
  const canViewAllMedicalRecords = (): boolean => isGodMode();
  const canEditAllMedicalRecords = (): boolean => isGodMode();
  const canManageAllAssignments = (): boolean => isGodMode();
  const canViewAllMessages = (): boolean => isGodMode();
  const canDeleteAllMessages = (): boolean => isGodMode();
  const canManageAllNotifications = (): boolean => isGodMode();
  const canAccessAllReports = (): boolean => isGodMode();
  const canBypassAllRestrictions = (): boolean => isGodMode();

  return {
    userRole,
    userUnit,
    loading: isLoading,
    hasRole,
    hasAnyRole,
    isGodMode,
    canViewAllClients,
    canAccessFinancial,
    canManageStock,
    canViewAllSchedules,
    canManageEmployees,
    canViewReports,
    canConfigureReports,
    canExportData,
    isProfessional,
    isDirector,
    isCoordinator,
    canViewMyPatients,
    canCreateClients,
    canDeleteClients,
    canEditClients,
    canDeleteEmployees,
    canEditEmployees,
    canViewAuditLogs,
    canManageSystemSettings,
    canAccessAllData,
    canManagePermissions,
    canViewSensitiveData,
    canDeleteAnyRecord,
    canEditAnyRecord,
    canCreateAnyRecord,
    canViewAnyRecord,
    canManageFinancialRecords,
    canDeleteFinancialRecords,
    canViewAllMedicalRecords,
    canEditAllMedicalRecords,
    canManageAllAssignments,
    canViewAllMessages,
    canDeleteAllMessages,
    canManageAllNotifications,
    canAccessAllReports,
    canBypassAllRestrictions,
    canManageUsers,
    canManageAllSchedules,
  };
};

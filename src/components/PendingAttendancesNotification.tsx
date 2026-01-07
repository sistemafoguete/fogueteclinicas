import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function PendingAttendancesNotification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userUnit, setUserUnit] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    if (hasPermission) {
      loadPendingCount();
      // Recarregar a cada 30 segundos
      const interval = setInterval(loadPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [hasPermission, userRole, userUnit]);

  const checkPermissions = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('employee_role, unit')
        .eq('user_id', user.id)
        .single();

      const allowedRoles = ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'];
      const hasRole = profile && allowedRoles.includes(profile.employee_role);
      
      setHasPermission(hasRole);
      setUserRole(profile?.employee_role || null);
      setUserUnit(profile?.unit || null);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      // Diretores veem todos os atendimentos pendentes
      if (userRole === 'director') {
        const { count, error } = await supabase
          .from('attendance_reports')
          .select('*', { count: 'exact', head: true })
          .eq('validation_status', 'pending_validation');

        if (error) throw error;
        setPendingCount(count || 0);
        return;
      }

      // Coordenadores veem apenas atendimentos da sua unidade
      // Precisamos buscar os atendimentos e filtrar pela unidade do schedule
      const { data: attendances, error } = await supabase
        .from('attendance_reports')
        .select(`
          id,
          schedule_id
        `)
        .eq('validation_status', 'pending_validation');

      if (error) throw error;

      if (!attendances || attendances.length === 0) {
        setPendingCount(0);
        return;
      }

      // Buscar as unidades dos schedules relacionados
      const scheduleIds = attendances.map(a => a.schedule_id).filter(Boolean);
      
      if (scheduleIds.length === 0) {
        setPendingCount(0);
        return;
      }

      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, unit')
        .in('id', scheduleIds);

      if (schedulesError) throw schedulesError;

      // Mapear unidade por schedule_id
      const scheduleUnitMap = new Map<string, string>();
      schedules?.forEach(s => {
        if (s.unit) scheduleUnitMap.set(s.id, s.unit);
      });

      // Determinar qual unidade o coordenador gerencia
      let coordinatorUnit: string | null = null;
      
      if (userRole === 'coordinator_madre') {
        coordinatorUnit = 'madre';
      } else if (userRole === 'coordinator_floresta') {
        coordinatorUnit = 'floresta';
      } else if (userRole === 'coordinator_atendimento_floresta') {
        coordinatorUnit = 'atendimento_floresta';
      }

      // Contar apenas atendimentos da unidade do coordenador
      let filteredCount = 0;
      
      if (coordinatorUnit) {
        attendances.forEach(a => {
          const scheduleUnit = a.schedule_id ? scheduleUnitMap.get(a.schedule_id) : null;
          if (scheduleUnit === coordinatorUnit) {
            filteredCount++;
          }
        });
      } else {
        // Fallback: usar unidade do perfil se não for um coordenador específico
        attendances.forEach(a => {
          const scheduleUnit = a.schedule_id ? scheduleUnitMap.get(a.schedule_id) : null;
          if (scheduleUnit === userUnit || !scheduleUnit) {
            filteredCount++;
          }
        });
      }

      setPendingCount(filteredCount);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

  if (!hasPermission || pendingCount === 0) {
    return null;
  }

  return (
    <DropdownMenuItem 
      onClick={() => navigate('/attendance-validation')}
      className="flex items-center justify-between cursor-pointer px-2 py-2"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <span>Atendimentos Pendentes</span>
      </div>
      <Badge variant="destructive" className="ml-2">
        {pendingCount}
      </Badge>
    </DropdownMenuItem>
  );
}

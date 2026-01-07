import { useAuth } from '@/components/auth/AuthProvider';
import AttendanceValidationManager from '@/components/AttendanceValidationManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AttendanceValidation() {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setHasPermission(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('employee_role')
          .eq('user_id', user.id)
          .single();

        const allowedRoles = ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'];
        setHasPermission(profile && allowedRoles.includes(profile.employee_role));
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermission(false);
      }
    };

    checkPermissions();
  }, [user]);

  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-lg mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas coordenadores e diretores podem validar atendimentos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AttendanceValidationManager />;
}
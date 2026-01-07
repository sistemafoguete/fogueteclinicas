import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomPermissions, type PermissionAction } from '@/hooks/useCustomPermissions';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: PermissionAction;
  allowedRoles?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  allowedRoles = [],
  fallback 
}: ProtectedRouteProps) {
  const customPermissions = useCustomPermissions();
  const rolePermissions = useRolePermissions();

  // Aguardar carregamento das permissões
  if (customPermissions.loading || rolePermissions.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground animate-pulse mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Verificar se é diretor (acesso total)
  if (rolePermissions.isDirector()) {
    return <>{children}</>;
  }

  // Verificar permissão customizada
  const hasCustomPermission = requiredPermission 
    ? customPermissions.hasPermission(requiredPermission)
    : true;

  // Verificar role
  const hasRolePermission = allowedRoles.length > 0
    ? allowedRoles.includes(rolePermissions.userRole || '')
    : true;

  // Se tem permissão, renderizar conteúdo
  if (hasCustomPermission || hasRolePermission) {
    return <>{children}</>;
  }

  // Se não tem permissão, mostrar mensagem de acesso negado
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex items-center justify-center h-96">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            Acesso Negado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o administrador do sistema para solicitar acesso.
          </p>
          {requiredPermission && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs font-medium">Permissão necessária:</p>
              <p className="text-sm">{requiredPermission}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook para verificar permissões dentro de componentes
export function useRoutePermission(requiredPermission?: PermissionAction, allowedRoles: string[] = []) {
  const customPermissions = useCustomPermissions();
  const rolePermissions = useRolePermissions();

  const isDirector = rolePermissions.isDirector();
  const hasCustomPermission = requiredPermission 
    ? customPermissions.hasPermission(requiredPermission)
    : true;
  const hasRolePermission = allowedRoles.length > 0
    ? allowedRoles.includes(rolePermissions.userRole || '')
    : true;

  return {
    hasAccess: isDirector || hasCustomPermission || hasRolePermission,
    isLoading: customPermissions.loading || rolePermissions.loading,
    isDirector
  };
}

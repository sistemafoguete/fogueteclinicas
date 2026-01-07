import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionService } from '@/services/permissionService';
import { Separator } from '@/components/ui/separator';
import { Shield, Users, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

import { EmployeeRole } from '@/hooks/useRolePermissions';

interface RolePermission {
  permission: string;
  granted: boolean;
}

export const PermissionManager = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | ''>('');
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDirector, setIsDirector] = useState(false);
  const { toast } = useToast();

  const roles = PermissionService.getAvailableRoles();
  const availablePermissions = PermissionService.getAvailablePermissions();

  useEffect(() => {
    checkUserRole();
  }, [user]);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setIsDirector(data.employee_role === 'director');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadRolePermissions = async (role: EmployeeRole) => {
    setLoading(true);
    try {
      const permissions = await PermissionService.getPermissionsByRole(role);
      setRolePermissions(permissions);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar permissões do cargo.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: string, granted: boolean) => {
    setRolePermissions(prev => {
      const existing = prev.find(p => p.permission === permission);
      if (existing) {
        return prev.map(p => 
          p.permission === permission ? { ...p, granted } : p
        );
      } else {
        return [...prev, { permission, granted }];
      }
    });
  };

  const savePermissions = async () => {
    if (!selectedRole || !isDirector) return;

    setLoading(true);
    try {
      await PermissionService.updateRolePermissions(
        selectedRole,
        rolePermissions.map(p => ({ 
          permission: p.permission as any, 
          granted: p.granted 
        }))
      );

      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar permissões.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPermissionValue = (permission: string): boolean => {
    const existing = rolePermissions.find(p => p.permission === permission);
    return existing?.granted || false;
  };

  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof availablePermissions>);

  if (!isDirector) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a diretores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciamento de Permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="role-select">Selecionar Cargo</Label>
              <Select value={selectedRole} onValueChange={(value: EmployeeRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um cargo para configurar" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole && (
              <Button 
                onClick={savePermissions} 
                disabled={loading}
                className="shrink-0"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </div>

          {selectedRole && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4" />
                <h3 className="text-lg font-medium">
                  Permissões para: {roles.find(r => r.value === selectedRole)?.label}
                </h3>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                      {permissions.map((perm) => (
                        <div 
                          key={perm.permission} 
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                        >
                          <Label 
                            htmlFor={perm.permission} 
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {perm.label}
                          </Label>
                          <Switch
                            id={perm.permission}
                            checked={getPermissionValue(perm.permission)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(perm.permission, checked)
                            }
                            disabled={loading}
                          />
                        </div>
                      ))}
                    </div>
                    
                    {category !== Object.keys(groupedPermissions).slice(-1)[0] && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
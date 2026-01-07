import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, XCircle, Save, Eye, EyeOff } from 'lucide-react';
import { PERMISSION_LABELS, PERMISSION_CATEGORIES, type PermissionAction } from '@/hooks/useCustomPermissions';
import { useAuth } from '@/components/auth/AuthProvider';

interface JobPosition {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
}

interface PositionPermission {
  id: string;
  position_id: string;
  permission: PermissionAction;
  granted: boolean;
}

interface PositionPermissionsManagerProps {
  position: JobPosition;
  onClose: () => void;
}

export const PositionPermissionsManager = ({ position, onClose }: PositionPermissionsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PositionPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOnlyGranted, setShowOnlyGranted] = useState(false);
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    checkUserRole();
    loadPermissions();
  }, [position.id, user]);

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

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('position_permissions')
        .select('*')
        .eq('position_id', position.id);

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar permissões",
        description: "Não foi possível carregar as permissões do cargo."
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (permission: PermissionAction, granted: boolean) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.permission === permission);
      if (existing) {
        return prev.map(p => 
          p.permission === permission ? { ...p, granted } : p
        );
      } else {
        return [...prev, {
          id: '', // Will be set when saved
          position_id: position.id,
          permission,
          granted
        }];
      }
    });
  };

  const savePermissions = async () => {
    if (!isDirector) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas diretores podem gerenciar permissões."
      });
      return;
    }

    setSaving(true);
    try {
      // Primeira, deletar todas as permissões existentes para este cargo
      const { error: deleteError } = await supabase
        .from('position_permissions')
        .delete()
        .eq('position_id', position.id);

      if (deleteError) throw deleteError;

      // Inserir as novas permissões
      const permissionsToInsert = permissions
        .filter(p => p.granted) // Só salvar as permissões concedidas
        .map(p => ({
          position_id: position.id,
          permission: p.permission,
          granted: true
        }));

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('position_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Permissões salvas!",
        description: "As permissões do cargo foram atualizadas com sucesso."
      });

      onClose();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar permissões",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionState = (permission: PermissionAction): boolean => {
    const perm = permissions.find(p => p.permission === permission);
    return perm?.granted ?? false;
  };

  const getGrantedCount = () => {
    return permissions.filter(p => p.granted).length;
  };

  const getTotalPermissions = () => {
    return Object.values(PERMISSION_CATEGORIES).reduce((total, category) => 
      total + category.permissions.length, 0
    );
  };

  if (!isDirector) {
    return (
      <Card className="max-w-4xl">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground">
              Apenas diretores podem gerenciar permissões de cargos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-4xl">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando permissões...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ backgroundColor: position.color }}
            />
            <div>
              <CardTitle className="text-xl">
                Gerenciar Permissões - {position.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {position.description || 'Sem descrição'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                {getGrantedCount()} de {getTotalPermissions()} permissões
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round((getGrantedCount() / getTotalPermissions()) * 100)}% configurado
              </p>
            </div>
            <Badge variant={position.is_active ? "default" : "secondary"}>
              {position.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controles de filtro */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-granted"
              checked={showOnlyGranted}
              onCheckedChange={setShowOnlyGranted}
            />
            <Label htmlFor="show-granted" className="flex items-center gap-2">
              {showOnlyGranted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showOnlyGranted ? 'Mostrar apenas concedidas' : 'Mostrar todas'}
            </Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={savePermissions} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Permissões
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Lista de permissões por categoria */}
        <ScrollArea className="h-96">
          <div className="space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
              const categoryPermissions = category.permissions.filter(permission => {
                if (showOnlyGranted) {
                  return getPermissionState(permission);
                }
                return true;
              });

              if (categoryPermissions.length === 0) return null;

              const grantedInCategory = category.permissions.filter(p => getPermissionState(p)).length;

              return (
                <Card key={categoryKey} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {category.label}
                      </CardTitle>
                      <Badge variant="outline">
                        {grantedInCategory}/{category.permissions.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryPermissions.map((permission) => {
                        const isGranted = getPermissionState(permission);
                        
                        return (
                          <div 
                            key={permission} 
                            className="flex items-center justify-between space-x-3 p-3 rounded-lg bg-background/50"
                          >
                            <div className="flex-1">
                              <Label 
                                htmlFor={`${position.id}-${permission}`} 
                                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                              >
                                {isGranted ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                {PERMISSION_LABELS[permission]}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Código: {permission}
                              </p>
                            </div>
                            <Switch
                              id={`${position.id}-${permission}`}
                              checked={isGranted}
                              onCheckedChange={(granted) => updatePermission(permission, granted)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
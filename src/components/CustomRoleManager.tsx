import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, Edit, Trash2, Shield, Users } from 'lucide-react';

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'clients_view', label: 'Visualizar Pacientes', category: 'Pacientes' },
  { key: 'clients_create', label: 'Criar Pacientes', category: 'Pacientes' },
  { key: 'clients_edit', label: 'Editar Pacientes', category: 'Pacientes' },
  { key: 'clients_delete', label: 'Excluir Pacientes', category: 'Pacientes' },
  { key: 'schedules_view', label: 'Visualizar Agenda', category: 'Agenda' },
  { key: 'schedules_create', label: 'Criar Agendamentos', category: 'Agenda' },
  { key: 'schedules_edit', label: 'Editar Agendamentos', category: 'Agenda' },
  { key: 'schedules_delete', label: 'Cancelar Agendamentos', category: 'Agenda' },
  { key: 'financial_view', label: 'Visualizar Financeiro', category: 'Financeiro' },
  { key: 'financial_manage', label: 'Gerenciar Financeiro', category: 'Financeiro' },
  { key: 'reports_view', label: 'Visualizar Relatórios', category: 'Relatórios' },
  { key: 'reports_export', label: 'Exportar Relatórios', category: 'Relatórios' },
  { key: 'stock_view', label: 'Visualizar Estoque', category: 'Estoque' },
  { key: 'stock_manage', label: 'Gerenciar Estoque', category: 'Estoque' },
  { key: 'users_view', label: 'Visualizar Usuários', category: 'Usuários' },
  { key: 'users_manage', label: 'Gerenciar Usuários', category: 'Usuários' },
];

export function CustomRoleManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [isDirector, setIsDirector] = useState(false);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>
  });

  useEffect(() => {
    checkUserRole();
    loadCustomRoles();
  }, [user]);

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

  const loadCustomRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure permissions field exists for each role
      const rolesWithPermissions = (data || []).map((role: any) => ({
        ...role,
        permissions: role.permissions || {} as Record<string, boolean>
      }));
      
      setRoles(rolesWithPermissions);
    } catch (error) {
      console.error('Error loading custom roles:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os cargos customizados.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('custom_roles')
        .insert({
          name: newRole.name,
          description: newRole.description,
          permissions: newRole.permissions,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo customizado criado com sucesso!",
      });

      setIsDialogOpen(false);
      resetForm();
      loadCustomRoles();
    } catch (error) {
      console.error('Error creating custom role:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o cargo customizado.",
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !user) return;
    
    try {
      const { error } = await supabase
        .from('custom_roles')
        .update({
          name: newRole.name,
          description: newRole.description,
          permissions: newRole.permissions
        })
        .eq('id', editingRole.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo customizado atualizado com sucesso!",
      });

      setIsDialogOpen(false);
      resetForm();
      loadCustomRoles();
    } catch (error) {
      console.error('Error updating custom role:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o cargo customizado.",
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('custom_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo customizado desativado com sucesso!",
      });

      loadCustomRoles();
    } catch (error) {
      console.error('Error deleting custom role:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desativar o cargo customizado.",
      });
    }
  };

  const resetForm = () => {
    setNewRole({
      name: '',
      description: '',
      permissions: {}
    });
    setEditingRole(null);
  };

  const openEditDialog = (role: CustomRole) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions
    });
    setIsDialogOpen(true);
  };

  const handlePermissionChange = (permissionKey: string, value: boolean) => {
    setNewRole({
      ...newRole,
      permissions: {
        ...newRole.permissions,
        [permissionKey]: value
      }
    });
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((groups, permission) => {
    const category = permission.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cargos Customizados</h1>
          <p className="text-muted-foreground">
            Crie e gerencie cargos personalizados com permissões específicas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Criar Cargo
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? 'Editar Cargo Customizado' : 'Criar Novo Cargo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cargo</Label>
                  <Input
                    id="name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="Ex: Assistente Administrativo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Descreva as responsabilidades do cargo"
                    rows={3}
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Permissões do Sistema</h3>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, permissions]) => (
                    <Card key={category} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-primary">
                          {category}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {permissions.map((permission) => (
                          <div key={permission.key} className="flex items-center justify-between">
                            <Label htmlFor={permission.key} className="text-sm font-normal">
                              {permission.label}
                            </Label>
                            <Switch
                              id={permission.key}
                              checked={!!newRole.permissions[permission.key]}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission.key, checked)
                              }
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                disabled={!newRole.name}
                className="bg-primary hover:bg-primary/90"
              >
                {editingRole ? 'Atualizar' : 'Criar Cargo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cargos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{roles.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cargos Ativos</CardTitle>
            <Shield className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {roles.filter(role => role.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissões Disponíveis</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {AVAILABLE_PERMISSIONS.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Cargos Customizados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum cargo customizado criado ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Nome</TableHead>
                  <TableHead className="text-foreground">Descrição</TableHead>
                  <TableHead className="text-foreground">Permissões</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Data de Criação</TableHead>
                  <TableHead className="text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium text-foreground">
                      {role.name}
                    </TableCell>
                    <TableCell className="text-foreground max-w-xs truncate">
                      {role.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {Object.values(role.permissions).filter(Boolean).length} ativas
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={role.is_active ? 'default' : 'secondary'}
                        className={role.is_active ? 'bg-accent/90 text-white' : ''}
                      >
                        {role.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {new Date(role.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(role)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {role.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRole(role.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
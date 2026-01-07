import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Eye,
  Edit,
  Trash2,
  Key,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  Crown,
  Briefcase
} from 'lucide-react';
import { useCustomPermissions, PERMISSION_LABELS, PERMISSION_CATEGORIES, type PermissionAction } from '@/hooks/useCustomPermissions';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useAuditLog } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateEmployeeForm } from '@/components/CreateEmployeeForm';

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_active?: boolean;
  positions?: JobPosition[];
}

interface JobPosition {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
}

interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission: PermissionAction;
  granted: boolean;
  reason?: string;
  expires_at?: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  old_data?: any;
  new_data?: any;
  metadata?: any;
  created_at: string;
  user_name?: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const { hasPermission } = useCustomPermissions();
  const rolePermissions = useRolePermissions();
  const { logAction } = useAuditLog();
  const [users, setUsers] = useState<User[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissionOverride[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados dos diálogos
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isCreateEmployeeDialogOpen, setIsCreateEmployeeDialogOpen] = useState(false);
  const [isAuditDetailsDialogOpen, setIsAuditDetailsDialogOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Estados dos formulários
  const [newPosition, setNewPosition] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });
  
  const [passwordChange, setPasswordChange] = useState({
    userId: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Permitir acesso baseado tanto nas permissões customizadas quanto nas permissões de role
  const canManageUsers = hasPermission('manage_users') || rolePermissions.canManageEmployees();
  const canManageRoles = hasPermission('manage_roles') || rolePermissions.canManageEmployees();
  const canChangePasswords = hasPermission('change_user_passwords') || rolePermissions.isDirector();

  useEffect(() => {
    if (canManageUsers || canManageRoles) {
      loadData();
    }
  }, [canManageUsers, canManageRoles]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadUsers(),
      loadJobPositions(),
      loadAuditLogs()
    ]);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      // Buscar usuários da tabela profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          name,
          email,
          is_active,
          created_at
        `)
        .order('name');

      if (error) throw error;

      const usersData = profiles?.map(profile => ({
        id: profile.user_id,
        email: profile.email || 'Não informado',
        name: profile.name,
        created_at: profile.created_at,
        is_active: profile.is_active
      })) || [];

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários."
      });
    }
  };

  const loadJobPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_job_positions')
        .select('*')
        .order('name');

      if (error) throw error;
      setJobPositions(data || []);
    } catch (error) {
      console.error('Error loading job positions:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      console.log('📋 Carregando logs de auditoria...');
      
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Buscar nomes dos usuários via user_id
      const userIds = [...new Set(logs?.map(log => log.user_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.name || p.email]) || []);

      // Buscar também por email nos metadados (para logs de autenticação)
      const emailsFromMetadata = logs?.map(log => {
        const metadata = log.metadata as any;
        if (metadata?.user_email) return metadata.user_email;
        if (metadata?.email) return metadata.email;
        return null;
      }).filter(Boolean) || [];

      const { data: profilesByEmail } = await supabase
        .from('profiles')
        .select('email, name, user_id')
        .in('email', emailsFromMetadata);

      const emailToNameMap = new Map(profilesByEmail?.map(p => [p.email, p.name || p.email]) || []);
      const emailToUserIdMap = new Map(profilesByEmail?.map(p => [p.email, p.user_id]) || []);

      const logsWithNames = logs?.map(log => {
        let userName = 'Usuário desconhecido';
        let userId = log.user_id;
        const metadata = log.metadata as any;

        // Tentar primeiro pelo user_id
        if (log.user_id && profilesMap.has(log.user_id)) {
          userName = profilesMap.get(log.user_id) || userName;
        } 
        // Se não tiver user_id, tentar pelo email nos metadados
        else {
          const email = metadata?.user_email || metadata?.email;
          if (email) {
            if (emailToNameMap.has(email)) {
              userName = emailToNameMap.get(email) || userName;
            }
            if (emailToUserIdMap.has(email)) {
              userId = emailToUserIdMap.get(email);
            }
          }
        }

        return {
          ...log,
          user_id: userId,
          user_name: userName
        };
      }) || [];

      console.log('✅ Logs carregados:', logsWithNames.length);
      console.log('📊 Exemplo de logs:', logsWithNames.slice(0, 3));
      setAuditLogs(logsWithNames);
    } catch (error) {
      console.error('❌ Erro ao carregar logs de auditoria:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar logs",
        description: "Não foi possível carregar os logs de auditoria."
      });
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      console.log('Carregando permissões para usuário:', userId);
      
      const { data, error } = await supabase
        .from('user_specific_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      console.log('Permissões carregadas:', data);
      setUserPermissions(data || []);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar permissões",
        description: "Não foi possível carregar as permissões do usuário."
      });
    }
  };

  const createJobPosition = async () => {
    try {
      const { error } = await supabase
        .from('custom_job_positions')
        .insert([newPosition]);

      if (error) throw error;

      toast({
        title: "Cargo criado!",
        description: "Novo cargo foi criado com sucesso."
      });

      setNewPosition({ name: '', description: '', color: '#3b82f6' });
      setIsPositionDialogOpen(false);
      loadJobPositions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar cargo",
        description: error.message
      });
    }
  };

  const assignUserToPosition = async (userId: string, positionId: string) => {
    try {
      const { error } = await supabase
        .from('user_job_assignments')
        .upsert([{
          user_id: userId,
          position_id: positionId,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Cargo atribuído!",
        description: "Cargo foi atribuído ao usuário com sucesso."
      });

      loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atribuir cargo",
        description: error.message
      });
    }
  };

  const updateUserPermission = async (userId: string, permission: PermissionAction, granted: boolean, reason: string = '') => {
    try {
      console.log('=== INICIANDO ATUALIZAÇÃO DE PERMISSÃO ===');
      console.log('Dados:', { userId, permission, granted, reason });
      
      // Verificar se o usuário atual é diretor
      const { data: currentUser } = await supabase.auth.getUser();
      console.log('Usuário autenticado:', currentUser.user?.id);
      
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('employee_role, is_active, name')
        .eq('user_id', currentUser.user?.id)
        .single();
      
      console.log('Perfil do usuário atual:', currentUserProfile);
      
      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw new Error('Erro ao verificar permissões: ' + profileError.message);
      }

      if (!currentUserProfile || currentUserProfile.employee_role !== 'director') {
        throw new Error('Apenas diretores podem gerenciar permissões');
      }

      console.log('Fazendo upsert na tabela user_specific_permissions...');
      
      const { data, error } = await supabase
        .from('user_specific_permissions')
        .upsert({
          user_id: userId,
          permission,
          granted,
          reason: reason || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,permission'
        })
        .select();

      if (error) {
        console.error('Erro no upsert:', error);
        throw error;
      }

      console.log('Permissão atualizada com sucesso:', data);

      // Registrar no log de auditoria
      await logAction({
        entityType: 'user_permissions',
        entityId: userId,
        action: granted ? 'grant_permission' : 'revoke_permission',
        newData: { permission, granted },
        metadata: { 
          permission_label: PERMISSION_LABELS[permission],
          reason,
          target_user_id: userId
        }
      });

      toast({
        title: "Permissão atualizada!",
        description: `Permissão "${PERMISSION_LABELS[permission]}" foi ${granted ? 'concedida' : 'revogada'} com sucesso.`
      });

      // Recarregar permissões do usuário e logs
      if (selectedUser?.id === userId) {
        await loadUserPermissions(userId);
      }
      await loadAuditLogs();
    } catch (error: any) {
      console.error('=== ERRO AO ATUALIZAR PERMISSÃO ===');
      console.error('Erro completo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar permissão",
        description: error.message || "Não foi possível atualizar a permissão."
      });
    }
  };

  const changeUserPassword = async () => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem."
      });
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres."
      });
      return;
    }

    try {
      console.log('Chamando edge function para trocar senha');
      
      const { data, error } = await supabase.functions.invoke('change-user-password', {
        body: {
          userId: passwordChange.userId,
          newPassword: passwordChange.newPassword
        }
      });

      console.log('Resposta:', { data, error });

      if (error) {
        console.error('Erro da edge function:', error);
        throw new Error(error.message || 'Erro ao chamar função');
      }

      if (data?.error) {
        console.error('Erro no retorno:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Senha alterada!",
        description: "Senha do usuário foi alterada com sucesso."
      });

      setPasswordChange({ userId: '', newPassword: '', confirmPassword: '' });
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha."
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageUsers && !canManageRoles) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Acesso Negado</h3>
          <p className="text-muted-foreground">Você não tem permissão para gerenciar usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários e Permissões</h1>
          <p className="text-muted-foreground">Controle total sobre usuários, cargos e permissões do sistema</p>
        </div>
        <div className="flex gap-2">
          {canManageUsers && (
            <Button 
              onClick={() => setIsCreateEmployeeDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          )}
          {canManageUsers && (
            <Button 
              variant="outline"
              onClick={() => {
                setIsCreateEmployeeDialogOpen(true);
              }}
            >
              <Crown className="h-4 w-4 mr-2" />
              Criar Diretor
            </Button>
          )}
          {canManageRoles && (
            <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Novo Cargo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Cargo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="positionName">Nome do Cargo</Label>
                    <Input
                      id="positionName"
                      value={newPosition.name}
                      onChange={(e) => setNewPosition({...newPosition, name: e.target.value})}
                      placeholder="Ex: Coordenador de TI"
                    />
                  </div>
                  <div>
                    <Label htmlFor="positionDescription">Descrição</Label>
                    <Textarea
                      id="positionDescription"
                      value={newPosition.description}
                      onChange={(e) => setNewPosition({...newPosition, description: e.target.value})}
                      placeholder="Descreva as responsabilidades do cargo..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="positionColor">Cor do Cargo</Label>
                    <Input
                      id="positionColor"
                      type="color"
                      value={newPosition.color}
                      onChange={(e) => setNewPosition({...newPosition, color: e.target.value})}
                    />
                  </div>
                  <Button onClick={createJobPosition} className="w-full">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Criar Cargo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="positions">Cargos</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema ({filteredUsers.length})
                </CardTitle>
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'Sem nome'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            loadUserPermissions(user.id);
                            setIsPermissionDialogOpen(true);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        {canChangePasswords && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPasswordChange({...passwordChange, userId: user.id});
                              setIsPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Cargos Disponíveis ({jobPositions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobPositions.map((position) => (
                  <Card key={position.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: position.color }}
                        />
                        <CardTitle className="text-lg">{position.name}</CardTitle>
                        <Badge variant={position.is_active ? "default" : "secondary"}>
                          {position.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {position.description || 'Sem descrição'}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="outline">
                          <Shield className="h-4 w-4 mr-1" />
                          Permissões
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Log de Auditoria ({auditLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum log de auditoria encontrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Data/Hora</TableHead>
                        <TableHead className="w-[200px]">Usuário</TableHead>
                        <TableHead className="w-[150px]">Ação</TableHead>
                        <TableHead className="w-[120px]">Entidade</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => {
                        // Tradução de ações
                        const actionTranslations: Record<string, string> = {
                          'login_success': 'Login realizado',
                          'login_attempted': 'Tentativa de login',
                          'login_failed': 'Falha no login',
                          'logout_completed': 'Logout realizado',
                          'permission_updated': 'Permissão atualizada',
                          'user_created': 'Usuário criado',
                          'user_updated': 'Usuário atualizado',
                          'user_deleted': 'Usuário excluído',
                          'create': 'Criação',
                          'update': 'Atualização',
                          'delete': 'Exclusão',
                        };

                        // Tradução de entidades
                        const entityTranslations: Record<string, string> = {
                          'auth': 'Autenticação',
                          'user': 'Usuário',
                          'permission': 'Permissão',
                          'client': 'Cliente',
                          'schedule': 'Agendamento',
                          'financial': 'Financeiro',
                        };

                        // Descrição legível dos metadados
                        const getReadableDescription = () => {
                          if (log.action.includes('login') || log.action.includes('logout')) {
                            return log.metadata?.msg || 'Evento de autenticação';
                          }
                          if (log.action === 'permission_updated') {
                            return `Permissão ${log.metadata?.permission || 'desconhecida'}: ${log.metadata?.granted ? 'concedida' : 'removida'}`;
                          }
                          if (log.metadata?.description) {
                            return log.metadata.description;
                          }
                          return 'Ação registrada';
                        };

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.user_name || 'Usuário desconhecido'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action.includes('delete') || log.action.includes('failed') ? 'destructive' :
                                log.action.includes('create') || log.action.includes('success') ? 'default' :
                                'secondary'
                              }>
                                {actionTranslations[log.action] || log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {entityTranslations[log.entity_type] || log.entity_type}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {getReadableDescription()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedAuditLog(log);
                                  setIsAuditDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Permissões do Usuário */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Permissões - {selectedUser?.name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
              <Card key={categoryKey}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.permissions.map((permission) => {
                      const userPermission = userPermissions.find(p => p.permission === permission);
                      const hasOverride = !!userPermission;
                      
                      return (
                        <div key={permission} className="flex items-center justify-between space-x-2">
                          <div className="flex-1">
                            <Label htmlFor={permission} className="text-sm font-medium">
                              {PERMISSION_LABELS[permission]}
                            </Label>
                            {hasOverride && (
                              <p className="text-xs text-muted-foreground">
                                Personalizado: {userPermission.granted ? 'Permitido' : 'Negado'}
                              </p>
                            )}
                          </div>
                          <Switch
                            id={permission}
                            checked={userPermission?.granted ?? false}
                            onCheckedChange={(granted) => 
                              updateUserPermission(selectedUser!.id, permission, granted)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Alteração de Senha */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordChange.confirmPassword}
                onChange={(e) => setPasswordChange({...passwordChange, confirmPassword: e.target.value})}
              />
            </div>
            <Button onClick={changeUserPassword} className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Alterar Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação de Funcionário */}
      <CreateEmployeeForm
        isOpen={isCreateEmployeeDialogOpen}
        onClose={() => setIsCreateEmployeeDialogOpen(false)}
        onSuccess={() => {
          loadUsers();
          setIsCreateEmployeeDialogOpen(false);
        }}
        prefilledData={{
          name: 'Elvimar Peixoto',
          email: 'institucional@fundacaodombosco.org',
          phone: '31985642292',
          employee_role: 'director',
          unit: 'madre'
        }}
      />

      {/* Dialog de Detalhes da Auditoria */}
      <Dialog open={isAuditDetailsDialogOpen} onOpenChange={setIsAuditDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
          </DialogHeader>
          {selectedAuditLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedAuditLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Usuário</Label>
                  <p className="text-sm font-medium">{selectedAuditLog.user_name || 'Desconhecido'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ação</Label>
                  <p className="text-sm font-medium">{selectedAuditLog.action}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entidade</Label>
                  <p className="text-sm font-medium">{selectedAuditLog.entity_type}</p>
                </div>
                {selectedAuditLog.entity_id && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">ID da Entidade</Label>
                    <p className="text-sm font-mono">{selectedAuditLog.entity_id}</p>
                  </div>
                )}
              </div>

              {selectedAuditLog.metadata && Object.keys(selectedAuditLog.metadata).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Metadados</Label>
                  <div className="bg-muted p-4 rounded-md space-y-2">
                    {Object.entries(selectedAuditLog.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-xs font-semibold min-w-[120px]">{key}:</span>
                        <span className="text-xs text-muted-foreground flex-1 break-all">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAuditLog.old_data && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Dados Anteriores</Label>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedAuditLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAuditLog.new_data && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Dados Novos</Label>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedAuditLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
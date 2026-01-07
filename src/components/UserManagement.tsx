import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { UserPlus, Users, Edit, Trash2, Shield } from 'lucide-react';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  employee_role: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const { isDirector } = usePermissions();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    employee_role: 'staff' as any,
    department: ''
  });

  // Função para criar usuários específicos
  const createSpecificUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-users');
      
      if (error) {
        toast({
          title: "Erro",
          description: `Erro ao criar usuários: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: data.message,
        });
        loadEmployees(); // Recarregar a lista
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDirector) {
      loadEmployees();
    }
  }, [isDirector]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, employee_role, department, is_active, created_at, user_id')
        .order('name');

      if (error) throw error;

      // Get email from auth.users for each profile
      const employeesWithEmail = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
          return {
            id: profile.id,
            user_id: profile.user_id,
            name: profile.name || 'N/A',
            email: userData.user?.email || 'N/A',
            employee_role: profile.employee_role,
            department: profile.department,
            is_active: profile.is_active,
            created_at: profile.created_at
          };
        })
      );

      setEmployees(employeesWithEmail);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os funcionários.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    console.log('Iniciando criação de usuário:', newEmployee);
    
    if (!newEmployee.name.trim() || !newEmployee.email.trim() || !newEmployee.password.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome, email e senha são obrigatórios.",
      });
      return;
    }

    if (newEmployee.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    try {
      setLoading(true);
      
      console.log('Invocando edge function create-users com dados:', {
        email: newEmployee.email,
        name: newEmployee.name,
        employee_role: newEmployee.employee_role,
        department: newEmployee.department
      });

      const { data, error } = await supabase.functions.invoke('create-users', {
        body: {
          email: newEmployee.email,
          password: newEmployee.password,
          name: newEmployee.name,
          employee_role: newEmployee.employee_role,
          phone: null,
          department: newEmployee.department || null
        }
      });

      console.log('Resposta da edge function:', { data, error });

      if (error) {
        console.error('Error creating user:', error);
        toast({
          variant: "destructive",
          title: "Erro ao criar funcionário",
          description: error.message || "Erro ao criar funcionário.",
        });
        return;
      }

      if (data?.error) {
        console.error('Error from function:', data.error);
        toast({
          variant: "destructive",
          title: "Erro ao criar funcionário",
          description: data.error || "Erro ao criar funcionário.",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Funcionário criado com sucesso",
          description: `Login criado para ${newEmployee.name}. O funcionário já pode fazer login no sistema.`,
        });

        setIsDialogOpen(false);
        resetForm();
        loadEmployees();
      } else {
        console.error('Resposta inesperada:', data);
        toast({
          variant: "destructive",
          title: "Erro ao criar funcionário",
          description: "Resposta inesperada do servidor.",
        });
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar funcionário",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewEmployee({
      name: '',
      email: '',
      password: '',
      employee_role: 'staff',
      department: ''
    });
    setEditingEmployee(null);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: { [key: string]: string } = {
      'director': 'Diretor',
      'coordinator_madre': 'Coordenador Madre',
      'coordinator_floresta': 'Coordenador Floresta',
      'administrative': 'Administrativo',
      'health_professional': 'Profissional de Saúde',
      'finance': 'Financeiro',
      'receptionist': 'Recepcionista',
      'intern': 'Estagiário',
      'staff': 'Funcionário'
    };
    return roleLabels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'director': return 'default';
      case 'coordinator_madre':
      case 'coordinator_floresta': return 'secondary';
      case 'health_professional': return 'outline';
      default: return 'outline';
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja deletar permanentemente o usuário ${userName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('delete-users', {
        body: { userId }
      });

      if (error) {
        toast({
          title: "Erro",
          description: `Erro ao deletar usuário: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: `Usuário ${userName} deletado com sucesso.`,
        });
        loadEmployees();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Sistema de criação e gerenciamento de usuários
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={createSpecificUsers}
            disabled={loading}
            variant="default"
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {loading ? "Criando..." : "Criar Christopher e Amanda"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Criar Usuário
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="Digite o nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária</Label>
                <Input
                  id="password"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  placeholder="Senha temporária"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Select value={newEmployee.employee_role} onValueChange={(value) => setNewEmployee({ ...newEmployee, employee_role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="director">Diretor</SelectItem>
                     <SelectItem value="coordinator_madre">Coordenador Madre</SelectItem>
                     <SelectItem value="coordinator_floresta">Coordenador Floresta</SelectItem>
                     <SelectItem value="administrative">Administrativo</SelectItem>
                     <SelectItem value="health_professional">Profissional de Saúde</SelectItem>
                     <SelectItem value="finance">Financeiro</SelectItem>
                     <SelectItem value="receptionist">Recepcionista</SelectItem>
                     <SelectItem value="intern">Estagiário</SelectItem>
                     <SelectItem value="terapeuta_ocupacional">Terapeuta Ocupacional</SelectItem>
                     <SelectItem value="advogada">Advogada</SelectItem>
                     <SelectItem value="staff">Funcionário</SelectItem>
                   </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  placeholder="Ex: Psicologia, Administração"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateEmployee} 
                disabled={!newEmployee.name || !newEmployee.email || !newEmployee.password}
              >
                Criar Usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {employees.filter(emp => emp.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Diretores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {employees.filter(emp => emp.employee_role === 'director').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Coordenadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {employees.filter(emp => emp.employee_role.includes('coordinator')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Nome</TableHead>
                  <TableHead className="text-foreground">Email</TableHead>
                  <TableHead className="text-foreground">Cargo</TableHead>
                  <TableHead className="text-foreground">Departamento</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Data de Criação</TableHead>
                  <TableHead className="text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium text-foreground">{employee.name}</TableCell>
                    <TableCell className="text-foreground">{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(employee.employee_role)}>
                        {getRoleLabel(employee.employee_role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{employee.department || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                        {employee.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {new Date(employee.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(employee.user_id, employee.name)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
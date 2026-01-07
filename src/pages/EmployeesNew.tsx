import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCustomPermissions } from '@/hooks/useCustomPermissions';
import { Search, Users, Power, UserCheck, UserX, Plus, Edit, Eye, EyeOff, Building2 } from 'lucide-react';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  employee_role: string;
  phone?: string;
  department?: string;
  unit?: string;
  is_active: boolean;
  created_at: string;
  hire_date?: string;
}

const roleNames: Record<string, string> = {
  director: 'Diretoria',
  coordinator_madre: 'Coordenador(a) Madre',
  coordinator_floresta: 'Coordenador(a) Floresta',
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
};

export default function EmployeesNew() {
  const permissions = useRolePermissions();
  const customPermissions = useCustomPermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    cpf: '',
    password: '',
    employee_role: 'staff',
    phone: '',
    department: '',
    unit: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (permissions.loading || customPermissions.loading) return;
    
    const hasAccess = permissions.userRole === 'director' || 
                      permissions.userRole === 'coordinator_madre' ||
                      permissions.userRole === 'coordinator_floresta' ||
                      customPermissions.hasPermission('view_employees');
    
    if (!hasAccess) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para visualizar funcionários.",
      });
      window.history.back();
    }
  }, [permissions.loading, customPermissions.loading, permissions.userRole]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
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
    if (!newEmployee.name.trim() || !newEmployee.email.trim() || !newEmployee.password.trim() || !newEmployee.unit.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome, email, senha e unidade são obrigatórios.",
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
      const { data, error } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: newEmployee.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: newEmployee.name,
            employee_role: newEmployee.employee_role,
            phone: newEmployee.phone || null,
            department: newEmployee.department || null,
            unit: newEmployee.unit === 'none' ? null : (newEmployee.unit || null),
            document_cpf: newEmployee.cpf || null
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        if (data.user && !data.user.email_confirmed_at) {
          try {
            await supabase.functions.invoke('confirm-user-email', {
              body: { userId: data.user.id, email: newEmployee.email }
            });
          } catch (confirmError) {
            console.log('Email confirmation may be required manually:', confirmError);
          }
        }

        try {
          await supabase.functions.invoke('send-employee-confirmation', {
            body: {
              name: newEmployee.name,
              email: newEmployee.email,
              employeeRole: newEmployee.employee_role
            }
          });
        } catch (emailError) {
          console.log('Could not send welcome email:', emailError);
        }

        toast({
          title: "Funcionário criado com sucesso",
          description: `Login criado para ${newEmployee.name}.`,
        });

        setIsDialogOpen(false);
        resetForm();
        loadEmployees();
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível criar o funcionário.",
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({ ...employee, unit: employee.unit || 'none' });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: editingEmployee.name,
          employee_role: editingEmployee.employee_role as any,
          phone: editingEmployee.phone,
          department: editingEmployee.department,
          unit: editingEmployee.unit === 'none' ? null : editingEmployee.unit
        })
        .eq('user_id', editingEmployee.user_id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          variant: "destructive",
          title: "Erro de permissão",
          description: "Você não tem permissão para atualizar este funcionário.",
        });
        return;
      }

      toast({
        title: "Funcionário atualizado",
        description: "Informações atualizadas com sucesso!",
      });

      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar o funcionário.",
      });
    }
  };

  const resetForm = () => {
    setNewEmployee({
      name: '',
      email: '',
      cpf: '',
      password: '',
      employee_role: 'staff',
      phone: '',
      department: '',
      unit: ''
    });
  };

  const handleToggleEmployeeStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Funcionário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`,
      });
      
      loadEmployees();
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status do funcionário.",
      });
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roleNames[employee.employee_role]?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const getAvatarColor = (role: string) => {
    const colors: Record<string, string> = {
      director: 'bg-purple-500',
      coordinator_madre: 'bg-pink-500',
      coordinator_floresta: 'bg-emerald-500',
      psychologist: 'bg-blue-500',
      psychopedagogue: 'bg-indigo-500',
      receptionist: 'bg-orange-500',
      financeiro: 'bg-green-500',
      intern: 'bg-gray-500',
    };
    return colors[role] || 'bg-slate-500';
  };

  const getUnitStyle = (unit: string) => {
    switch (unit?.toLowerCase()) {
      case 'madre':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400';
      case 'floresta':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'atendimento_floresta':
        return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (!permissions.canManageEmployees()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-6">
      {/* Header moderno com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Gerenciar Funcionários</h1>
              <p className="text-blue-100 mt-1">
                Gerencie status e informações dos funcionários
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2">
                <Plus className="h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Funcionário</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={newEmployee.cpf}
                    onChange={(e) => setNewEmployee({ ...newEmployee, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Temporária *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                      placeholder="Senha temporária"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_role">Cargo *</Label>
                  <Select value={newEmployee.employee_role} onValueChange={(value) => setNewEmployee({ ...newEmployee, employee_role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Funcionário(a) Geral</SelectItem>
                      <SelectItem value="receptionist">Recepcionista</SelectItem>
                      <SelectItem value="psychologist">Psicólogo(a)</SelectItem>
                      <SelectItem value="psychopedagogue">Psicopedagogo(a)</SelectItem>
                      <SelectItem value="musictherapist">Musicoterapeuta</SelectItem>
                      <SelectItem value="speech_therapist">Fonoaudiólogo(a)</SelectItem>
                      <SelectItem value="nutritionist">Nutricionista</SelectItem>
                      <SelectItem value="physiotherapist">Fisioterapeuta</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="intern">Estagiário(a)</SelectItem>
                      <SelectItem value="terapeuta_ocupacional">Terapeuta Ocupacional</SelectItem>
                      <SelectItem value="advogada">Advogada</SelectItem>
                      <SelectItem value="coordinator_madre">Coordenador(a) Madre</SelectItem>
                      <SelectItem value="coordinator_floresta">Coordenador(a) Floresta</SelectItem>
                      <SelectItem value="director">Diretoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="Nome do departamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade *</Label>
                  <Select value={newEmployee.unit} onValueChange={(value) => setNewEmployee({ ...newEmployee, unit: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="madre">MADRE (Clínica Social)</SelectItem>
                      <SelectItem value="floresta">Floresta (Neuroavaliação)</SelectItem>
                      <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateEmployee}>Criar Funcionário</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 dark:bg-blue-800/20 rounded-full -translate-y-16 translate-x-16" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{employees.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-200/50 dark:bg-blue-800/50">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -translate-y-16 translate-x-16" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Ativos</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">{activeCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-200/50 dark:bg-green-800/50">
                <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/30 dark:bg-red-800/20 rounded-full -translate-y-16 translate-x-16" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Inativos</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{inactiveCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-200/50 dark:bg-red-800/50">
                <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Funcionários */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-800/50 rounded-t-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-600" />
              Lista de Funcionários
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum funcionário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.user_id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                            <AvatarFallback className={`${getAvatarColor(employee.employee_role)} text-white font-medium`}>
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {roleNames[employee.employee_role] || employee.employee_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.unit ? (
                          <Badge variant="outline" className={getUnitStyle(employee.unit)}>
                            {employee.unit}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{employee.phone || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={employee.is_active 
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                        }>
                          {employee.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                            className="hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEmployeeStatus(employee.user_id, employee.is_active)}
                            className={employee.is_active 
                              ? "hover:bg-red-50 hover:text-red-600" 
                              : "hover:bg-green-50 hover:text-green-600"
                            }
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select 
                  value={editingEmployee.employee_role} 
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, employee_role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Funcionário(a) Geral</SelectItem>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="psychologist">Psicólogo(a)</SelectItem>
                    <SelectItem value="psychopedagogue">Psicopedagogo(a)</SelectItem>
                    <SelectItem value="musictherapist">Musicoterapeuta</SelectItem>
                    <SelectItem value="speech_therapist">Fonoaudiólogo(a)</SelectItem>
                    <SelectItem value="nutritionist">Nutricionista</SelectItem>
                    <SelectItem value="physiotherapist">Fisioterapeuta</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="intern">Estagiário(a)</SelectItem>
                    <SelectItem value="coordinator_madre">Coordenador(a) Madre</SelectItem>
                    <SelectItem value="coordinator_floresta">Coordenador(a) Floresta</SelectItem>
                    <SelectItem value="director">Diretoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editingEmployee.phone || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={editingEmployee.department || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select 
                  value={editingEmployee.unit || 'none'} 
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem unidade</SelectItem>
                    <SelectItem value="madre">MADRE (Clínica Social)</SelectItem>
                    <SelectItem value="floresta">Floresta (Neuroavaliação)</SelectItem>
                    <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateEmployee}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

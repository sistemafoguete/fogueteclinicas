import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, Edit, UserPlus, Users, Clock, Settings, Shield, UserCheck, UserX, Briefcase } from 'lucide-react';
import EmployeePermissions from '@/components/EmployeePermissions';
import PasswordManager from '@/components/PasswordManager';
import { CustomRoleManager } from '@/components/CustomRoleManager';
import { ROLE_LABELS, EmployeeRole } from '@/hooks/useRolePermissions';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { FilterBar } from '@/components/ui/filter-bar';
import { EnhancedTable, StatusBadge } from '@/components/ui/enhanced-table';
import { UserAvatar } from '@/components/UserAvatar';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  employee_role: string;
  phone?: string;
  document_cpf?: string;
  is_active: boolean;
  hire_date: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  employee_role: string;
}

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    employee_role: EmployeeRole;
    phone: string;
    department: string;
  }>({
    name: '',
    employee_role: 'staff',
    phone: '',
    department: '',
  });
  const { toast } = useToast();

  const isDirector = userProfile?.employee_role === 'director';

  useEffect(() => {
    loadUserProfile();
    loadEmployees();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

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

  const filteredEmployees = employees.filter(employee =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = filteredEmployees.filter(e => e.is_active);
  const inactiveEmployees = filteredEmployees.filter(e => !e.is_active);

  // Group employees by role
  const employeesByRole = filteredEmployees.reduce((acc: any, employee) => {
    const role = employee.employee_role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(employee);
    return acc;
  }, {});

  const openPermissionsDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setPermissionsDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name || '',
      employee_role: employee.employee_role as EmployeeRole || 'staff',
      phone: employee.phone || '',
      department: employee.department || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          employee_role: formData.employee_role,
          phone: formData.phone,
          department: formData.department,
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Funcionário atualizado com sucesso.",
      });

      setEditDialogOpen(false);
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o funcionário.",
      });
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Funcionários"
        description={`${filteredEmployees.length} funcionários cadastrados no sistema`}
        icon={<Users className="h-6 w-6" />}
        iconColor="purple"
        actions={
          isDirector && (
            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 border-0">
              <UserPlus className="h-4 w-4" />
              Cadastrar Funcionário
            </Button>
          )
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Funcionários"
          value={filteredEmployees.length}
          icon={<Users className="h-5 w-5" />}
          variant="purple"
        />
        <StatsCard
          title="Ativos"
          value={activeEmployees.length}
          icon={<UserCheck className="h-5 w-5" />}
          variant="green"
        />
        <StatsCard
          title="Inativos"
          value={inactiveEmployees.length}
          icon={<UserX className="h-5 w-5" />}
          variant="default"
        />
        <StatsCard
          title="Cargos"
          value={Object.keys(employeesByRole).length}
          icon={<Briefcase className="h-5 w-5" />}
          variant="blue"
        />
      </div>

      {isDirector ? (
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Lista de Funcionários</TabsTrigger>
            <TabsTrigger value="permissions">Gerenciar Permissões</TabsTrigger>
            <TabsTrigger value="roles">Gerenciar Cargos</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filter Bar */}
            <FilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nome, cargo, telefone..."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Employees by Role */}
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-500" />
                    Por Cargo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(employeesByRole).map(([role, roleEmployees]) => (
                      <div key={role} className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-medium">{ROLE_LABELS[role] || role}</span>
                        <Badge variant="secondary" className="font-semibold">{(roleEmployees as Employee[]).length}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Hires */}
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredEmployees
                      .sort((a, b) => new Date(b.hire_date || 0).getTime() - new Date(a.hire_date || 0).getTime())
                      .slice(0, 5)
                      .map((employee) => (
                        <div key={employee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <UserAvatar name={employee.name} size="sm" role={employee.employee_role} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{employee.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ROLE_LABELS[employee.employee_role] || employee.employee_role}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-BR') : '-'}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Status */}
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10">
                      <span className="text-sm font-medium">Ativos</span>
                      <Badge className="bg-emerald-500 text-white">{activeEmployees.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                      <span className="text-sm font-medium">Inativos</span>
                      <Badge variant="secondary">{inactiveEmployees.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10">
                      <span className="text-sm font-medium">Taxa de Atividade</span>
                      <Badge className="bg-blue-500 text-white">
                        {filteredEmployees.length > 0 
                          ? ((activeEmployees.length / filteredEmployees.length) * 100).toFixed(0) 
                          : 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employees Table */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Lista de Funcionários
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando funcionários...</p>
                ) : filteredEmployees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {searchTerm ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Funcionário</TableHead>
                          <TableHead className="font-semibold">Cargo</TableHead>
                          <TableHead className="font-semibold">Telefone</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee, index) => (
                          <TableRow 
                            key={employee.id}
                            className={index % 2 === 1 ? "bg-muted/20" : ""}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <UserAvatar name={employee.name} size="sm" role={employee.employee_role} />
                                <span className="font-medium">{employee.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {ROLE_LABELS[employee.employee_role] || employee.employee_role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{employee.phone || '-'}</TableCell>
                            <TableCell>
                              <StatusBadge 
                                status={employee.is_active ? 'Ativo' : 'Inativo'} 
                                variant={employee.is_active ? 'success' : 'default'} 
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(employee)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openPermissionsDialog(employee)}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <PasswordManager 
                                  employeeId={employee.user_id}
                                  employeeName={employee.name || 'Funcionário'}
                                  employeeEmail={employee.phone || 'email@exemplo.com'}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Gerenciar Permissões de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEmployees.map((employee) => (
                    <Card key={employee.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => openPermissionsDialog(employee)}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="font-medium">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {ROLE_LABELS[employee.employee_role] || employee.employee_role}
                          </p>
                          <Button variant="outline" size="sm" className="mt-3">
                            Gerenciar Permissões
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <CustomRoleManager />
          </TabsContent>
        </Tabs>
      ) : (
        // View for non-directors
        <Card>
          <CardHeader>
            <CardTitle>Lista de Funcionários</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando funcionários...</p>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchTerm ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ROLE_LABELS[employee.employee_role] || employee.employee_role}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissões do Funcionário</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Editando permissões para: <span className="font-medium">{selectedEmployee.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {selectedEmployee.user_id}
                </p>
              </div>
              <EmployeePermissions 
                employeeId={selectedEmployee.user_id}
                employeeName={selectedEmployee.name || 'Funcionário'}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Select 
                value={formData.employee_role} 
                onValueChange={(value: EmployeeRole) => setFormData({ ...formData, employee_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateEmployee}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
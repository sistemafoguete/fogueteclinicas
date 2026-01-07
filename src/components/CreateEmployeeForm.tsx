import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useRolePermissions, ROLE_LABELS, EmployeeRole } from '@/hooks/useRolePermissions';
import { TempPasswordDialog } from './TempPasswordDialog';
import { UserPlus, KeyRound } from 'lucide-react';

interface CreateEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledData?: {
    name?: string;
    email?: string;
    employee_role?: EmployeeRole;
    unit?: string;
    phone?: string;
  };
}

interface JobPosition {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
}

// Função para gerar senha temporária segura
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const special = '@#$!';
  let password = 'Temp';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  return password;
};

export const CreateEmployeeForm = ({ isOpen, onClose, onSuccess, prefilledData }: CreateEmployeeFormProps) => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { userRole } = useRolePermissions();
  const [loading, setLoading] = useState(false);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  
  // Estado para o dialog de senha temporária
  const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    name: prefilledData?.name || '',
    email: prefilledData?.email || '',
    employee_role: (prefilledData?.employee_role || 'staff') as EmployeeRole,
    phone: '',
    department: '',
    unit: prefilledData?.unit || '',
    job_position_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadJobPositions();
      if (prefilledData) {
        setFormData({
          name: prefilledData.name || '',
          email: prefilledData.email || '',
          employee_role: (prefilledData.employee_role || 'staff') as EmployeeRole,
          phone: prefilledData.phone || '',
          department: '',
          unit: prefilledData.unit || '',
          job_position_id: ''
        });
      }
    }
  }, [isOpen, prefilledData]);

  const loadJobPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_job_positions')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setJobPositions(data || []);
    } catch (error) {
      console.error('Error loading job positions:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      employee_role: 'staff',
      phone: '',
      department: '',
      unit: '',
      job_position_id: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.unit.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome, email e unidade são obrigatórios.",
      });
      return;
    }

    setLoading(true);
    
    // Gerar senha temporária automaticamente
    const tempPassword = generateTempPassword();
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name,
            employee_role: formData.employee_role,
            phone: formData.phone || null,
            department: formData.department || null,
            unit: formData.unit || null,
            job_position_id: formData.job_position_id || null
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        toast({
          variant: "destructive",
          title: "Erro ao criar funcionário",
          description: error.message || "Erro ao criar funcionário.",
        });
        return;
      }

      if (data?.user) {
        // Se um cargo foi selecionado, criar a associação
        if (formData.job_position_id) {
          try {
            await supabase
              .from('user_job_assignments')
              .insert({
                user_id: data.user.id,
                position_id: formData.job_position_id,
                assigned_by: userRole
              });
          } catch (assignmentError) {
            console.log('Warning: Could not assign job position:', assignmentError);
          }
        }

        // Enviar email de boas-vindas
        try {
          await supabase.functions.invoke('send-employee-confirmation', {
            body: {
              name: formData.name,
              email: formData.email,
              employeeRole: formData.employee_role
            }
          });
        } catch (emailError) {
          console.log('Warning: Could not send welcome email:', emailError);
        }

        // Log the action
        try {
          await logAction({
            entityType: 'employees',
            action: 'created',
            metadata: { 
              employee_name: formData.name,
              employee_email: formData.email,
              employee_role: formData.employee_role,
              created_by: 'admin_panel'
            }
          });
        } catch (logError) {
          console.warn('Could not log action:', logError);
        }

        // Guardar dados para o dialog de senha temporária
        setCreatedEmployee({
          name: formData.name,
          email: formData.email,
          tempPassword
        });
        
        // Mostrar dialog com senha temporária
        setShowTempPasswordDialog(true);
        
        resetForm();
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar funcionário",
        description: "Ocorreu um erro inesperado. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTempPasswordDialogClose = () => {
    setShowTempPasswordDialog(false);
    setCreatedEmployee(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showTempPasswordDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Criar Novo Funcionário
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <RequiredLabel htmlFor="name" required>Nome Completo</RequiredLabel>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite o nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            {/* Aviso sobre senha temporária */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20 p-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <KeyRound className="h-4 w-4" />
                <p className="text-sm">
                  Uma senha temporária será gerada automaticamente. 
                  O funcionário deverá alterá-la no primeiro acesso.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <Select 
                value={formData.employee_role} 
                onValueChange={(value: EmployeeRole) => handleInputChange('employee_role', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => {
                    if (userRole === 'coordinator_madre' || userRole === 'coordinator_floresta' || userRole === 'coordinator_atendimento_floresta') {
                      if (value === 'director' || value.startsWith('coordinator_')) {
                        return null;
                      }
                    }
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="ex: Psicologia, Fisioterapia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade *</Label>
              <Select 
                value={formData.unit} 
                onValueChange={(value) => handleInputChange('unit', value)}
              >
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

            {jobPositions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="job_position">Cargo Customizado</Label>
                <Select 
                  value={formData.job_position_id} 
                  onValueChange={(value) => handleInputChange('job_position_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobPositions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: position.color }}
                          />
                          {position.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Criando...' : 'Criar Funcionário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de senha temporária */}
      {createdEmployee && (
        <TempPasswordDialog
          isOpen={showTempPasswordDialog}
          onClose={handleTempPasswordDialogClose}
          employeeName={createdEmployee.name}
          employeeEmail={createdEmployee.email}
          tempPassword={createdEmployee.tempPassword}
        />
      )}
    </>
  );
};

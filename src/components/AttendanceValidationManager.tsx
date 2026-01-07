import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Check, X, Eye, Clock, User, Calendar, Package, Filter, DollarSign } from 'lucide-react';

interface PendingAttendance {
  id: string;
  schedule_id: string;
  client_id: string;
  employee_id: string;
  patient_name: string;
  professional_name: string;
  attendance_type: string;
  session_duration: number;
  amount_charged: number;
  materials_used: any;
  attachments: any;
  created_at: string;
  validation_status: string;
  start_time: string;
  end_time: string;
  observations: string;
  session_notes: string;
  techniques_used: string;
  patient_response: string;
  next_session_plan: string;
  unit?: string;
}

interface Employee {
  user_id: string;
  name: string;
}

export default function AttendanceValidationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [pendingAttendances, setPendingAttendances] = useState<PendingAttendance[]>([]);
  const [allAttendances, setAllAttendances] = useState<PendingAttendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttendance, setSelectedAttendance] = useState<PendingAttendance | null>(null);
  const [validationAction, setValidationAction] = useState<'validate' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [professionalAmount, setProfessionalAmount] = useState<string>('');
  const [foundationAmount, setFoundationAmount] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('dinheiro');
  
  // Estados para edição dos campos do atendimento
  const [editedAttendance, setEditedAttendance] = useState<Partial<PendingAttendance>>({});

  useEffect(() => {
    if (user) {
      loadPendingAttendances();
      loadEmployees();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [unitFilter, employeeFilter, allAttendances]);

  const loadPendingAttendances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_reports')
        .select(`
          *,
          clients!inner(unit)
        `)
        .eq('validation_status', 'pending_validation')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const attendancesWithUnit = data?.map(attendance => ({
        ...attendance,
        unit: attendance.clients?.unit || 'madre'
      })) || [];
      
      setAllAttendances(attendancesWithUnit);
      setPendingAttendances(attendancesWithUnit);
    } catch (error) {
      console.error('Error loading pending attendances:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os atendimentos pendentes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .not('employee_role', 'is', null)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allAttendances];

    if (unitFilter !== 'all') {
      filtered = filtered.filter(attendance => attendance.unit === unitFilter);
    }

    if (employeeFilter !== 'all') {
      filtered = filtered.filter(attendance => attendance.employee_id === employeeFilter);
    }

    setPendingAttendances(filtered);
  };

  const handleValidationAction = async () => {
    if (!selectedAttendance || !validationAction) return;

    if (validationAction === 'reject' && !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
      });
      return;
    }

    setProcessing(true);
    try {
      // Atualizar dados do atendimento se houver edições
      if (validationAction === 'validate' && Object.keys(editedAttendance).length > 0) {
        const { error: updateError } = await supabase
          .from('attendance_reports')
          .update({
            attendance_type: editedAttendance.attendance_type,
            session_duration: editedAttendance.session_duration,
            amount_charged: editedAttendance.amount_charged,
            techniques_used: editedAttendance.techniques_used,
            patient_response: editedAttendance.patient_response,
            observations: editedAttendance.observations,
            next_session_plan: editedAttendance.next_session_plan,
          })
          .eq('id', selectedAttendance.id);

        if (updateError) throw updateError;
      }

      const { error } = await supabase.rpc('validate_attendance_report', {
        p_attendance_report_id: selectedAttendance.id,
        p_action: validationAction,
        p_rejection_reason: validationAction === 'reject' ? rejectionReason : null,
        p_professional_amount: validationAction === 'validate' && professionalAmount ? parseFloat(professionalAmount) : 0,
        p_foundation_amount: validationAction === 'validate' && foundationAmount ? parseFloat(foundationAmount) : 0,
        p_total_amount: validationAction === 'validate' && totalAmount ? parseFloat(totalAmount) : editedAttendance.amount_charged || selectedAttendance?.amount_charged || 0,
        p_payment_method: validationAction === 'validate' ? paymentMethod : 'dinheiro'
      });

      if (error) throw error;

      // Registrar auditoria da validação
      await logAction({
        entityType: 'attendance_report',
        entityId: selectedAttendance.id,
        action: validationAction === 'validate' ? 'validate_attendance' : 'reject_attendance',
        metadata: {
          patient_name: selectedAttendance.patient_name,
          professional_name: selectedAttendance.professional_name,
          attendance_type: selectedAttendance.attendance_type,
          payment_method: paymentMethod,
          total_amount: validationAction === 'validate' && totalAmount ? parseFloat(totalAmount) : selectedAttendance?.amount_charged || 0,
          professional_amount: validationAction === 'validate' && professionalAmount ? parseFloat(professionalAmount) : 0,
          foundation_amount: validationAction === 'validate' && foundationAmount ? parseFloat(foundationAmount) : 0,
          rejection_reason: validationAction === 'reject' ? rejectionReason : null,
        }
      });

      toast({
        title: validationAction === 'validate' ? "Atendimento Validado!" : "Atendimento Rejeitado",
        description: validationAction === 'validate' 
          ? "O atendimento foi validado e os dados foram processados no sistema."
          : "O atendimento foi rejeitado e retornado ao profissional.",
      });

      // Recarregar lista
      loadPendingAttendances();
      
      // Fechar dialog e limpar campos
      setSelectedAttendance(null);
      setValidationAction(null);
      setRejectionReason('');
      setProfessionalAmount('');
      setFoundationAmount('');
      setTotalAmount('');
      setPaymentMethod('dinheiro');
      setEditedAttendance({});
      
    } catch (error) {
      console.error('Error processing validation:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível processar a validação. Tente novamente.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalMaterialsCost = (materials: any) => {
    if (!materials || !Array.isArray(materials)) return 0;
    return materials.reduce((total, material) => total + (material.total_cost || 0), 0);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Carregando atendimentos pendentes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-1.5 bg-gradient-to-b from-purple-500 via-purple-600 to-indigo-700 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              Validação de Atendimentos
            </h1>
            <p className="text-muted-foreground mt-1">
              Atendimentos aguardando validação
            </p>
          </div>
        </div>
        <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 w-fit">
          <Clock className="h-4 w-4 mr-2" />
          {pendingAttendances.length} pendente{pendingAttendances.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-purple-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit-filter" className="text-sm">Unidade</Label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  <SelectItem value="madre">MADRE (Clínica Social)</SelectItem>
                  <SelectItem value="floresta">Floresta (Neuroavaliação)</SelectItem>
                  <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employee-filter" className="text-sm">Funcionário</Label>
              <div className="mt-1">
                <Combobox
                  options={[
                    { value: "all", label: "Todos os funcionários" },
                    ...employees.map((employee) => ({
                      value: employee.user_id,
                      label: employee.name
                    }))
                  ]}
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                  placeholder="Buscar funcionário..."
                  searchPlaceholder="Digite o nome do funcionário..."
                  emptyMessage="Nenhum funcionário encontrado."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {pendingAttendances.length === 0 ? (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-green-500/5">
          <CardContent className="text-center py-16">
            <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full mx-auto w-fit mb-4">
              <Check className="h-16 w-16 text-green-500" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-2">
              Nenhum atendimento pendente
            </h3>
            <p className="text-muted-foreground">
              Todos os atendimentos foram validados ou não há atendimentos para revisar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingAttendances.map((attendance) => (
            <Card key={attendance.id} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden bg-gradient-to-br from-card via-card to-yellow-500/5 border-l-4 border-l-yellow-500">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg">
                      <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="truncate">{attendance.patient_name}</span>
                  </CardTitle>
                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-0 w-fit">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <Label className="font-medium text-xs text-muted-foreground">Profissional</Label>
                    <p className="text-sm truncate font-medium">{attendance.professional_name}</p>
                  </div>
                  <div>
                    <Label className="font-medium text-xs sm:text-sm">Unidade</Label>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      {attendance.unit === 'madre' ? 'MADRE' : 
                       attendance.unit === 'floresta' ? 'Floresta' :
                       attendance.unit === 'atendimento_floresta' ? 'Atendimento Floresta' : 
                       attendance.unit || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium text-xs sm:text-sm">Tipo</Label>
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">{attendance.attendance_type}</p>
                  </div>
                  <div>
                    <Label className="font-medium text-xs sm:text-sm">Duração</Label>
                    <p className="text-muted-foreground text-xs sm:text-sm">{attendance.session_duration} min</p>
                  </div>
                  <div>
                    <Label className="font-medium text-xs sm:text-sm">Data/Hora</Label>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      {formatDate(attendance.start_time)}
                    </p>
                  </div>
                </div>

                {attendance.materials_used && Array.isArray(attendance.materials_used) && attendance.materials_used.length > 0 && (
                  <div className="bg-muted/30 p-3 rounded-md">
                    <Label className="font-medium flex items-center gap-1 text-xs sm:text-sm">
                      <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                      Materiais ({Array.isArray(attendance.materials_used) ? attendance.materials_used.length : 0})
                    </Label>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Custo total: R$ {getTotalMaterialsCost(attendance.materials_used).toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAttendance(attendance)}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Revisar</span>
                    <span className="sm:hidden">Ver Detalhes</span>
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedAttendance(attendance);
                      setValidationAction('validate');
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Validar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      setSelectedAttendance(attendance);
                      setValidationAction('reject');
                    }}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Revisão Detalhada - EDITÁVEL */}
      <Dialog open={!!selectedAttendance && !validationAction} onOpenChange={() => {
        setSelectedAttendance(null);
        setEditedAttendance({});
      }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Revisão Detalhada do Atendimento
              <Badge variant="secondary" className="text-xs">Editável</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAttendance && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Sessão</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Paciente</Label>
                    <p className="text-sm p-2 bg-muted rounded">{selectedAttendance.patient_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Profissional</Label>
                    <p className="text-sm p-2 bg-muted rounded">{selectedAttendance.professional_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-attendance-type" className="text-sm font-medium">
                      Tipo de Atendimento *
                    </Label>
                    <Input
                      id="edit-attendance-type"
                      value={editedAttendance.attendance_type ?? selectedAttendance.attendance_type}
                      onChange={(e) => setEditedAttendance({...editedAttendance, attendance_type: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration" className="text-sm font-medium">
                      Duração (minutos) *
                    </Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      min="0"
                      value={editedAttendance.session_duration ?? selectedAttendance.session_duration}
                      onChange={(e) => setEditedAttendance({...editedAttendance, session_duration: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Horário</Label>
                    <p className="text-sm p-2 bg-muted rounded">
                      {formatTime(selectedAttendance.start_time)} - {formatTime(selectedAttendance.end_time)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount" className="text-sm font-medium">
                      Valor Cobrado (R$) *
                    </Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedAttendance.amount_charged ?? selectedAttendance.amount_charged}
                      onChange={(e) => setEditedAttendance({...editedAttendance, amount_charged: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Objetivos e Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-objectives" className="text-sm font-medium">
                      Objetivos da Sessão
                    </Label>
                    <Textarea
                      id="edit-objectives"
                      value={editedAttendance.techniques_used ?? selectedAttendance.techniques_used ?? ''}
                      onChange={(e) => setEditedAttendance({...editedAttendance, techniques_used: e.target.value})}
                      placeholder="Descreva os objetivos trabalhados na sessão..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-patient-response" className="text-sm font-medium">
                      Resposta do Paciente
                    </Label>
                    <Textarea
                      id="edit-patient-response"
                      value={editedAttendance.patient_response ?? selectedAttendance.patient_response ?? ''}
                      onChange={(e) => setEditedAttendance({...editedAttendance, patient_response: e.target.value})}
                      placeholder="Como o paciente respondeu durante a sessão..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-observations" className="text-sm font-medium">
                      Observações Clínicas
                    </Label>
                    <Textarea
                      id="edit-observations"
                      value={editedAttendance.observations ?? selectedAttendance.observations ?? ''}
                      onChange={(e) => setEditedAttendance({...editedAttendance, observations: e.target.value})}
                      placeholder="Observações clínicas importantes..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-next-plan" className="text-sm font-medium">
                      Plano para Próxima Sessão
                    </Label>
                    <Textarea
                      id="edit-next-plan"
                      value={editedAttendance.next_session_plan ?? selectedAttendance.next_session_plan ?? ''}
                      onChange={(e) => setEditedAttendance({...editedAttendance, next_session_plan: e.target.value})}
                      placeholder="Planejamento para a próxima sessão..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Materiais */}
              {selectedAttendance.materials_used && Array.isArray(selectedAttendance.materials_used) && selectedAttendance.materials_used.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Materiais Utilizados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedAttendance.materials_used.map((material, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{material.name}</span>
                            {material.observation && (
                              <p className="text-xs text-muted-foreground">{material.observation}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">
                              {material.quantity} {material.unit}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              R$ {material.total_cost?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="text-right font-medium pt-2 border-t">
                        Total: R$ {getTotalMaterialsCost(selectedAttendance.materials_used).toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Anexos */}
              {selectedAttendance.attachments && Array.isArray(selectedAttendance.attachments) && selectedAttendance.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Documentos Anexos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedAttendance.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="text-lg">📄</span>
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedAttendance(null);
              setEditedAttendance({});
            }}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setValidationAction('validate');
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Validar Atendimento
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setValidationAction('reject');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeitar Atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Ação */}
      <Dialog open={!!validationAction} onOpenChange={() => {
        setValidationAction(null);
        setRejectionReason('');
        setProfessionalAmount('');
        setFoundationAmount('');
        setTotalAmount('');
        setPaymentMethod('dinheiro');
        setEditedAttendance({});
      }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {validationAction === 'validate' ? 'Validar Atendimento' : 'Rejeitar Atendimento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>
              {validationAction === 'validate' 
                ? 'Confirme os valores e valide este atendimento. Os dados serão processados no sistema (estoque, financeiro, histórico).'
                : 'Tem certeza que deseja rejeitar este atendimento? O profissional precisará revisar e reenviar.'
              }
            </p>

            {validationAction === 'validate' && (
              <>
                {selectedAttendance?.unit === 'madre' ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="total-amount" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor Total da Sessão (R$)
                        </Label>
                        <Input
                          id="total-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={totalAmount || selectedAttendance?.amount_charged?.toString() || ''}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment-method">Método de Pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="payment-method">
                            <SelectValue placeholder="Selecione o método" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cartao">Cartão</SelectItem>
                            <SelectItem value="prazo">Prazo</SelectItem>
                            <SelectItem value="dividido">Dividido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="professional-amount" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor para o Profissional (R$)
                        </Label>
                        <Input
                          id="professional-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={professionalAmount}
                          onChange={(e) => setProfessionalAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="foundation-amount" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor para a Fundação (R$)
                        </Label>
                        <Input
                          id="foundation-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={foundationAmount}
                          onChange={(e) => setFoundationAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      <p><strong>Informação:</strong> Os valores informados serão registrados no sistema financeiro e nos relatórios profissionais. Se não informar valores, apenas os custos dos materiais e valor total da sessão serão processados.</p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <p><strong>Informação:</strong> Para atendimentos da unidade {selectedAttendance?.unit === 'floresta' ? 'Floresta (Neuroavaliação)' : 'Atendimento Floresta'}, não é necessário informar valores financeiros.</p>
                  </div>
                )}
              </>
            )}

            {validationAction === 'reject' && (
              <div>
                <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da rejeição para que o profissional possa corrigir..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setValidationAction(null);
                setRejectionReason('');
                setProfessionalAmount('');
                setFoundationAmount('');
                setTotalAmount('');
                setPaymentMethod('dinheiro');
                setEditedAttendance({});
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleValidationAction}
              disabled={processing}
              variant={validationAction === 'validate' ? 'default' : 'destructive'}
            >
              {processing ? (
                <>
                  <Clock className="h-4 w-4 mr-1 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {validationAction === 'validate' ? (
                    <><Check className="h-4 w-4 mr-1" />Validar</>
                  ) : (
                    <><X className="h-4 w-4 mr-1" />Rejeitar</>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
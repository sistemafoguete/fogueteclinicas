import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Clock, Star, Target, Package, DollarSign, FileText, Plus, Upload, X, FileIcon } from 'lucide-react';

interface AttachedFile {
  name: string;
  file: File;
  preview?: string;
}

interface StockItem {
  id: string;
  name: string;
  current_quantity: number;
  unit: string;
  category: string;
  unit_cost?: number;
}

interface Schedule {
  id: string;
  client_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  title: string;
  clients?: { name: string };
}

interface CompleteAttendanceDialogProps {
  schedule: Schedule | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function CompleteAttendanceDialog({ 
  schedule, 
  isOpen, 
  onClose, 
  onComplete 
}: CompleteAttendanceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [canEditFinancials, setCanEditFinancials] = useState(false);
  
  const [attendanceData, setAttendanceData] = useState({
    // Informações básicas
    sessionType: 'Consulta',
    actualDuration: 60,
    actualStartTime: '',
    actualEndTime: '',
    
    // Avaliações de qualidade (1-5 estrelas)
    overallQuality: 5,
    patientCooperation: 5,
    goalAchievement: 5,
    effortRating: 5,
    
    // Objetivos e resultados
    sessionObjectives: '',
    objectivesAchieved: '',
    patientResponse: '',
    
    // Materiais utilizados
    materialsUsed: [] as Array<{
      stock_item_id: string;
      name: string;
      quantity: number;
      unit: string;
      available_quantity: number;
      observation?: string;
    }>,
    materialsNotes: '',
    
    // Observações profissionais
    clinicalObservations: '',
    nextSessionPlan: '',
    homeRecommendations: '',
    supervisionNeeded: false,
    
    // Dados financeiros
    sessionValue: 0,
    professionalValue: 0,
    institutionValue: 0,
    paymentMethod: 'cash',
    paymentReceived: true,
    paymentNotes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadStockItems();
      checkUserPermissions();
    }
  }, [isOpen]);

  const checkUserPermissions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // Only coordinators and directors can edit financial values
      const isCoordinatorOrDirector = data?.employee_role === 'director' || 
                                     data?.employee_role === 'coordinator_madre' || 
                                     data?.employee_role === 'coordinator_floresta';
      
      setCanEditFinancials(isCoordinatorOrDirector);
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setCanEditFinancials(false);
    }
  };

  const loadStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, current_quantity, unit, category, unit_cost')
        .eq('is_active', true)
        .gt('current_quantity', 0)
        .order('name');

      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error('Error loading stock items:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os itens do estoque.",
      });
    }
  };

  const handleComplete = async () => {
    if (!schedule || !user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Dados do agendamento não encontrados."
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Buscar profissional
      const { data: professionalProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', schedule.employee_id)
        .maybeSingle();

      const professionalName = professionalProfile?.name || professionalProfile?.email || 'Profissional';

      // Buscar usuário que está concluindo
      const { data: completedByProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      const completedByName = completedByProfile?.name || completedByProfile?.email || user.email || 'Usuário';

      // Upload de arquivos
      const uploadedAttachments = [];
      for (const attachedFile of attachedFiles) {
        try {
          const fileName = `${user.id}/${schedule.id}/${Date.now()}_${attachedFile.file.name}`;
          const { data: uploadData } = await supabase.storage
            .from('attendance-documents')
            .upload(fileName, attachedFile.file);

          if (uploadData) {
            uploadedAttachments.push({
              name: attachedFile.file.name,
              path: uploadData.path,
              size: attachedFile.file.size,
              type: attachedFile.file.type
            });
          }
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
        }
      }

      // Processar materiais
      let totalMaterialsCost = 0;
      const processedMaterials = [];
      
      for (const material of attendanceData.materialsUsed) {
        const { data: stockItem } = await supabase
          .from('stock_items')
          .select('current_quantity, unit_cost, name, unit')
          .eq('id', material.stock_item_id)
          .maybeSingle();

        if (stockItem && stockItem.current_quantity >= material.quantity) {
          const unitCost = stockItem.unit_cost || 0;
          const materialCost = unitCost * material.quantity;
          totalMaterialsCost += materialCost;

          processedMaterials.push({
            stock_item_id: material.stock_item_id,
            name: stockItem.name,
            quantity: material.quantity,
            unit: stockItem.unit,
            unit_cost: unitCost,
            total_cost: materialCost,
            observation: material.observation || ''
          });
        }
      }

      // Atualizar schedule
      await supabase
        .from('schedules')
        .update({ 
          status: 'pending_validation',
          session_notes: attendanceData.clinicalObservations,
          session_amount: attendanceData.sessionValue,
          payment_method: attendanceData.paymentMethod,
          completed_at: new Date().toISOString(),
          completed_by: user.id
        })
        .eq('id', schedule.id);

      // Criar attendance_report
      await supabase.from('attendance_reports').insert({
        schedule_id: schedule.id,
        client_id: schedule.client_id,
        employee_id: schedule.employee_id,
        patient_name: schedule.clients?.name || '',
        professional_name: professionalName,
        attendance_type: attendanceData.sessionType,
        start_time: attendanceData.actualStartTime || schedule.start_time,
        end_time: attendanceData.actualEndTime || schedule.end_time,
        session_duration: attendanceData.actualDuration,
        observations: attendanceData.clinicalObservations,
        session_notes: attendanceData.nextSessionPlan,
        materials_used: processedMaterials,
        techniques_used: attendanceData.sessionObjectives,
        patient_response: attendanceData.patientResponse,
        next_session_plan: attendanceData.nextSessionPlan,
        amount_charged: attendanceData.sessionValue,
        professional_amount: attendanceData.professionalValue,
        institution_amount: attendanceData.institutionValue,
        attachments: uploadedAttachments,
        created_by: user.id,
        completed_by: user.id,
        completed_by_name: completedByName,
        validation_status: 'pending_validation'
      });

      // Upsert employee_report
      await supabase
        .from('employee_reports')
        .upsert({
          employee_id: schedule.employee_id,
          client_id: schedule.client_id,
          schedule_id: schedule.id,
          session_date: new Date().toISOString().split('T')[0],
          session_type: attendanceData.sessionType,
          session_duration: attendanceData.actualDuration,
          effort_rating: attendanceData.effortRating,
          quality_rating: attendanceData.overallQuality,
          patient_cooperation: attendanceData.patientCooperation,
          goal_achievement: attendanceData.goalAchievement,
          session_objectives: attendanceData.sessionObjectives,
          techniques_used: attendanceData.objectivesAchieved,
          patient_response: attendanceData.patientResponse,
          professional_notes: attendanceData.clinicalObservations,
          next_session_plan: attendanceData.nextSessionPlan,
          materials_used: processedMaterials,
          materials_cost: totalMaterialsCost,
          attachments: uploadedAttachments,
          session_location: 'Clínica',
          supervision_required: attendanceData.supervisionNeeded,
          follow_up_needed: !!attendanceData.nextSessionPlan,
          completed_by: user.id,
          completed_by_name: completedByName,
          validation_status: 'pending_validation'
        }, {
          onConflict: 'schedule_id'
        });

      // Atualizar cliente
      const clientUpdate: any = {
        last_session_date: new Date().toISOString().split('T')[0],
        last_session_type: attendanceData.sessionType,
        last_session_notes: attendanceData.clinicalObservations,
        updated_at: new Date().toISOString()
      };

      if (attendanceData.objectivesAchieved.trim()) {
        clientUpdate.treatment_progress = attendanceData.objectivesAchieved;
      }

      if (attendanceData.patientResponse.trim()) {
        clientUpdate.clinical_observations = attendanceData.patientResponse;
      }

      await supabase
        .from('clients')
        .update(clientUpdate)
        .eq('id', schedule.client_id);

      // Sucesso!
      setLoading(false);
      setAttachedFiles([]);
      
      toast({
        title: "Atendimento Enviado!",
        description: "Atendimento enviado para revisão do coordenador.",
      });
      
      onClose();
      
      setTimeout(() => {
        onComplete();
      }, 300);
      
    } catch (error: any) {
      console.error('Erro ao completar atendimento:', error);
      setLoading(false);
      
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: error?.message || "Não foi possível concluir o atendimento."
      });
    }
  };

  const goToValidation = async () => {

      // 1. Upload de arquivos
    if (!attendanceData.sessionObjectives.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, preencha os objetivos da sessão.",
      });
      return;
    }
    
    if (!attendanceData.clinicalObservations.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório", 
        description: "Por favor, preencha as observações clínicas.",
      });
      return;
    }
    
    // Enviar direto para validação
    await handleComplete();
  };

  const getTotalMaterialsCost = () => {
    return attendanceData.materialsUsed.reduce((total, material) => {
      const stockItem = stockItems.find(item => item.id === material.stock_item_id);
      const unitCost = stockItem?.unit_cost || 0;
      return total + (unitCost * material.quantity);
    }, 0);
  };

  const renderValidationScreen = () => (
    <div className="space-y-6">
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Revisar Informações do Atendimento</h3>
        <p className="text-sm text-muted-foreground">
          Confira todas as informações antes de finalizar o atendimento
        </p>
      </div>

      {/* Resumo das Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Informações da Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Tipo de Atendimento</Label>
            <p className="text-sm text-muted-foreground">{attendanceData.sessionType}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Duração</Label>
            <p className="text-sm text-muted-foreground">{attendanceData.actualDuration} minutos</p>
          </div>
        </CardContent>
      </Card>

      {/* Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Avaliações da Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Qualidade Geral</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= attendanceData.overallQuality ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{attendanceData.overallQuality}/5</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Cooperação do Paciente</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= attendanceData.patientCooperation ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{attendanceData.patientCooperation}/5</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Alcance dos Objetivos</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= attendanceData.goalAchievement ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{attendanceData.goalAchievement}/5</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Avaliação do Esforço</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= attendanceData.effortRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{attendanceData.effortRating}/5</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objetivos e Resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Objetivos e Resultados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Objetivos da Sessão</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {attendanceData.sessionObjectives || 'Não informado'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Objetivos Alcançados</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {attendanceData.objectivesAchieved || 'Não informado'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Resposta do Paciente</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {attendanceData.patientResponse || 'Não informado'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Materiais Utilizados */}
      {attendanceData.materialsUsed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materiais Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceData.materialsUsed.map((material, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <div>
                    <span className="font-medium">{material.name}</span>
                    {material.observation && (
                      <p className="text-xs text-muted-foreground">{material.observation}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {material.quantity} {material.unit}
                  </Badge>
                </div>
              ))}
              <div className="text-right text-sm font-medium pt-2 border-t">
                Custo Total: R$ {getTotalMaterialsCost().toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Clínicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Observações da Sessão</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {attendanceData.clinicalObservations || 'Não informado'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Plano para Próxima Sessão</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {attendanceData.nextSessionPlan || 'Não informado'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Anexos */}
      {attachedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Documentos Anexos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                  <div className="text-lg">
                    {getFileIcon(file.file.type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Financeiras */}
      {canEditFinancials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Valor da Sessão</Label>
              <p className="text-sm text-muted-foreground">R$ {attendanceData.sessionValue.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Forma de Pagamento</Label>
              <p className="text-sm text-muted-foreground">
                {attendanceData.paymentMethod === 'cash' && 'Dinheiro'}
                {attendanceData.paymentMethod === 'pix' && 'PIX'}
                {attendanceData.paymentMethod === 'credit_card' && 'Cartão de Crédito'}
                {attendanceData.paymentMethod === 'debit_card' && 'Cartão de Débito'}
                {attendanceData.paymentMethod === 'bank_transfer' && 'Transferência'}
                {attendanceData.paymentMethod === 'insurance' && 'Convênio'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Valor do Profissional</Label>
              <p className="text-sm text-muted-foreground">R$ {attendanceData.professionalValue.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Valor da Instituição</Label>
              <p className="text-sm text-muted-foreground">R$ {attendanceData.institutionValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const addMaterial = (stockItemId: string) => {
    const stockItem = stockItems.find(item => item.id === stockItemId);
    if (!stockItem) return;

    // Verificar se o material já foi adicionado
    if (attendanceData.materialsUsed.some(m => m.stock_item_id === stockItemId)) {
      toast({
        variant: "destructive",
        title: "Material já adicionado",
        description: "Este material já está na lista. Use os controles para ajustar a quantidade.",
      });
      return;
    }

    const newMaterial = {
      stock_item_id: stockItemId,
      name: stockItem.name,
      quantity: 1,
      unit: stockItem.unit,
      available_quantity: stockItem.current_quantity,
      observation: ''
    };

    setAttendanceData(prev => ({
      ...prev,
      materialsUsed: [...prev.materialsUsed, newMaterial]
    }));
  };

  const removeMaterial = (index: number) => {
    setAttendanceData(prev => ({
      ...prev,
      materialsUsed: prev.materialsUsed.filter((_, i) => i !== index)
    }));
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    if (field === 'quantity') {
      const material = attendanceData.materialsUsed[index];
      if (value > material.available_quantity) {
        toast({
          variant: "destructive",
          title: "Quantidade insuficiente",
          description: `Quantidade máxima disponível: ${material.available_quantity} ${material.unit}`,
        });
        return;
      }
    }
    
    setAttendanceData(prev => ({
      ...prev,
      materialsUsed: prev.materialsUsed.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Validar tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: `O arquivo ${file.name} é muito grande. Tamanho máximo: 10MB`,
        });
        return;
      }

      // Validar tipo de arquivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Tipo de arquivo não permitido",
          description: `O arquivo ${file.name} não é um tipo permitido.`,
        });
        return;
      }

      const newFile: AttachedFile = {
        name: file.name,
        file: file,
      };

      // Criar preview para imagens
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedFiles(prev => 
            prev.map(f => f.name === file.name ? { ...f, preview: e.target?.result as string } : f)
          );
        };
        reader.readAsDataURL(file);
      }

      setAttachedFiles(prev => [...prev, newFile]);
    });

    // Reset input
    event.target.value = '';
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '📝';
    return '📋';
  };

  const renderStarRating = (field: string, value: number) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="sm"
          className="p-0 w-6 h-6"
          onClick={() => setAttendanceData(prev => ({ ...prev, [field]: star }))}
        >
          <Star
            className={`h-4 w-4 ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </Button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
    </div>
  );

  if (!schedule) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Concluir Atendimento - {schedule.clients?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Informações da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Atendimento</Label>
                <Select 
                  value={attendanceData.sessionType} 
                  onValueChange={(value) => setAttendanceData(prev => ({...prev, sessionType: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Terapia">Terapia</SelectItem>
                    <SelectItem value="Avaliação">Avaliação</SelectItem>
                    <SelectItem value="Fonoaudiologia">Fonoaudiologia</SelectItem>
                    <SelectItem value="Psicologia">Psicologia</SelectItem>
                    <SelectItem value="Musicoterapia">Musicoterapia</SelectItem>
                    <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                    <SelectItem value="Nutrição">Nutrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Duração Real (minutos)</Label>
                <Input
                  type="number"
                  min="1"
                  value={attendanceData.actualDuration}
                  onChange={(e) => setAttendanceData(prev => ({...prev, actualDuration: parseInt(e.target.value) || 60}))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Avaliações de Qualidade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Avaliação da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Qualidade Geral</Label>
                {renderStarRating('overallQuality', attendanceData.overallQuality)}
              </div>
              
              <div>
                <Label>Cooperação do Paciente</Label>
                {renderStarRating('patientCooperation', attendanceData.patientCooperation)}
              </div>
              
              <div>
                <Label>Alcance dos Objetivos</Label>
                {renderStarRating('goalAchievement', attendanceData.goalAchievement)}
              </div>
              
              <div>
                <Label>Avaliação do Esforço</Label>
                {renderStarRating('effortRating', attendanceData.effortRating)}
              </div>
            </CardContent>
          </Card>

          {/* Objetivos e Resultados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objetivos e Resultados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Objetivos da Sessão</Label>
                <Textarea
                  value={attendanceData.sessionObjectives}
                  onChange={(e) => setAttendanceData(prev => ({...prev, sessionObjectives: e.target.value}))}
                  placeholder="Descreva os objetivos planejados para esta sessão..."
                />
              </div>
              
              <div>
                <Label>Objetivos Alcançados</Label>
                <Textarea
                  value={attendanceData.objectivesAchieved}
                  onChange={(e) => setAttendanceData(prev => ({...prev, objectivesAchieved: e.target.value}))}
                  placeholder="Descreva quais objetivos foram alcançados..."
                />
              </div>
              
              <div>
                <Label>Resposta do Paciente</Label>
                <Textarea
                  value={attendanceData.patientResponse}
                  onChange={(e) => setAttendanceData(prev => ({...prev, patientResponse: e.target.value}))}
                  placeholder="Como o paciente reagiu durante a sessão..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Materiais Utilizados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Materiais Utilizados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attendanceData.materialsUsed.map((material, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Material</Label>
                    <div className="text-sm font-medium p-2 bg-muted rounded">
                      {material.name}
                      <Badge variant="outline" className="ml-2">
                        {material.available_quantity} {material.unit} disponível
                      </Badge>
                    </div>
                  </div>
                  <div className="w-20">
                    <Label>Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      max={material.available_quantity}
                      value={material.quantity}
                      onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Observação</Label>
                    <Input
                      value={material.observation || ''}
                      onChange={(e) => updateMaterial(index, 'observation', e.target.value)}
                      placeholder="Observação (opcional)"
                    />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => removeMaterial(index)}>
                    Remover
                  </Button>
                </div>
              ))}
              
              <div className="space-y-2">
                <Label>Adicionar Material do Estoque</Label>
                <Select onValueChange={addMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um material" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockItems
                      .filter(item => !attendanceData.materialsUsed.some(m => m.stock_item_id === item.id))
                      .map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{item.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {item.current_quantity} {item.unit}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Observações Clínicas */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Clínicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Observações da Sessão</Label>
                <Textarea
                  value={attendanceData.clinicalObservations}
                  onChange={(e) => setAttendanceData(prev => ({...prev, clinicalObservations: e.target.value}))}
                  placeholder="Observações detalhadas sobre o atendimento..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Plano para Próxima Sessão</Label>
                <Textarea
                  value={attendanceData.nextSessionPlan}
                  onChange={(e) => setAttendanceData(prev => ({...prev, nextSessionPlan: e.target.value}))}
                  placeholder="Planejamento para o próximo atendimento..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Anexos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Documentos Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de arquivos anexados */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="text-2xl">
                        {getFileIcon(file.file.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {file.preview && (
                        <img src={file.preview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachedFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload de arquivos */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2 text-center"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Clique para anexar documentos</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, TXT, JPG, PNG (máx. 10MB cada)
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Informações Financeiras */}
          {canEditFinancials && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Informações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor da Sessão (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={attendanceData.sessionValue}
                      onChange={(e) => setAttendanceData(prev => ({...prev, sessionValue: parseFloat(e.target.value) || 0}))}
                    />
                  </div>
                  
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select 
                      value={attendanceData.paymentMethod} 
                      onValueChange={(value) => setAttendanceData(prev => ({...prev, paymentMethod: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="bank_transfer">Transferência</SelectItem>
                        <SelectItem value="insurance">Convênio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor do Profissional (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={attendanceData.professionalValue}
                      onChange={(e) => setAttendanceData(prev => ({...prev, professionalValue: parseFloat(e.target.value) || 0}))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label>Valor da Instituição (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={attendanceData.institutionValue}
                      onChange={(e) => setAttendanceData(prev => ({...prev, institutionValue: parseFloat(e.target.value) || 0}))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p><strong>Informação:</strong> Os valores informados serão registrados no sistema financeiro e nos relatórios profissionais. Se não informar valores, apenas os custos dos materiais e valor total da sessão serão processados.</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!canEditFinancials && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Informações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    Valores Financeiros Restritos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Apenas coordenadores e diretores podem definir valores financeiros dos atendimentos.
                    <br />
                    Os valores serão definidos durante a validação do atendimento.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={goToValidation} disabled={loading}>
            {loading ? 'Enviando para Revisão...' : 'Enviar para Revisão do Coordenador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
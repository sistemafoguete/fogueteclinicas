import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Package, Plus, Minus, Trash2, Clock, User, FileText, DollarSign, Activity, AlertCircle, Star, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StockItem {
  id: string;
  name: string;
  current_quantity: number;
  unit: string;
  category: string;
  unit_cost: number;
}

interface SelectedMaterial {
  stock_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost?: number;
  observation?: string;
}

interface Schedule {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  client_id: string;
  clients?: { name: string };
  profiles?: { name: string };
}

interface SessionData {
  // Dados clínicos
  actualDuration: number;
  sessionType: string;
  symptoms: string;
  evolutionNotes: string;
  treatmentPlan: string;
  progressNotes: string;
  nextAppointmentNotes: string;
  medications: string;
  vitalSigns: {
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    weight?: string;
    height?: string;
  };
  
  // Dados financeiros
  sessionValue: number;
  paymentMethod: string;
  hasDiscount: boolean;
  discountPercentage: number;
  finalValue: number;
  isPaid: boolean;
  paymentNotes: string;
  
  // Relatório do profissional
  professionalDifficulties: string;
  clientResponse: string;
  interventionTechniques: string;
  professionalObservations: string;
  nextSessionPreparation: string;
  professionalEffort: number; // 1-5
  sessionQuality: number; // 1-5
  
  // Dados adicionais
  clientSatisfaction: number; // 1-5
  environmentConditions: string;
  equipmentUsed: string;
  followUpRequired: boolean;
  urgentNotes: string;
  familyPresent: boolean;
  familyObservations: string;
}

interface ConfirmAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onConfirm: (scheduleId: string, sessionData: SessionData, materials: SelectedMaterial[]) => Promise<void>;
}

export function ConfirmAppointmentDialog({ 
  isOpen, 
  onClose, 
  schedule, 
  onConfirm 
}: ConfirmAppointmentDialogProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [sessionData, setSessionData] = useState<SessionData>({
    actualDuration: 0,
    sessionType: '',
    symptoms: '',
    evolutionNotes: '',
    treatmentPlan: '',
    progressNotes: '',
    nextAppointmentNotes: '',
    medications: '',
    vitalSigns: {},
    sessionValue: 0,
    paymentMethod: 'dinheiro',
    hasDiscount: false,
    discountPercentage: 0,
    finalValue: 0,
    isPaid: false,
    paymentNotes: '',
    professionalDifficulties: '',
    clientResponse: '',
    interventionTechniques: '',
    professionalObservations: '',
    nextSessionPreparation: '',
    professionalEffort: 5,
    sessionQuality: 5,
    clientSatisfaction: 5,
    environmentConditions: '',
    equipmentUsed: '',
    followUpRequired: false,
    urgentNotes: '',
    familyPresent: false,
    familyObservations: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadStockItems();
      calculateScheduledDuration();
    }
  }, [isOpen, schedule]);

  useEffect(() => {
    const finalValue = sessionData.hasDiscount 
      ? sessionData.sessionValue * (1 - sessionData.discountPercentage / 100)
      : sessionData.sessionValue;
    setSessionData(prev => ({ ...prev, finalValue }));
  }, [sessionData.sessionValue, sessionData.hasDiscount, sessionData.discountPercentage]);

  const calculateScheduledDuration = () => {
    if (schedule?.start_time && schedule?.end_time) {
      const start = new Date(schedule.start_time);
      const end = new Date(schedule.end_time);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // em minutos
      setSessionData(prev => ({ ...prev, actualDuration: duration }));
    }
  };

  const loadStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, current_quantity, unit, category, unit_cost')
        .eq('is_active', true)
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

  const addMaterial = (stockItemId: string) => {
    const stockItem = stockItems.find(item => item.id === stockItemId);
    if (!stockItem) return;

    const existingMaterial = selectedMaterials.find(m => m.stock_item_id === stockItemId);
    if (existingMaterial) {
      toast({
        variant: "destructive",
        title: "Material já adicionado",
        description: "Este material já está na lista. Use os controles para ajustar a quantidade.",
      });
      return;
    }

    const newMaterial: SelectedMaterial = {
      stock_item_id: stockItemId,
      name: stockItem.name,
      quantity: 1,
      unit: stockItem.unit,
      unit_cost: stockItem.unit_cost,
      observation: ''
    };

    setSelectedMaterials([...selectedMaterials, newMaterial]);
  };

  const updateQuantity = (stockItemId: string, newQuantity: number) => {
    const stockItem = stockItems.find(item => item.id === stockItemId);
    if (!stockItem) return;

    if (newQuantity > stockItem.current_quantity) {
      toast({
        variant: "destructive",
        title: "Quantidade insuficiente",
        description: `Quantidade máxima disponível: ${stockItem.current_quantity} ${stockItem.unit}`,
      });
      return;
    }

    if (newQuantity <= 0) {
      removeMaterial(stockItemId);
      return;
    }

    setSelectedMaterials(materials =>
      materials.map(m =>
        m.stock_item_id === stockItemId ? { ...m, quantity: newQuantity } : m
      )
    );
  };

  const updateMaterialObservation = (stockItemId: string, observation: string) => {
    setSelectedMaterials(materials =>
      materials.map(m =>
        m.stock_item_id === stockItemId ? { ...m, observation } : m
      )
    );
  };

  const removeMaterial = (stockItemId: string) => {
    setSelectedMaterials(materials => 
      materials.filter(m => m.stock_item_id !== stockItemId)
    );
  };

  const handleConfirm = async () => {
    if (!schedule) return;

    setLoading(true);
    try {
      await onConfirm(schedule.id, sessionData, selectedMaterials);
      
      // Reset form
      setSelectedMaterials([]);
      setSessionData({
        actualDuration: 0,
        sessionType: '',
        symptoms: '',
        evolutionNotes: '',
        treatmentPlan: '',
        progressNotes: '',
        nextAppointmentNotes: '',
        medications: '',
        vitalSigns: {},
        sessionValue: 0,
        paymentMethod: 'dinheiro',
        hasDiscount: false,
        discountPercentage: 0,
        finalValue: 0,
        isPaid: false,
        paymentNotes: '',
        professionalDifficulties: '',
        clientResponse: '',
        interventionTechniques: '',
        professionalObservations: '',
        nextSessionPreparation: '',
        professionalEffort: 5,
        sessionQuality: 5,
        clientSatisfaction: 5,
        environmentConditions: '',
        equipmentUsed: '',
        followUpRequired: false,
        urgentNotes: '',
        familyPresent: false,
        familyObservations: ''
      });
      onClose();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableItems = stockItems.filter(item => 
    !selectedMaterials.some(m => m.stock_item_id === item.id)
  );

  const groupedItems = availableItems.reduce((groups, item) => {
    const category = item.category || 'Outros';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, StockItem[]>);

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button
            key={rating}
            type="button"
            size="sm"
            variant={rating <= value ? "default" : "outline"}
            onClick={() => onChange(rating)}
            className="p-1"
          >
            <Star className={`h-4 w-4 ${rating <= value ? 'fill-current' : ''}`} />
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="h-6 w-6 text-primary" />
            Confirmar Atendimento Completo
          </DialogTitle>
        </DialogHeader>

        {schedule && (
          <div className="space-y-6">
            {/* Appointment Details */}
            <Card className="gradient-card shadow-professional">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Detalhes do Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Paciente</Label>
                    <p className="font-medium">{schedule.clients?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Profissional</Label>
                    <p className="font-medium">{schedule.profiles?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tipo de Atendimento</Label>
                    <p className="font-medium">{schedule.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Horário</Label>
                    <p className="font-medium">
                      {format(new Date(schedule.start_time), 'HH:mm', { locale: ptBR })} às{' '}
                      {format(new Date(schedule.end_time), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="clinical" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="clinical" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Clínico
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="professional" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profissional
                </TabsTrigger>
                <TabsTrigger value="materials" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Materiais
                </TabsTrigger>
                <TabsTrigger value="additional" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Adicional
                </TabsTrigger>
              </TabsList>

              {/* DADOS CLÍNICOS */}
              <TabsContent value="clinical" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Clínicas da Sessão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="duration">Duração Real (minutos)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={sessionData.actualDuration}
                          onChange={(e) => setSessionData(prev => ({ ...prev, actualDuration: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sessionType">Tipo de Sessão</Label>
                        <Select
                          value={sessionData.sessionType}
                          onValueChange={(value) => setSessionData(prev => ({ ...prev, sessionType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consulta_inicial">Consulta Inicial</SelectItem>
                            <SelectItem value="terapia_individual">Terapia Individual</SelectItem>
                            <SelectItem value="avaliacao_neuropsicologica">Avaliação Neuropsicológica</SelectItem>
                            <SelectItem value="terapia_comportamental">Terapia Comportamental</SelectItem>
                            <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                            <SelectItem value="retorno">Retorno</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="symptoms">Sintomas Observados</Label>
                      <Textarea
                        id="symptoms"
                        value={sessionData.symptoms}
                        onChange={(e) => setSessionData(prev => ({ ...prev, symptoms: e.target.value }))}
                        placeholder="Descreva os sintomas observados durante a sessão..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="evolutionNotes">Evolução do Paciente</Label>
                      <Textarea
                        id="evolutionNotes"
                        value={sessionData.evolutionNotes}
                        onChange={(e) => setSessionData(prev => ({ ...prev, evolutionNotes: e.target.value }))}
                        placeholder="Como o paciente evoluiu desde a última sessão..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="treatmentPlan">Plano de Tratamento</Label>
                      <Textarea
                        id="treatmentPlan"
                        value={sessionData.treatmentPlan}
                        onChange={(e) => setSessionData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                        placeholder="Plano de tratamento atualizado..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="progressNotes">Notas de Progresso</Label>
                      <Textarea
                        id="progressNotes"
                        value={sessionData.progressNotes}
                        onChange={(e) => setSessionData(prev => ({ ...prev, progressNotes: e.target.value }))}
                        placeholder="Progresso observado nesta sessão..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="nextAppointmentNotes">Orientações para Próxima Sessão</Label>
                      <Textarea
                        id="nextAppointmentNotes"
                        value={sessionData.nextAppointmentNotes}
                        onChange={(e) => setSessionData(prev => ({ ...prev, nextAppointmentNotes: e.target.value }))}
                        placeholder="O que preparar para a próxima sessão..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="medications">Medicações/Prescrições</Label>
                      <Textarea
                        id="medications"
                        value={sessionData.medications}
                        onChange={(e) => setSessionData(prev => ({ ...prev, medications: e.target.value }))}
                        placeholder="Medicações prescritas ou alterações..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Sinais Vitais (Opcional)</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm">Pressão Arterial</Label>
                          <Input
                            placeholder="120/80"
                            value={sessionData.vitalSigns.bloodPressure || ''}
                            onChange={(e) => setSessionData(prev => ({
                              ...prev,
                              vitalSigns: { ...prev.vitalSigns, bloodPressure: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Freq. Cardíaca</Label>
                          <Input
                            placeholder="75 bpm"
                            value={sessionData.vitalSigns.heartRate || ''}
                            onChange={(e) => setSessionData(prev => ({
                              ...prev,
                              vitalSigns: { ...prev.vitalSigns, heartRate: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Temperatura</Label>
                          <Input
                            placeholder="36.5°C"
                            value={sessionData.vitalSigns.temperature || ''}
                            onChange={(e) => setSessionData(prev => ({
                              ...prev,
                              vitalSigns: { ...prev.vitalSigns, temperature: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DADOS FINANCEIROS */}
              <TabsContent value="financial" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Financeiras</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sessionValue">Valor da Sessão (R$)</Label>
                        <Input
                          id="sessionValue"
                          type="number"
                          step="0.01"
                          value={sessionData.sessionValue}
                          onChange={(e) => setSessionData(prev => ({ ...prev, sessionValue: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                        <Select
                          value={sessionData.paymentMethod}
                          onValueChange={(value) => setSessionData(prev => ({ ...prev, paymentMethod: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                            <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                            <SelectItem value="transferencia">Transferência</SelectItem>
                            <SelectItem value="convenio">Convênio</SelectItem>
                            <SelectItem value="particular">Particular</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasDiscount"
                        checked={sessionData.hasDiscount}
                        onCheckedChange={(checked) => setSessionData(prev => ({ ...prev, hasDiscount: checked }))}
                      />
                      <Label htmlFor="hasDiscount">Aplicar desconto</Label>
                    </div>

                    {sessionData.hasDiscount && (
                      <div>
                        <Label htmlFor="discountPercentage">Percentual de Desconto (%)</Label>
                        <Input
                          id="discountPercentage"
                          type="number"
                          min="0"
                          max="100"
                          value={sessionData.discountPercentage}
                          onChange={(e) => setSessionData(prev => ({ ...prev, discountPercentage: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Valor Final: R$ {sessionData.finalValue.toFixed(2)}</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPaid"
                        checked={sessionData.isPaid}
                        onCheckedChange={(checked) => setSessionData(prev => ({ ...prev, isPaid: checked }))}
                      />
                      <Label htmlFor="isPaid">Pagamento realizado</Label>
                    </div>

                    <div>
                      <Label htmlFor="paymentNotes">Observações do Pagamento</Label>
                      <Textarea
                        id="paymentNotes"
                        value={sessionData.paymentNotes}
                        onChange={(e) => setSessionData(prev => ({ ...prev, paymentNotes: e.target.value }))}
                        placeholder="Observações sobre o pagamento..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* RELATÓRIO PROFISSIONAL */}
              <TabsContent value="professional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Relatório do Profissional</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="professionalDifficulties">Dificuldades Encontradas</Label>
                      <Textarea
                        id="professionalDifficulties"
                        value={sessionData.professionalDifficulties}
                        onChange={(e) => setSessionData(prev => ({ ...prev, professionalDifficulties: e.target.value }))}
                        placeholder="Descreva as dificuldades encontradas durante a sessão..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="clientResponse">Resposta do Paciente</Label>
                      <Textarea
                        id="clientResponse"
                        value={sessionData.clientResponse}
                        onChange={(e) => setSessionData(prev => ({ ...prev, clientResponse: e.target.value }))}
                        placeholder="Como o paciente respondeu às intervenções..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="interventionTechniques">Técnicas de Intervenção Utilizadas</Label>
                      <Textarea
                        id="interventionTechniques"
                        value={sessionData.interventionTechniques}
                        onChange={(e) => setSessionData(prev => ({ ...prev, interventionTechniques: e.target.value }))}
                        placeholder="Técnicas e abordagens utilizadas..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="professionalObservations">Observações Profissionais</Label>
                      <Textarea
                        id="professionalObservations"
                        value={sessionData.professionalObservations}
                        onChange={(e) => setSessionData(prev => ({ ...prev, professionalObservations: e.target.value }))}
                        placeholder="Observações gerais do profissional..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="nextSessionPreparation">Preparação para Próxima Sessão</Label>
                      <Textarea
                        id="nextSessionPreparation"
                        value={sessionData.nextSessionPreparation}
                        onChange={(e) => setSessionData(prev => ({ ...prev, nextSessionPreparation: e.target.value }))}
                        placeholder="O que preparar para a próxima sessão..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StarRating
                        value={sessionData.professionalEffort}
                        onChange={(value) => setSessionData(prev => ({ ...prev, professionalEffort: value }))}
                        label="Esforço Profissional"
                      />
                      <StarRating
                        value={sessionData.sessionQuality}
                        onChange={(value) => setSessionData(prev => ({ ...prev, sessionQuality: value }))}
                        label="Qualidade da Sessão"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MATERIAIS */}
              <TabsContent value="materials" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Controle de Materiais Utilizados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category}>
                          <Label className="text-sm font-medium text-primary mb-2 block">
                            {category} ({items.length} itens)
                          </Label>
                          <Select onValueChange={addMaterial}>
                            <SelectTrigger>
                              <SelectValue placeholder={`Selecione um item de ${category.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
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
                      ))}
                    </div>

                    {selectedMaterials.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium">Materiais Selecionados</h4>
                        {selectedMaterials.map((material) => {
                          const stockItem = stockItems.find(item => item.id === material.stock_item_id);
                          const totalCost = (material.unit_cost || 0) * material.quantity;
                          return (
                            <div key={material.stock_item_id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Package className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="font-medium">{material.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Disponível: {stockItem?.current_quantity} {material.unit} | Custo unitário: R$ {(material.unit_cost || 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateQuantity(material.stock_item_id, material.quantity - 1)}
                                    disabled={material.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={stockItem?.current_quantity}
                                    value={material.quantity}
                                    onChange={(e) => updateQuantity(material.stock_item_id, parseInt(e.target.value) || 1)}
                                    className="w-16 text-center"
                                  />
                                  <span className="text-sm font-medium min-w-fit">{material.unit}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateQuantity(material.stock_item_id, material.quantity + 1)}
                                    disabled={material.quantity >= (stockItem?.current_quantity || 0)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeMaterial(material.stock_item_id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Input
                                  placeholder="Observação sobre o uso do material..."
                                  value={material.observation || ''}
                                  onChange={(e) => updateMaterialObservation(material.stock_item_id, e.target.value)}
                                  className="flex-1 mr-4"
                                />
                                <Badge variant="secondary">Total: R$ {totalCost.toFixed(2)}</Badge>
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-right">
                          <Badge variant="outline" className="text-lg p-2">
                            Custo Total dos Materiais: R$ {selectedMaterials.reduce((total, material) => 
                              total + ((material.unit_cost || 0) * material.quantity), 0
                            ).toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DADOS ADICIONAIS */}
              <TabsContent value="additional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StarRating
                      value={sessionData.clientSatisfaction}
                      onChange={(value) => setSessionData(prev => ({ ...prev, clientSatisfaction: value }))}
                      label="Satisfação do Paciente"
                    />

                    <div>
                      <Label htmlFor="environmentConditions">Condições do Ambiente</Label>
                      <Textarea
                        id="environmentConditions"
                        value={sessionData.environmentConditions}
                        onChange={(e) => setSessionData(prev => ({ ...prev, environmentConditions: e.target.value }))}
                        placeholder="Temperatura, ruído, iluminação, outros fatores ambientais..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="equipmentUsed">Equipamentos Utilizados</Label>
                      <Textarea
                        id="equipmentUsed"
                        value={sessionData.equipmentUsed}
                        onChange={(e) => setSessionData(prev => ({ ...prev, equipmentUsed: e.target.value }))}
                        placeholder="Computadores, tablets, jogos, brinquedos terapêuticos..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="followUpRequired"
                        checked={sessionData.followUpRequired}
                        onCheckedChange={(checked) => setSessionData(prev => ({ ...prev, followUpRequired: checked }))}
                      />
                      <Label htmlFor="followUpRequired">Requer acompanhamento urgente</Label>
                    </div>

                    {sessionData.followUpRequired && (
                      <div>
                        <Label htmlFor="urgentNotes">Notas Urgentes</Label>
                        <Textarea
                          id="urgentNotes"
                          value={sessionData.urgentNotes}
                          onChange={(e) => setSessionData(prev => ({ ...prev, urgentNotes: e.target.value }))}
                          placeholder="Descreva a situação que requer acompanhamento urgente..."
                          rows={3}
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="familyPresent"
                        checked={sessionData.familyPresent}
                        onCheckedChange={(checked) => setSessionData(prev => ({ ...prev, familyPresent: checked }))}
                      />
                      <Label htmlFor="familyPresent">Família presente na sessão</Label>
                    </div>

                    {sessionData.familyPresent && (
                      <div>
                        <Label htmlFor="familyObservations">Observações sobre a Família</Label>
                        <Textarea
                          id="familyObservations"
                          value={sessionData.familyObservations}
                          onChange={(e) => setSessionData(prev => ({ ...prev, familyObservations: e.target.value }))}
                          placeholder="Participação da família, orientações dadas, reações..."
                          rows={3}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 shadow-professional"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Atendimento Completo
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
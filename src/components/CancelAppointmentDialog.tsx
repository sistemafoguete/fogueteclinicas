import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, XCircle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface Schedule {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  client_id?: string;
  clients?: { name: string };
  profiles?: { name: string };
}

interface FutureSession {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
}

interface CancelAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onCancel: (scheduleId: string, reason: string, category: string) => Promise<void>;
  onCancelMultiple?: (scheduleIds: string[], reason: string, category: string) => Promise<void>;
}

const CANCELLATION_CATEGORIES = [
  { value: 'client_request', label: 'Solicitação do Paciente' },
  { value: 'professional_unavailable', label: 'Indisponibilidade do Profissional' },
  { value: 'emergency', label: 'Emergência' },
  { value: 'illness', label: 'Doença' },
  { value: 'equipment_failure', label: 'Problema com Equipamentos' },
  { value: 'weather', label: 'Condições Climáticas' },
  { value: 'administrative', label: 'Motivo Administrativo' },
  { value: 'other', label: 'Outro' },
];

export function CancelAppointmentDialog({ 
  isOpen, 
  onClose, 
  schedule, 
  onCancel,
  onCancelMultiple
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelOption, setCancelOption] = useState<'single' | 'all'>('single');
  const [futureSessions, setFutureSessions] = useState<FutureSession[]>([]);
  const [loadingFutureSessions, setLoadingFutureSessions] = useState(false);

  // Buscar sessões futuras do mesmo paciente quando o diálogo abrir
  useEffect(() => {
    const fetchFutureSessions = async () => {
      if (!isOpen || !schedule?.client_id) {
        setFutureSessions([]);
        return;
      }

      setLoadingFutureSessions(true);
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('id, start_time, end_time, title')
          .eq('client_id', schedule.client_id)
          .in('status', ['scheduled', 'confirmed'])
          .gt('start_time', schedule.start_time)
          .order('start_time', { ascending: true });

        if (error) throw error;
        setFutureSessions(data || []);
      } catch (error) {
        console.error('Error fetching future sessions:', error);
        setFutureSessions([]);
      } finally {
        setLoadingFutureSessions(false);
      }
    };

    fetchFutureSessions();
  }, [isOpen, schedule?.client_id, schedule?.start_time]);

  const handleCancel = async () => {
    if (!schedule) return;

    if (!reason.trim()) {
      return;
    }

    if (!category) {
      return;
    }

    setLoading(true);
    try {
      if (cancelOption === 'all' && futureSessions.length > 0 && onCancelMultiple) {
        // Cancelar este atendimento e todas as sessões futuras
        const allIds = [schedule.id, ...futureSessions.map(s => s.id)];
        await onCancelMultiple(allIds, reason.trim(), category);
      } else {
        // Cancelar apenas este atendimento
        await onCancel(schedule.id, reason.trim(), category);
      }
      
      // Reset form
      setReason('');
      setCategory('');
      setCancelOption('single');
      onClose();
    } catch (error) {
      console.error('Error canceling appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setCategory('');
    setCancelOption('single');
    onClose();
  };

  const isFormValid = reason.trim().length >= 10 && category;
  const hasFutureSessions = futureSessions.length > 0;
  const totalCancellations = cancelOption === 'all' ? futureSessions.length + 1 : 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
            <XCircle className="h-5 w-5" />
            Cancelar Agendamento
          </DialogTitle>
        </DialogHeader>

        {schedule && (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-destructive">Atenção</h4>
                <p className="text-xs text-destructive/80">
                  Esta ação cancelará permanentemente o agendamento. O paciente será notificado automaticamente via email sobre o cancelamento.
                </p>
              </div>
            </div>

            {/* Appointment Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Detalhes do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Paciente</Label>
                    <p className="text-sm font-medium">{schedule.clients?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Profissional</Label>
                    <p className="text-sm font-medium">{schedule.profiles?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Tipo de Atendimento</Label>
                    <p className="text-sm font-medium">{schedule.title}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Horário</Label>
                    <p className="text-sm font-medium">
                      {format(new Date(schedule.start_time), 'HH:mm', { locale: ptBR })} às{' '}
                      {format(new Date(schedule.end_time), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opção de cancelamento - apenas mostra se houver sessões futuras */}
            {hasFutureSessions && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Calendar className="h-4 w-4" />
                    Sessões Futuras Encontradas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Este paciente possui <span className="font-bold text-amber-700 dark:text-amber-400">{futureSessions.length}</span> sessão(ões) futura(s) agendada(s).
                  </p>

                  <RadioGroup
                    value={cancelOption}
                    onValueChange={(value) => setCancelOption(value as 'single' | 'all')}
                    className="space-y-2"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="single" id="single" className="mt-0.5" />
                      <Label htmlFor="single" className="flex-1 cursor-pointer">
                        <span className="font-medium">Cancelar apenas este atendimento</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          As sessões futuras permanecerão agendadas.
                        </p>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                      <RadioGroupItem value="all" id="all" className="mt-0.5" />
                      <Label htmlFor="all" className="flex-1 cursor-pointer">
                        <span className="font-medium text-destructive">Cancelar todas as sessões futuras</span>
                        <p className="text-xs text-destructive/80 mt-0.5">
                          Serão canceladas {futureSessions.length + 1} sessões no total.
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>

                  {cancelOption === 'all' && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Sessões que serão canceladas:</p>
                      <ul className="space-y-1">
                        <li className="text-xs flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-destructive"></span>
                          <span className="font-medium">
                            {format(new Date(schedule.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-muted-foreground">(atual)</span>
                        </li>
                        {futureSessions.map((session) => (
                          <li key={session.id} className="text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>
                              {format(new Date(session.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cancellation Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="category" className="text-sm font-semibold text-destructive">
                  Categoria do Cancelamento *
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione a categoria do cancelamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason" className="text-sm font-semibold text-destructive">
                  Motivo do Cancelamento *
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva detalhadamente o motivo do cancelamento (mínimo 10 caracteres)"
                  rows={3}
                  className="resize-none mt-1.5"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reason.length}/10 caracteres mínimos
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} disabled={loading} size="sm">
                Voltar
              </Button>
              <Button 
                onClick={handleCancel} 
                disabled={loading || !isFormValid}
                variant="destructive"
                size="sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-2" />
                    {cancelOption === 'all' && hasFutureSessions 
                      ? `Cancelar ${totalCancellations} Sessões`
                      : 'Confirmar Cancelamento'
                    }
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

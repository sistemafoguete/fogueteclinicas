import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Schedule {
  id: string;
  client_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  notes?: string;
  clients?: { name: string };
  profiles?: { name: string };
}

interface FutureSession {
  id: string;
  start_time: string;
  title: string;
}

interface DeleteAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onDelete: (scheduleId: string) => Promise<void>;
  onDeleteMultiple: (scheduleIds: string[]) => Promise<void>;
}

export function DeleteAppointmentDialog({ 
  isOpen, 
  onClose, 
  schedule, 
  onDelete,
  onDeleteMultiple 
}: DeleteAppointmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'single' | 'all'>('single');
  const [futureSessions, setFutureSessions] = useState<FutureSession[]>([]);
  const [loadingFutureSessions, setLoadingFutureSessions] = useState(false);

  // Buscar sessões futuras do mesmo paciente
  useEffect(() => {
    const fetchFutureSessions = async () => {
      if (!schedule?.client_id || !isOpen) return;
      
      setLoadingFutureSessions(true);
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('id, start_time, title')
          .eq('client_id', schedule.client_id)
          .gte('start_time', new Date().toISOString())
          .neq('id', schedule.id)
          .in('status', ['scheduled', 'confirmed'])
          .order('start_time', { ascending: true });

        if (error) throw error;
        setFutureSessions(data || []);
      } catch (error) {
        console.error('Error fetching future sessions:', error);
      } finally {
        setLoadingFutureSessions(false);
      }
    };

    fetchFutureSessions();
  }, [schedule?.client_id, schedule?.id, isOpen]);

  const handleDelete = async () => {
    if (!schedule) return;
    
    setLoading(true);
    try {
      if (deleteOption === 'all' && futureSessions.length > 0) {
        const allIds = [schedule.id, ...futureSessions.map(s => s.id)];
        await onDeleteMultiple(allIds);
      } else {
        await onDelete(schedule.id);
      }
      handleClose();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDeleteOption('single');
    setFutureSessions([]);
    onClose();
  };

  if (!schedule) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Atendimento
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O atendimento será permanentemente removido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do agendamento */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Atenção!</p>
                <p className="text-sm text-muted-foreground">
                  Você está prestes a excluir permanentemente este atendimento.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Paciente:</span> {schedule.clients?.name || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Profissional:</span> {schedule.profiles?.name || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Data/Hora:</span>{' '}
              {format(new Date(schedule.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-sm">
              <span className="font-medium">Tipo:</span> {schedule.title}
            </p>
          </div>

          {/* Opções de exclusão */}
          {loadingFutureSessions ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verificando sessões futuras...</span>
            </div>
          ) : futureSessions.length > 0 ? (
            <div className="space-y-3">
              <Label>O que deseja excluir?</Label>
              <RadioGroup value={deleteOption} onValueChange={(v) => setDeleteOption(v as 'single' | 'all')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer flex-1">
                    Excluir só este atendimento
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border border-destructive/30 rounded-lg hover:bg-destructive/5 cursor-pointer">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer flex-1">
                    <span className="text-destructive font-medium">
                      Excluir todas as sessões futuras ({futureSessions.length + 1} atendimentos)
                    </span>
                  </Label>
                </div>
              </RadioGroup>

              {deleteOption === 'all' && (
                <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Sessões que serão excluídas:</p>
                  <ul className="space-y-1">
                    <li className="text-xs">
                      • {format(new Date(schedule.start_time), "dd/MM/yyyy HH:mm", { locale: ptBR })} - {schedule.title}
                    </li>
                    {futureSessions.map(session => (
                      <li key={session.id} className="text-xs">
                        • {format(new Date(session.start_time), "dd/MM/yyyy HH:mm", { locale: ptBR })} - {session.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteOption === 'all' && futureSessions.length > 0 
                  ? `Excluir ${futureSessions.length + 1} Atendimentos` 
                  : 'Excluir Atendimento'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

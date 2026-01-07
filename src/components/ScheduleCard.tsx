import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, User, Edit, CheckCircle, XCircle, ArrowRightLeft, Stethoscope, Trash2, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PatientPresenceButton from '@/components/PatientPresenceButton';
import { UserAvatar } from '@/components/UserAvatar';

interface Schedule {
  id: string;
  client_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  notes?: string;
  unit?: string;
  patient_arrived?: boolean;
  arrived_at?: string;
  arrived_confirmed_by?: string;
  clients?: { name: string };
  profiles?: { name: string };
}

interface ScheduleCardProps {
  schedule: Schedule;
  employees: any[];
  userProfile: any;
  isAdmin: boolean;
  canCancelSchedules: boolean;
  canDeleteSchedules: boolean;
  onEdit: (schedule: Schedule) => void;
  onRedirect: (scheduleId: string, newEmployeeId: string) => void;
  onCancelClick: () => void;
  onDeleteClick: () => void;
  onCompleteClick: () => void;
  onPresenceUpdate: () => void;
  getStatusBadge: (status: string) => { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string };
}

const unitColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  madre: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20', label: 'MADRE' },
  floresta: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20', label: 'FLORESTA' },
  atendimento_floresta: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/20', label: 'ATEND. FLORESTA' },
};

export const ScheduleCard = ({
  schedule,
  employees,
  userProfile,
  isAdmin,
  canCancelSchedules,
  canDeleteSchedules,
  onEdit,
  onRedirect,
  onCancelClick,
  onDeleteClick,
  onCompleteClick,
  onPresenceUpdate,
  getStatusBadge
}: ScheduleCardProps) => {
  const professional = employees.find(emp => emp.user_id === schedule.employee_id);
  const unitStyle = unitColors[schedule.unit || 'madre'] || unitColors.madre;
  const isCompleted = schedule.status === 'completed';
  const isCancelled = schedule.status === 'cancelled';
  const isPendingValidation = schedule.status === 'pending_validation';

  return (
    <div 
      className={`group relative rounded-xl border bg-card transition-all duration-300 hover:shadow-lg ${
        schedule.patient_arrived && !isCompleted && !isCancelled && !isPendingValidation
          ? 'border-emerald-400/50 ring-1 ring-emerald-400/30' 
          : isCompleted 
            ? 'border-green-400/30 bg-green-50/50 dark:bg-green-950/10'
            : isCancelled
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border hover:border-primary/30'
      }`}
    >
      {/* Barra lateral colorida por status */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
        schedule.patient_arrived && !isCompleted && !isCancelled && !isPendingValidation
          ? 'bg-emerald-500'
          : isCompleted 
            ? 'bg-green-500'
            : isCancelled
              ? 'bg-destructive'
              : isPendingValidation
                ? 'bg-amber-500'
                : 'bg-primary'
      }`} />
      
      <div className="p-4 pl-5">
        {/* Header: Horário + Unidade + Status */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 rounded-md border border-primary/10">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {format(new Date(schedule.start_time), 'HH:mm')} - {format(new Date(schedule.end_time), 'HH:mm')}
              </span>
            </div>
            <Badge variant="outline" className={`${unitStyle.bg} ${unitStyle.text} ${unitStyle.border} text-xs font-medium`}>
              <MapPin className="h-3 w-3 mr-1" />
              {unitStyle.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {schedule.patient_arrived && !isCompleted && !isCancelled && !isPendingValidation && (
              <Badge className="bg-emerald-500 text-white text-xs animate-pulse">
                ✓ Presente
              </Badge>
            )}
            <Badge 
              variant={getStatusBadge(schedule.status).variant}
              className={`text-xs ${getStatusBadge(schedule.status).className || ''}`}
            >
              {getStatusBadge(schedule.status).text}
            </Badge>
          </div>
        </div>

        {/* Conteúdo: Paciente e Profissional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Paciente */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
            <UserAvatar name={schedule.clients?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Paciente</p>
              <p className="font-medium text-sm truncate">{schedule.clients?.name || 'N/A'}</p>
            </div>
          </div>

          {/* Profissional */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
            <UserAvatar 
              name={professional?.name} 
              size="sm" 
              role={professional?.employee_role}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Profissional</p>
              <p className="font-medium text-sm truncate">{professional?.name || 'Não atribuído'}</p>
            </div>
          </div>
        </div>

        {/* Tipo de atendimento */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            <Stethoscope className="h-3 w-3 mr-1" />
            {schedule.title}
          </Badge>
          {schedule.arrived_at && (
            <span className="text-xs text-muted-foreground">
              Chegou às {format(new Date(schedule.arrived_at), 'HH:mm')}
            </span>
          )}
        </div>

        {/* Observações */}
        {schedule.notes && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-amber-700 dark:text-amber-400">Obs:</span>{' '}
              <span className="text-foreground">{schedule.notes}</span>
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50 flex-wrap">
          {/* Botão de presença para recepcionistas */}
          <div>
            {(userProfile?.employee_role === 'receptionist' || isAdmin) && ['scheduled', 'confirmed'].includes(schedule.status) && (
              <PatientPresenceButton
                scheduleId={schedule.id}
                clientName={schedule.clients?.name || 'Cliente'}
                employeeId={schedule.employee_id}
                patientArrived={schedule.patient_arrived || false}
                arrivedAt={schedule.arrived_at}
                onPresenceUpdate={onPresenceUpdate}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(schedule)}
              className="h-8 text-xs gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>

            {['scheduled', 'confirmed'].includes(schedule.status) && (
              <>
                <Button
                  size="sm"
                  onClick={onCompleteClick}
                  className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Concluir
                </Button>

                {canCancelSchedules && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancelClick}
                    className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                )}

                {canDeleteSchedules && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDeleteClick}
                    className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
            
            {isPendingValidation && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Aguardando validação
              </span>
            )}

            {isAdmin && !isCompleted && !isCancelled && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Redirecionar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redirecionar Agendamento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Selecione o profissional para quem deseja redirecionar este agendamento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Select onValueChange={(value) => onRedirect(schedule.id, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(emp => emp.user_id !== schedule.employee_id).map((employee) => (
                        <SelectItem key={employee.user_id} value={employee.user_id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
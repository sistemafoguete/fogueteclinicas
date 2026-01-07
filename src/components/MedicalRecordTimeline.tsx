import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, FileText, Calendar, Activity, Pill } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface MedicalRecord {
  id: string;
  session_date: string;
  session_type: string;
  session_duration?: number;
  progress_notes: string;
  treatment_plan?: string;
  symptoms?: string;
  vital_signs?: any;
  medications?: any[];
  status?: string;
  profiles?: {
    name: string;
    employee_role: string;
  };
}

interface MedicalRecordTimelineProps {
  records: MedicalRecord[];
}

const getSessionTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'Consulta': 'bg-blue-500/10 text-blue-700 border-blue-200',
    'Avaliação': 'bg-purple-500/10 text-purple-700 border-purple-200',
    'Terapia': 'bg-green-500/10 text-green-700 border-green-200',
    'Retorno': 'bg-orange-500/10 text-orange-700 border-orange-200',
  };
  return colors[type] || 'bg-gray-500/10 text-gray-700 border-gray-200';
};

export const MedicalRecordTimeline = ({ records }: MedicalRecordTimelineProps) => {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum registro no prontuário ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record, index) => (
        <Card key={record.id} className="overflow-hidden">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Badge className={`${getSessionTypeColor(record.session_type)} border`}>
                    {record.session_type}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    #{records.length - index} · {format(new Date(record.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                {record.session_duration && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {record.session_duration} min
                  </div>
                )}
                {record.status && (
                  <Badge variant="outline" className="mt-1">
                    {record.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Profissional */}
            {record.profiles && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{record.profiles.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{record.profiles.employee_role}</span>
              </div>
            )}

            <Separator className="my-4" />

            {/* Sintomas */}
            {record.symptoms && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-red-500" />
                  <h4 className="font-semibold text-sm">Sintomas</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{record.symptoms}</p>
              </div>
            )}

            {/* Notas de Progresso */}
            {record.progress_notes && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h4 className="font-semibold text-sm">Evolução</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-6 whitespace-pre-wrap">
                  {record.progress_notes}
                </p>
              </div>
            )}

            {/* Plano de Tratamento */}
            {record.treatment_plan && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <h4 className="font-semibold text-sm">Plano de Tratamento</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-6 whitespace-pre-wrap">
                  {record.treatment_plan}
                </p>
              </div>
            )}

            {/* Medicações */}
            {record.medications && record.medications.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-purple-500" />
                  <h4 className="font-semibold text-sm">Medicações</h4>
                </div>
                <div className="ml-6 space-y-1">
                  {record.medications.map((med: any, idx: number) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      • {typeof med === 'string' ? med : med.name || 'Medicação não especificada'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Sinais Vitais */}
            {record.vital_signs && Object.keys(record.vital_signs).length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 mt-4">
                <h4 className="font-semibold text-sm mb-2">Sinais Vitais</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(record.vital_signs).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

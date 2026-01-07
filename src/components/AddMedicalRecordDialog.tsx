import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMedicalRecord } from '@/hooks/useMedicalRecords';

interface AddMedicalRecordDialogProps {
  clientId: string;
  employeeId: string;
}

export const AddMedicalRecordDialog = ({ clientId, employeeId }: AddMedicalRecordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    session_type: 'Consulta',
    session_date: new Date().toISOString().split('T')[0],
    session_duration: '',
    symptoms: '',
    progress_notes: '',
    treatment_plan: '',
  });

  const createRecord = useCreateMedicalRecord();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createRecord.mutateAsync({
      client_id: clientId,
      employee_id: employeeId,
      session_type: formData.session_type,
      session_date: formData.session_date,
      session_duration: formData.session_duration ? parseInt(formData.session_duration) : undefined,
      symptoms: formData.symptoms || undefined,
      progress_notes: formData.progress_notes,
      treatment_plan: formData.treatment_plan || undefined,
      status: 'completed',
    });

    setOpen(false);
    setFormData({
      session_type: 'Consulta',
      session_date: new Date().toISOString().split('T')[0],
      session_duration: '',
      symptoms: '',
      progress_notes: '',
      treatment_plan: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Registro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Registro no Prontuário</DialogTitle>
          <DialogDescription>
            Adicione uma nova entrada ao prontuário do paciente
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session_type">Tipo de Sessão *</Label>
              <Select
                value={formData.session_type}
                onValueChange={(value) => setFormData({ ...formData, session_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Avaliação">Avaliação</SelectItem>
                  <SelectItem value="Terapia">Terapia</SelectItem>
                  <SelectItem value="Retorno">Retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_date">Data da Sessão *</Label>
              <Input
                id="session_date"
                type="date"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_duration">Duração (minutos)</Label>
            <Input
              id="session_duration"
              type="number"
              placeholder="Ex: 60"
              value={formData.session_duration}
              onChange={(e) => setFormData({ ...formData, session_duration: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symptoms">Sintomas/Queixas</Label>
            <Textarea
              id="symptoms"
              placeholder="Descreva os sintomas ou queixas apresentados..."
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="progress_notes">Evolução/Notas *</Label>
            <Textarea
              id="progress_notes"
              placeholder="Descreva a evolução do paciente, observações e anotações da sessão..."
              value={formData.progress_notes}
              onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment_plan">Plano de Tratamento</Label>
            <Textarea
              id="treatment_plan"
              placeholder="Descreva o plano de tratamento, próximos passos, orientações..."
              value={formData.treatment_plan}
              onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createRecord.isPending}>
              {createRecord.isPending ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

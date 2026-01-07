import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Pill } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCreatePrescription, Medication } from '@/hooks/usePrescriptions';

interface AddPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const emptyMedication: Medication = {
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export default function AddPrescriptionDialog({ open, onOpenChange, clientId }: AddPrescriptionDialogProps) {
  const { user } = useAuth();
  const createPrescription = useCreatePrescription();
  
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMedication }]);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const handleAddMedication = () => {
    setMedications([...medications, { ...emptyMedication }]);
  };

  const handleRemoveMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate at least one medication with name
    const validMedications = medications.filter(m => m.name.trim());
    if (validMedications.length === 0) {
      return;
    }

    await createPrescription.mutateAsync({
      client_id: clientId,
      employee_id: user.id,
      prescription_date: prescriptionDate,
      medications: validMedications,
      diagnosis: diagnosis || undefined,
      general_instructions: generalInstructions || undefined,
      follow_up_notes: followUpNotes || undefined,
      status: 'active'
    });

    // Reset form
    setPrescriptionDate(new Date().toISOString().split('T')[0]);
    setDiagnosis('');
    setMedications([{ ...emptyMedication }]);
    setGeneralInstructions('');
    setFollowUpNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Nova Receita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Data e Diagnóstico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prescription-date">Data da Prescrição</Label>
              <Input
                id="prescription-date"
                type="date"
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico / Indicação</Label>
            <Textarea
              id="diagnosis"
              placeholder="Diagnóstico ou indicação clínica..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
            />
          </div>

          {/* Medicamentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medicamentos</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMedication}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {medications.map((med, index) => (
              <Card key={index} className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome do Medicamento *</Label>
                          <Input
                            placeholder="Ex: Ritalina"
                            value={med.name}
                            onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dosagem</Label>
                          <Input
                            placeholder="Ex: 10mg"
                            value={med.dosage}
                            onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Frequência</Label>
                          <Input
                            placeholder="Ex: 2x ao dia"
                            value={med.frequency}
                            onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Duração</Label>
                          <Input
                            placeholder="Ex: 30 dias"
                            value={med.duration}
                            onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Instruções</Label>
                          <Input
                            placeholder="Ex: Tomar após as refeições"
                            value={med.instructions}
                            onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    {medications.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMedication(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Orientações */}
          <div className="space-y-2">
            <Label htmlFor="general-instructions">Orientações Gerais</Label>
            <Textarea
              id="general-instructions"
              placeholder="Orientações gerais para o paciente..."
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up">Observações de Retorno</Label>
            <Textarea
              id="follow-up"
              placeholder="Ex: Retorno em 30 dias para reavaliação..."
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createPrescription.isPending || !medications.some(m => m.name.trim())}
          >
            {createPrescription.isPending ? 'Salvando...' : 'Salvar Receita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

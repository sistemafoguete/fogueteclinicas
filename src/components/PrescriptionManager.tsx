import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Pill, 
  Calendar, 
  User, 
  Download, 
  Printer,
  Eye,
  FileText
} from 'lucide-react';
import { usePrescriptions, Prescription, Medication } from '@/hooks/usePrescriptions';
import AddPrescriptionDialog from './AddPrescriptionDialog';
import { downloadPrescriptionPdf, printPrescriptionPdf } from '@/utils/prescriptionPdf';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  birth_date?: string;
}

interface PrescriptionManagerProps {
  client: Client;
}

export default function PrescriptionManager({ client }: PrescriptionManagerProps) {
  const { data: prescriptions, isLoading } = usePrescriptions(client.id);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const handleView = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setViewDialogOpen(true);
  };

  const handleDownload = (prescription: Prescription) => {
    const professionalName = prescription.employee?.name || 'Profissional';
    downloadPrescriptionPdf(prescription, client, professionalName);
  };

  const handlePrint = (prescription: Prescription) => {
    const professionalName = prescription.employee?.name || 'Profissional';
    printPrescriptionPdf(prescription, client, professionalName);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Receitas</h3>
          <Badge variant="secondary">{prescriptions?.length || 0}</Badge>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      {/* Empty State */}
      {(!prescriptions || prescriptions.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-medium mb-2">Nenhuma receita cadastrada</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Nova Receita" para adicionar a primeira prescrição do paciente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Prescription List */}
      {prescriptions && prescriptions.length > 0 && (
        <div className="space-y-3">
          {prescriptions.map((prescription) => (
            <Card key={prescription.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(prescription.prescription_date)}
                        </div>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          {prescription.employee?.name || 'Profissional'}
                        </div>
                        {prescription.status === 'active' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Cancelado</Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Medicamentos: </span>
                        {prescription.medications.map((m: Medication) => m.name).join(', ')}
                      </p>
                      {prescription.diagnosis && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {prescription.diagnosis}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="sm" onClick={() => handleView(prescription)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(prescription)}>
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePrint(prescription)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddPrescriptionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        clientId={client.id}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Detalhes da Receita
            </DialogTitle>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selectedPrescription.prescription_date)}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {selectedPrescription.employee?.name}
                </div>
              </div>

              {selectedPrescription.diagnosis && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Diagnóstico/Indicação</h4>
                  <p className="text-sm text-muted-foreground">{selectedPrescription.diagnosis}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm mb-2">Medicamentos</h4>
                <div className="space-y-3">
                  {selectedPrescription.medications.map((med: Medication, index: number) => (
                    <Card key={index} className="bg-muted/50">
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">{med.name} {med.dosage && `- ${med.dosage}`}</p>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          {med.frequency && <p>Frequência: {med.frequency}</p>}
                          {med.duration && <p>Duração: {med.duration}</p>}
                          {med.instructions && <p className="italic">Obs: {med.instructions}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedPrescription.general_instructions && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Orientações Gerais</h4>
                  <p className="text-sm text-muted-foreground">{selectedPrescription.general_instructions}</p>
                </div>
              )}

              {selectedPrescription.follow_up_notes && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Retorno</h4>
                  <p className="text-sm text-muted-foreground">{selectedPrescription.follow_up_notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => handleDownload(selectedPrescription)}>
                  <Download className="h-4 w-4 mr-1" />
                  Baixar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint(selectedPrescription)}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

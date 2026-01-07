import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkImportClientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ClientImportData {
  name: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  responsible_name?: string;
  responsible_cpf?: string;
  is_active: boolean;
  unit: string;
}

export function BulkImportClientsDialog({ isOpen, onClose, onImportComplete }: BulkImportClientsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ClientImportData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    await parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsedData: ClientImportData[] = jsonData.map((row: any) => {
        // Função para converter data do formato dd/mm/yyyy para yyyy-mm-dd
        const convertDate = (dateStr: string) => {
          if (!dateStr) return '';
          
          // Se já estiver no formato correto (yyyy-mm-dd), retorna como está
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
          
          // Se estiver no formato dd/mm/yyyy, converte
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          
          return '';
        };

        // Limpar e formatar CPF
        const cleanCPF = (cpf: string) => {
          if (!cpf) return '';
          return cpf.toString().replace(/\D/g, '');
        };

        return {
          name: row['Nome Completo'] || '',
          birth_date: convertDate(row['Data de Nascimento']) || '',
          phone: row['Telefone'] || '',
          email: row['E-mail'] || '',
          cpf: cleanCPF(row['CPF']) || '',
          responsible_name: row['Nome do Responsável'] || '',
          responsible_cpf: cleanCPF(row['CPF - Responsável']) || '',
          is_active: row['Ativo ou inativo']?.toLowerCase() === 'ativo',
          unit: 'floresta' // Definir unidade padrão como floresta (neuro)
        };
      });

      // Filtrar apenas linhas com nome preenchido
      const validData = parsedData.filter(item => item.name.trim() !== '');
      
      setImportData(validData);
      toast({
        title: "Arquivo processado",
        description: `${validData.length} clientes encontrados para importação.`,
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível processar o arquivo Excel.",
      });
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum dado para importar.",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < importData.length; i++) {
      const client = importData[i];
      
      try {
        // Verificar se cliente já existe pelo CPF ou nome
        let existingClient = null;
        
        if (client.cpf) {
          const { data } = await supabase
            .from('clients')
            .select('id, name')
            .eq('cpf', client.cpf)
            .single();
          existingClient = data;
        }

        if (!existingClient && client.name) {
          const { data } = await supabase
            .from('clients')
            .select('id, name')
            .ilike('name', client.name)
            .single();
          existingClient = data;
        }

        if (existingClient) {
          errors.push(`Cliente "${client.name}" já existe no sistema (${existingClient.name})`);
        } else {
          // Preparar dados para inserção
          const insertData: any = {
            name: client.name,
            phone: client.phone || null,
            email: client.email || null,
            birth_date: client.birth_date || null,
            cpf: client.cpf || null,
            responsible_name: client.responsible_name || null,
            is_active: client.is_active,
            unit: client.unit
          };

          const { error } = await supabase
            .from('clients')
            .insert(insertData);

          if (error) {
            errors.push(`Erro ao importar "${client.name}": ${error.message}`);
          } else {
            successCount++;
          }
        }
      } catch (error) {
        errors.push(`Erro inesperado ao processar "${client.name}": ${error}`);
      }

      setProgress(((i + 1) / importData.length) * 100);
    }

    setResults({ success: successCount, errors });
    setIsProcessing(false);

    if (successCount > 0) {
      toast({
        title: "Importação concluída",
        description: `${successCount} clientes importados com sucesso.`,
      });
      onImportComplete();
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportData([]);
    setResults(null);
    setProgress(0);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Lote de Clientes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!file && (
            <div className="border-2 border-dashed border-border rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-foreground">
                      Selecione um arquivo Excel (.xlsx)
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                    <Button type="button" variant="outline" className="mt-2">
                      Escolher arquivo
                    </Button>
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  O arquivo deve conter as colunas: Nome Completo, Data de Nascimento, Telefone, E-mail, CPF, Nome do Responsável, CPF - Responsável, Ativo ou inativo
                </p>
              </div>
            </div>
          )}

          {file && importData.length > 0 && !results && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium text-foreground">Arquivo: {file.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {importData.length} clientes encontrados para importação
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {importData.slice(0, 10).map((client, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-background border rounded">
                      <span className="text-sm">{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {client.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  ))}
                  {importData.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      ... e mais {importData.length - 10} clientes
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Importando clientes...</p>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Importação concluída: {results.success} clientes importados
                </span>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{results.errors.length} erro(s) encontrado(s):</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-destructive/10 p-3 rounded">
                    {results.errors.map((error, index) => (
                      <p key={index} className="text-xs text-destructive">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {results ? 'Fechar' : 'Cancelar'}
            </Button>
            {file && importData.length > 0 && !results && !isProcessing && (
              <Button onClick={handleImport}>
                Importar {importData.length} clientes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
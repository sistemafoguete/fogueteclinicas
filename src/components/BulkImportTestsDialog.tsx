import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BulkImportTestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface TestItem {
  testName: string;
  responseSheet: string;
  type: string;
  totalValue: number;
  quantityPerPurchase: number;
  unitValue: number;
  publisher: string;
  constructEvaluated: string;
  stockQuantity: number;
  observations: string;
}

export default function BulkImportTestsDialog({ isOpen, onClose, onUpdate }: BulkImportTestsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [parsedItems, setParsedItems] = useState<TestItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{success: number, errors: string[]}>({success: 0, errors: []});
  const [showResults, setShowResults] = useState(false);

  const parseCSVData = () => {
    try {
      const lines = csvData.trim().split('\n');
      const items: TestItem[] = [];
      
      console.log('Analisando dados...', { totalLines: lines.length });
      
      // Skip header line and parse data
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Detectar separador automaticamente (tab ou vírgula)
        let fields: string[];
        if (line.includes('\t')) {
          // Dados separados por tab
          fields = line.split('\t').map(field => field.trim().replace(/^"|"$/g, ''));
        } else {
          // Dados separados por vírgula - parsing mais sofisticado para lidar com vírgulas dentro de aspas
          fields = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current.trim().replace(/^"|"$/g, ''));
        }
        
        console.log(`Linha ${i}:`, { fieldsCount: fields.length, fields: fields.slice(0, 3) });
        
        if (fields.length >= 9) { // Reduzir para 9 campos mínimos ao invés de 10
          // Parse monetary values (remove R$ and convert commas to dots)
          const parseMoneyValue = (value: string): number => {
            if (!value || value === '#DIV/0!' || value === '') return 0;
            return parseFloat(value.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.')) || 0;
          };

          const parseIntValue = (value: string): number => {
            if (!value || value === '#DIV/0!' || value === '') return 0;
            return parseInt(value.replace(/\./g, '')) || 0;
          };

          items.push({
            testName: fields[0] || '',
            responseSheet: fields[1] || '',
            type: fields[2] || 'Bloco de Resposta',
            totalValue: parseMoneyValue(fields[3]),
            quantityPerPurchase: parseIntValue(fields[4]),
            unitValue: parseMoneyValue(fields[5]),
            publisher: fields[6] || '',
            constructEvaluated: fields[7] || '',
            stockQuantity: parseIntValue(fields[8]),
            observations: fields[9] || ''
          });
        } else {
          console.log(`Linha ${i} ignorada - poucos campos:`, fields.length);
        }
      }
      
      console.log('Total de itens identificados:', items.length);
      setParsedItems(items);
      toast({
        title: "Dados Analisados",
        description: `${items.length} itens de teste foram identificados para importação.`
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        variant: "destructive",
        title: "Erro na Análise",
        description: "Não foi possível analisar os dados. Verifique o formato."
      });
    }
  };

  const getCategoryForConstruct = (construct: string): string => {
    const constructMap: {[key: string]: string} = {
      'Inteligência': 'Testes Cognitivos',
      'Atenção': 'Testes Cognitivos',
      'Funções Executivas': 'Testes Cognitivos',
      'Habilidades Acadêmicas': 'Testes Acadêmicos',
      'Linguagem': 'Testes de Linguagem',
      'Personalidade': 'Testes de Personalidade',
      'Humor e Comportamento': 'Testes Comportamentais',
      'Desenvolvimento': 'Testes de Desenvolvimento',
      'Visuoconstrução': 'Testes Cognitivos',
      'Funcionamento Adaptativo': 'Testes Comportamentais'
    };
    
    return constructMap[construct] || 'Testes Psicológicos';
  };

  const importItems = async () => {
    if (parsedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum item para importar. Analise os dados primeiro."
      });
      return;
    }

    setLoading(true);
    setImportProgress(0);
    const results = { success: 0, errors: [] as string[] };

    try {
      for (let i = 0; i < parsedItems.length; i++) {
        const item = parsedItems[i];
        
        try {
          // Create the item name combining test name and response sheet
          const itemName = `${item.testName} - ${item.responseSheet}`;
          
          const { error } = await supabase
            .from('stock_items')
            .insert({
              name: itemName,
              description: `Editora: ${item.publisher}\nTipo: ${item.type}\nConstruto: ${item.constructEvaluated}\nObservações: ${item.observations}`,
              category: getCategoryForConstruct(item.constructEvaluated),
              unit: item.type === 'Folha de Resposta' ? 'Unidade' : 'Bloco de Resposta',
              current_quantity: item.stockQuantity,
              minimum_quantity: Math.max(5, Math.ceil(item.stockQuantity * 0.2)), // 20% do estoque atual ou mínimo 5
              unit_cost: item.unitValue,
              supplier: item.publisher,
              location: 'Sala de Testes',
              is_active: true,
              created_by: user?.id
            });

          if (error) {
            results.errors.push(`${itemName}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (error) {
          results.errors.push(`${item.responseSheet}: Erro inesperado - ${error}`);
        }

        setImportProgress(((i + 1) / parsedItems.length) * 100);
      }

      setImportResults(results);
      setShowResults(true);
      
      if (results.success > 0) {
        toast({
          title: "Importação Concluída",
          description: `${results.success} itens importados com sucesso!`
        });
        onUpdate();
      }

      if (results.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Alguns Erros Ocorreram",
          description: `${results.errors.length} itens não puderam ser importados.`
        });
      }

    } catch (error) {
      console.error('Bulk import error:', error);
      toast({
        variant: "destructive",
        title: "Erro na Importação",
        description: "Erro inesperado durante a importação em massa."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCsvData('');
    setParsedItems([]);
    setImportProgress(0);
    setImportResults({success: 0, errors: []});
    setShowResults(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importação em Massa - Testes Psicológicos
          </DialogTitle>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csvData">Cole os dados dos testes aqui:</Label>
              <Textarea
                id="csvData"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Cole aqui os dados dos testes psicológicos (formato separado por tabs)..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Cole os dados diretamente do Excel/planilha. O sistema irá identificar automaticamente os campos.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={parseCSVData}
                disabled={!csvData.trim() || loading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Analisar Dados ({csvData.trim().split('\n').length - 1} linhas)
              </Button>
            </div>

            {parsedItems.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {parsedItems.length} itens prontos para importação
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                      {parsedItems.slice(0, 9).map((item, index) => (
                        <div key={index} className="p-3 border rounded-lg text-sm">
                          <div className="font-medium truncate">{item.responseSheet}</div>
                          <div className="text-muted-foreground text-xs">
                            {item.publisher} • {item.constructEvaluated}
                          </div>
                          <div className="text-xs mt-1">
                            Estoque: {item.stockQuantity} • R$ {item.unitValue.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {parsedItems.length > 9 && (
                        <div className="p-3 border rounded-lg text-sm text-center text-muted-foreground">
                          +{parsedItems.length - 9} itens...
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando itens...</span>
                  <span>{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-xl font-semibold">Importação Concluída!</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                  <div className="text-sm text-muted-foreground">Itens importados com sucesso</div>
                </CardContent>
              </Card>
              
              {importResults.errors.length > 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                    <div className="text-sm text-muted-foreground">Itens com erro</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Erros encontrados:
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">{error}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {showResults ? 'Fechar' : 'Cancelar'}
          </Button>
          {!showResults && (
            <Button
              onClick={importItems}
              disabled={loading || parsedItems.length === 0}
            >
              {loading ? 'Importando...' : `Importar ${parsedItems.length} Itens`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
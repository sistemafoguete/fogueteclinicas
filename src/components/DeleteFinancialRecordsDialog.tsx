import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string;
  created_at: string;
  clients?: { name: string };
  profiles?: { name: string };
}

interface DeleteFinancialRecordsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteFinancialRecordsDialog({ open, onClose }: DeleteFinancialRecordsDialogProps) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFinancialRecords();
    }
  }, [open]);

  const loadFinancialRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          clients(name),
          profiles(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading financial records:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os registros financeiros."
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record =>
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.profiles?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.size === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos um registro para excluir."
      });
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .in('id', Array.from(selectedRecords));

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${selectedRecords.size} registro(s) financeiro(s) foram excluídos com sucesso.`
      });

      setSelectedRecords(new Set());
      loadFinancialRecords();
    } catch (error) {
      console.error('Error deleting financial records:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir os registros financeiros."
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setSelectedRecords(new Set());
    setSearchTerm('');
    onClose();
  };

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Excluir Registros Financeiros
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aviso de Segurança */}
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Atenção!</p>
              <p className="text-sm text-muted-foreground">
                Esta ação é irreversível. Os registros financeiros selecionados serão 
                permanentemente excluídos do sistema.
              </p>
            </div>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, categoria, cliente ou funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Seleção */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={filteredRecords.length > 0 && selectedRecords.size === filteredRecords.length}
                onCheckedChange={handleSelectAll}
                disabled={loading}
              />
              Selecionar todos ({filteredRecords.length} registros)
            </Label>
            {selectedRecords.size > 0 && (
              <Badge variant="secondary">
                {selectedRecords.size} registro(s) selecionado(s)
              </Badge>
            )}
          </div>

          {/* Tabela de Registros */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sel.</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Cliente/Funcionário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando registros...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRecords.has(record.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRecord(record.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(record.type)}>
                          {record.type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell className="max-w-xs truncate" title={record.description}>
                        {record.description}
                      </TableCell>
                      <TableCell>
                        R$ {record.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {record.clients?.name || record.profiles?.name || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={selectedRecords.size === 0 || deleting}
          >
            {deleting ? 'Excluindo...' : `Excluir ${selectedRecords.size} registro(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
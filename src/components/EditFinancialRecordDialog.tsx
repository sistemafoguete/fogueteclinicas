import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit2 } from 'lucide-react';

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  payment_method?: string;
  client_id?: string;
  created_at: string;
  clients?: { name: string };
}

interface EditFinancialRecordDialogProps {
  record: FinancialRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EditFinancialRecordDialog({ record, open, onClose, onSave }: EditFinancialRecordDialogProps) {
  const [formData, setFormData] = useState({
    type: '',
    category: '',
    amount: '',
    description: '',
    date: '',
    payment_method: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Atualizar formData quando o record mudar
  useEffect(() => {
    if (record) {
      setFormData({
        type: record.type,
        category: record.category,
        amount: record.amount.toString(),
        description: record.description || '',
        date: record.date,
        payment_method: record.payment_method || ''
      });
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('financial_records')
        .update({
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date,
          payment_method: formData.payment_method
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro financeiro atualizado com sucesso!"
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating financial record:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o registro financeiro."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: '',
      category: '',
      amount: '',
      description: '',
      date: '',
      payment_method: ''
    });
    onClose();
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Editar Registro Financeiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {formData.type === 'income' ? (
                  <>
                    <SelectItem value="consultation">Consulta</SelectItem>
                    <SelectItem value="therapy">Terapia</SelectItem>
                    <SelectItem value="evaluation">Avaliação</SelectItem>
                    <SelectItem value="foundation_revenue">Receita da Fundação</SelectItem>
                    <SelectItem value="other_income">Outras Receitas</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="supplies">Materiais</SelectItem>
                    <SelectItem value="equipment">Equipamentos</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="professional_payment">Pagamento Profissional</SelectItem>
                    <SelectItem value="utilities">Utilidades</SelectItem>
                    <SelectItem value="salary">Salário</SelectItem>
                    <SelectItem value="other_expense">Outras Despesas</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Forma de Pagamento</Label>
            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="bank_transfer">Transferência</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Digite uma descrição para a transação..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
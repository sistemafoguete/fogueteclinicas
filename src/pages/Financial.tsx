import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, Calendar, Download, Filter, FileText, StickyNote, Shield, Edit2, Trash2 } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCustomPermissions } from '@/hooks/useCustomPermissions';
import { EditFinancialRecordDialog } from '@/components/EditFinancialRecordDialog';
import { FinancialProjection } from '@/components/FinancialProjection';
import { DefaultManagementPanel } from '@/components/DefaultManagementPanel';
import { CostCenterAnalysis } from '@/components/CostCenterAnalysis';
import { PaymentReceiptGenerator } from '@/components/PaymentReceiptGenerator';

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

interface FinancialNote {
  id: string;
  note_date: string;
  note_text: string;
  note_type: string;
  created_at: string;
  profiles?: { name: string };
}

export default function Financial() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '' });
  const [unitFilter, setUnitFilter] = useState('all');
  const { toast } = useToast();
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useRolePermissions();
  const customPermissions = useCustomPermissions();

  const [newRecord, setNewRecord] = useState({
    type: 'income',
    category: 'consultation', // Valor padrão válido para income
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    client_id: ''
  });

  const [newNote, setNewNote] = useState({
    note_date: new Date().toISOString().split('T')[0],
    note_text: '',
    note_type: 'daily'
  });

  useEffect(() => {
    if (roleLoading || customPermissions.loading) return;
    
    // Verificar permissão: apenas diretor
    const hasAccess = userRole === 'director' || 
                      customPermissions.hasPermission('view_financial');
    
    if (!hasAccess) {
      toast({
        variant: "destructive",
        title: "Acesso Restrito",
        description: "Apenas diretores têm acesso ao sistema financeiro."
      });
      return;
    }
    
    loadFinancialRecords();
    loadFinancialNotes();
    loadPendingPayments();
  }, [roleLoading, userRole, customPermissions.loading]);

  const loadFinancialRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          clients (name, unit)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading financial records:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os registros financeiros.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_notes')
        .select('*')
        .order('note_date', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading financial notes:', error);
    }
  };

  const loadPendingPayments = async () => {
    try {
      // Buscar pagamentos pendentes
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('client_payments')
        .select(`
          id,
          client_id,
          total_amount,
          amount_paid,
          amount_remaining,
          payment_type,
          installments_total,
          installments_paid,
          status,
          due_date,
          description,
          created_at
        `)
        .eq('unit', 'madre')
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Buscar parcelas pendentes
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('payment_installments')
        .select(`
          id,
          client_payment_id,
          installment_number,
          amount,
          paid_amount,
          due_date,
          status,
          payment_method,
          notes
        `)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true });

      if (installmentsError) throw installmentsError;

      // Buscar informações dos clientes para os pagamentos
      const paymentClientIds = (paymentsData || []).map(p => p.client_id).filter(Boolean);
      
      // Buscar informações dos clientes para as parcelas
      const installmentPaymentIds = (installmentsData || []).map(i => i.client_payment_id).filter(Boolean);
      const { data: installmentPayments } = await supabase
        .from('client_payments')
        .select('id, client_id, description, payment_type')
        .in('id', installmentPaymentIds);

      const allClientIds = [
        ...paymentClientIds,
        ...(installmentPayments || []).map(p => p.client_id)
      ].filter(Boolean);

      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, phone')
        .in('id', allClientIds);

      const clientsMap = (clientsData || []).reduce((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {} as Record<string, any>);

      const paymentsMap = (installmentPayments || []).reduce((acc, payment) => {
        acc[payment.id] = payment;
        return acc;
      }, {} as Record<string, any>);

      // Combinar e processar dados
      const combinedData = [
        ...(paymentsData || []).map(payment => ({
          ...payment,
          type: 'payment',
          amount_due: payment.amount_remaining,
          client_name: clientsMap[payment.client_id]?.name,
          client_phone: clientsMap[payment.client_id]?.phone
        })),
        ...(installmentsData || []).map(installment => {
          const paymentInfo = paymentsMap[installment.client_payment_id];
          return {
            ...installment,
            type: 'installment',
            amount_due: installment.amount - installment.paid_amount,
            client_name: clientsMap[paymentInfo?.client_id]?.name,
            client_phone: clientsMap[paymentInfo?.client_id]?.phone,
            description: paymentInfo?.description,
            payment_type: paymentInfo?.payment_type
          };
        })
      ];

      setPendingPayments(combinedData);
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const handleCreateRecord = async () => {
    try {
      const { error } = await supabase
        .from('financial_records')
        .insert([{
          ...newRecord,
          amount: parseFloat(newRecord.amount),
          client_id: newRecord.client_id || null,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro financeiro criado com sucesso!",
      });
      
      setIsDialogOpen(false);
      setNewRecord({
        type: 'income',
        category: 'consultation', // Valor padrão válido para income
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        client_id: ''
      });
      loadFinancialRecords();
    } catch (error) {
      console.error('Error creating financial record:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o registro financeiro.",
      });
    }
  };

  const handleCreateNote = async () => {
    try {
      const { error } = await supabase
        .from('financial_notes')
        .insert([{
          ...newNote,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Nota adicionada com sucesso!",
      });
      
      setIsNoteDialogOpen(false);
      setNewNote({
        note_date: new Date().toISOString().split('T')[0],
        note_text: '',
        note_type: 'daily'
      });
      loadFinancialNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar a nota.",
      });
    }
  };

  const handleEditRecord = (record: FinancialRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro financeiro excluído com sucesso!"
      });

      loadFinancialRecords();
    } catch (error) {
      console.error('Error deleting financial record:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o registro financeiro."
      });
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (!dateFilter.start || record.date >= dateFilter.start) &&
      (!dateFilter.end || record.date <= dateFilter.end);
    
    const matchesType = typeFilter === 'all' || record.type === typeFilter;
    
    const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
    
    const matchesAmount = (!amountFilter.min || record.amount >= parseFloat(amountFilter.min)) &&
      (!amountFilter.max || record.amount <= parseFloat(amountFilter.max));
    
    const matchesUnit = unitFilter === 'all' || 
      (record.clients && 'unit' in record.clients && record.clients.unit === unitFilter);
    
    return matchesSearch && matchesDateRange && matchesType && matchesCategory && matchesAmount && matchesUnit;
  });

  const incomeRecords = filteredRecords.filter(r => r.type === 'income');
  const expenseRecords = filteredRecords.filter(r => r.type === 'expense');

  const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Current month calculations
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthRecords = filteredRecords.filter(r => {
    const recordDate = new Date(r.date);
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
  });
  const currentMonthIncome = currentMonthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const currentMonthExpenses = currentMonthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

  // Calcular totais de contas a receber
  const totalPendingAmount = pendingPayments.reduce((sum, payment) => sum + (payment.amount_due || 0), 0);
  const overduePayments = pendingPayments.filter(payment => {
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    return dueDate < today;
  });
  const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + (payment.amount_due || 0), 0);

  // Traduzir métodos de pagamento
  const translatePaymentMethod = (method: string | undefined): string => {
    if (!method) return 'Não informado';
    
    const translations: Record<string, string> = {
      'cash': 'Dinheiro',
      'contract': 'Contrato',
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'transfer': 'Transferência',
      'check': 'Cheque',
      'boleto': 'Boleto',
      'internal': 'Interno',
      'Manual': 'Manual',
      'Cartão': 'Cartão de Crédito',
      'Contrato': 'Contrato',
      'Dinheiro': 'Dinheiro'
    };
    
    return translations[method] || method;
  };

  const translateCategory = (category: string): string => {
    const translations: Record<string, string> = {
      // Receitas
      'consultation': 'Consulta',
      'therapy': 'Terapia',
      'evaluation': 'Avaliação',
      'foundation_revenue': 'Receita da Fundação',
      'other_income': 'Outras Receitas',
      
      // Despesas
      'supplies': 'Materiais',
      'equipment': 'Equipamentos',
      'maintenance': 'Manutenção',
      'salary': 'Salário',
      'utilities': 'Utilidades',
      'professional_payment': 'Pagamento Profissional',
      'other_expense': 'Outras Despesas'
    };
    return translations[category] || category;
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Forma de Pagamento'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        record.date,
        record.type === 'income' ? 'Receita' : 'Despesa',
        translateCategory(record.category),
        `"${record.description || ''}"`,
        record.amount.toFixed(2),
        translatePaymentMethod(record.payment_method)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório Exportado",
      description: "O arquivo CSV foi baixado com sucesso!",
    });
  };

  const clearFilters = () => {
    setDateFilter({ start: '', end: '' });
    setTypeFilter('all');
    setCategoryFilter('all');
    setAmountFilter({ min: '', max: '' });
    setUnitFilter('all');
    setSearchTerm('');
  };

  const filteredNotes = notes.filter(note => {
    const noteDate = new Date(note.note_date);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return noteDate.getMonth() === currentMonth && noteDate.getFullYear() === currentYear;
  });

  if (roleLoading || customPermissions.loading) {
    return <div className="p-6">Carregando...</div>;
  }

  const hasAccess = userRole === 'director' || 
                    customPermissions.hasPermission('view_financial');

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a diretores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 rounded-full" />
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 bg-clip-text text-transparent">
            Painel Financeiro
          </h1>
          <p className="text-muted-foreground mt-2">
            Controle receitas, despesas e fluxo de caixa
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportToCSV} className="gap-2 flex-1 sm:flex-none text-sm">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Baixar Relatório</span>
            <span className="sm:hidden">Baixar</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={newRecord.type} onValueChange={(value) => setNewRecord({ ...newRecord, type: value })}>
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
                  <Select value={newRecord.category} onValueChange={(value) => setNewRecord({ ...newRecord, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {newRecord.type === 'income' ? (
                        <>
                          <SelectItem value="consultation">Consulta</SelectItem>
                          <SelectItem value="therapy">Terapia</SelectItem>
                          <SelectItem value="evaluation">Avaliação</SelectItem>
                          <SelectItem value="other_income">Outros</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="supplies">Material</SelectItem>
                          <SelectItem value="equipment">Equipamento</SelectItem>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="salary">Salário</SelectItem>
                          <SelectItem value="utilities">Utilidades</SelectItem>
                          <SelectItem value="other_expense">Outros</SelectItem>
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
                    value={newRecord.amount}
                    onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Forma de Pagamento</Label>
                  <Select value={newRecord.payment_method} onValueChange={(value) => setNewRecord({ ...newRecord, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="bank_transfer">Transferência</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="contract">Contrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    placeholder="Descrição da transação"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRecord} disabled={!newRecord.category || !newRecord.amount}>
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Financial Summary Cards - Design Moderno */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-500/10 via-card to-green-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              R$ {currentMonthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentMonthRecords.filter(r => r.type === 'income').length} atendimentos
            </p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-500/10 via-card to-red-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
              R$ {currentMonthExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Materiais adquiridos</p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-500/10 via-card to-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPayments.length} pendentes
            </p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-orange-500/10 via-card to-orange-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              R$ {totalOverdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overduePayments.length} em atraso
            </p>
          </CardContent>
        </Card>
        
        <Card className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${balance >= 0 ? 'bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5' : 'bg-gradient-to-br from-red-500/10 via-card to-red-500/5'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
            <div className={`p-2 ${balance >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-lg`}>
              <TrendingUp className={`h-4 w-4 ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-2xl font-bold ${balance >= 0 ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-red-600 to-red-500'} bg-clip-text text-transparent`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-500/10 via-card to-purple-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
              {currentMonthRecords.filter(r => r.type === 'income').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart">Data Início</Label>
              <Input
                id="dateStart"
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">Data Fim</Label>
              <Input
                id="dateEnd"
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeFilter">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitFilter">Unidade</Label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="madre">Madre (Clínica Social)</SelectItem>
                  <SelectItem value="floresta">Floresta (Neuroavaliação)</SelectItem>
                  <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountMin">Valor Mín</Label>
              <Input
                id="amountMin"
                type="number"
                placeholder="0,00"
                value={amountFilter.min}
                onChange={(e) => setAmountFilter({ ...amountFilter, min: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountMax">Valor Máx</Label>
              <Input
                id="amountMax"
                type="number"
                placeholder="0,00"
                value={amountFilter.max}
                onChange={(e) => setAmountFilter({ ...amountFilter, max: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start p-1">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="pending">A Receber</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="projection">Projeção</TabsTrigger>
          <TabsTrigger value="default">Inadimplência</TabsTrigger>
          <TabsTrigger value="costcenter">Centro Custo</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Transações</CardTitle>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Carregando transações...</p>
              ) : filteredRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {searchTerm ? 'Nenhuma transação encontrada.' : 'Nenhuma transação registrada.'}
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[700px]">
                   <TableHeader>
                     <TableRow>
                       <TableHead>Data</TableHead>
                       <TableHead>Tipo</TableHead>
                       <TableHead>Categoria</TableHead>
                       <TableHead>Descrição</TableHead>
                       <TableHead>Valor</TableHead>
                       <TableHead>Pagamento</TableHead>
                       <TableHead>Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.type === 'income' ? "default" : "destructive"}>
                            {record.type === 'income' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </TableCell>
                        <TableCell>{translateCategory(record.category)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.description || '-'}
                        </TableCell>
                         <TableCell className={record.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                           {record.type === 'income' ? '+' : '-'} R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {translatePaymentMethod(record.payment_method)}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                             {record.type === 'income' && (
                               <PaymentReceiptGenerator 
                                 payment={{
                                   id: record.id,
                                   amount: record.amount,
                                   date: record.date,
                                   description: record.description || '',
                                   payment_method: record.payment_method || 'cash',
                                   client_name: record.clients?.name
                                 }}
                                 variant="icon"
                               />
                             )}
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleEditRecord(record)}
                             >
                               <Edit2 className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleDeleteRecord(record.id)}
                               className="text-destructive hover:text-destructive"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         </TableCell>
                       </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{translateCategory(record.category)}</TableCell>
                      <TableCell>{record.clients?.name || '-'}</TableCell>
                      <TableCell>{record.description || '-'}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        + R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{translateCategory(record.category)}</TableCell>
                      <TableCell>{record.description || '-'}</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        - R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Contas a Receber
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-blue-600">
                    Total: R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                  {totalOverdueAmount > 0 && (
                    <Badge variant="destructive">
                      Em Atraso: R$ {totalOverdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum pagamento pendente encontrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor Devido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Parcela</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => {
                      const dueDate = new Date(payment.due_date);
                      const today = new Date();
                      const isOverdue = dueDate < today;
                      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                      
                      return (
                        <TableRow key={`${payment.type}-${payment.id}`} className={isOverdue ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{payment.client_name || 'Paciente não identificado'}</p>
                              {payment.client_phone && (
                                <p className="text-xs text-muted-foreground">
                                  {payment.client_phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="truncate">{payment.description || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_type === 'avista' ? 'default' : 'secondary'}>
                              {payment.payment_type === 'avista' ? 'À Vista' : 'A Prazo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {dueDate.toLocaleDateString('pt-BR')}
                              <p className="text-xs text-muted-foreground">
                                {isOverdue 
                                  ? `${Math.abs(daysDiff)} dias em atraso` 
                                  : daysDiff === 0 
                                    ? 'Vence hoje' 
                                    : `${daysDiff} dias restantes`
                                }
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">
                            R$ {(payment.amount_due || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                isOverdue ? 'destructive' : 
                                payment.status === 'partial' ? 'default' : 
                                'secondary'
                              }
                            >
                              {isOverdue ? 'Vencido' : 
                               payment.status === 'partial' ? 'Parcial' : 
                               'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.type === 'installment' ? (
                              <span className="text-sm">
                                {payment.installment_number}ª parcela
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Pagamento único
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {pendingPayments.length > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Resumo de Cobranças</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Pendente</p>
                      <p className="font-medium text-blue-600">
                        R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Em Atraso</p>
                      <p className="font-medium text-red-600">
                        R$ {totalOverdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">No Prazo</p>
                      <p className="font-medium text-green-600">
                        R$ {(totalPendingAmount - totalOverdueAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notas Diárias
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Notas
                  </Button>
                  <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Nota do Dia
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Nota Diária</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="noteDate">Data</Label>
                          <Input
                            id="noteDate"
                            type="date"
                            value={newNote.note_date}
                            onChange={(e) => setNewNote({ ...newNote, note_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="noteText">Nota</Label>
                          <Textarea
                            id="noteText"
                            rows={4}
                            value={newNote.note_text}
                            onChange={(e) => setNewNote({ ...newNote, note_text: e.target.value })}
                            placeholder="Digite sua nota sobre o dia..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateNote} disabled={!newNote.note_text.trim()}>
                          Salvar Nota
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredNotes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma nota para o período selecionado.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="border-l-4 border-primary pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          {new Date(note.note_date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Usuário
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório Mensal
                </Button>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Notas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projection">
          <FinancialProjection />
        </TabsContent>

        <TabsContent value="default">
          <DefaultManagementPanel />
        </TabsContent>

        <TabsContent value="costcenter">
          <CostCenterAnalysis />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Relatório Detalhado - Mês atual</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum detalhe financeiro de pacientes para o período selecionado.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {incomeRecords.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Receitas</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {expenseRecords.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Despesas</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    R$ {(totalIncome / (incomeRecords.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditFinancialRecordDialog
        record={editingRecord}
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingRecord(null);
        }}
        onSave={loadFinancialRecords}
      />
    </div>
  );
}
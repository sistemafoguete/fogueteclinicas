import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Package2, Plus, AlertTriangle, TrendingUp, Activity, Upload, Edit, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BulkImportTestsDialog from '@/components/BulkImportTestsDialog';
import StockItemInlineActions from '@/components/StockItemInlineActions';

interface StockItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost: number;
  supplier?: string;
  location?: string;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: string;
  stock_item_id: string;
  type: 'in' | 'out';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reason?: string;
  date: string;
  created_at: string;
  stock_items?: {
    name: string;
  };
  profiles?: {
    name: string;
  };
}

export default function StockManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: 'medical', // Valor padrão válido
    unit: 'unit',
    current_quantity: 0,
    minimum_quantity: 0,
    unit_cost: 0,
    supplier: '',
    location: '',
    expiry_date: '',
  });

  const [newMovement, setNewMovement] = useState({
    stock_item_id: '',
    type: 'in' as 'in' | 'out',
    quantity: 0,
    unit_cost: 0,
    reason: '',
  });

  // Filtros para relatórios
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    month: 'all', // Valor padrão válido
    year: new Date().getFullYear().toString(),
    movementType: 'all', // 'all', 'in', 'out'
    itemId: 'all',
    responsibleId: 'all'
  });

  const [profiles, setProfiles] = useState<Array<{ user_id: string; name: string }>>([]);

  useEffect(() => {
    loadStockItems();
    loadMovements();
    loadProfiles();
  }, []);

  // Recarregar movimentações quando filtros mudarem
  useEffect(() => {
    loadMovements();
  }, [filters]);

  const loadStockItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Garantir que os dados sempre tenham valores válidos para o Select
      const processedData = (data || []).map(item => ({
        ...item,
        category: item.category || 'Outros',
        unit: item.unit || 'Unidade'
      }));
      
      setStockItems(processedData);
    } catch (error) {
      console.error('Error loading stock items:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os itens do estoque.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      if (filters.month && filters.month !== 'all' && filters.year) {
        const startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
        // Corrigir o cálculo da data final do mês
        const lastDay = new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate();
        const endDate = `${filters.year}-${filters.month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (filters.year && !filters.month) {
        query = query.gte('date', `${filters.year}-01-01`).lte('date', `${filters.year}-12-31`);
      }

      if (filters.movementType !== 'all') {
        query = query.eq('type', filters.movementType);
      }

      if (filters.itemId !== 'all') {
        query = query.eq('stock_item_id', filters.itemId);
      }

      if (filters.responsibleId !== 'all') {
        query = query.eq('created_by', filters.responsibleId);
      }

      // Limitar para evitar muitos resultados
      const { data: movementsData, error: movementsError } = await query.limit(200);

      if (movementsError) throw movementsError;

      // Depois buscar os nomes dos itens e perfis separadamente
      const movements = movementsData || [];
      
      // Buscar nomes dos itens
      const itemIds = [...new Set(movements.map(m => m.stock_item_id))];
      const { data: items } = await supabase
        .from('stock_items')
        .select('id, name')
        .in('id', itemIds);

      // Buscar nomes dos criadores
      const creatorIds = [...new Set(movements.map(m => m.created_by).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', creatorIds);

      // Combinar os dados
      const enrichedMovements = movements.map(movement => ({
        ...movement,
        type: movement.type as 'in' | 'out', // Type assertion for database string
        stock_items: items?.find(item => item.id === movement.stock_item_id) || undefined,
        profiles: profilesData?.find(profile => profile.user_id === movement.created_by) || undefined
      }));

      setMovements(enrichedMovements);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.name || !newItem.category) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome e categoria são obrigatórios.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_items')
        .insert([{
          ...newItem,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item adicionado ao estoque com sucesso!",
      });

      setIsItemDialogOpen(false);
      resetNewItem();
      loadStockItems();
    } catch (error) {
      console.error('Error creating stock item:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o item ao estoque.",
      });
    }
  };

  const handleCreateMovement = async () => {
    if (!newMovement.stock_item_id || !newMovement.quantity) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Item e quantidade são obrigatórios.",
      });
      return;
    }

    try {
      const totalCost = newMovement.unit_cost * newMovement.quantity;
      
      const { error } = await supabase
        .from('stock_movements')
        .insert([{
          ...newMovement,
          total_cost: totalCost,
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }]);

      if (error) throw error;

      // Atualizar quantidade do item
      const item = stockItems.find(i => i.id === newMovement.stock_item_id);
      if (item) {
        const newQuantity = newMovement.type === 'in' 
          ? item.current_quantity + newMovement.quantity
          : item.current_quantity - newMovement.quantity;

        await supabase
          .from('stock_items')
          .update({ current_quantity: Math.max(0, newQuantity) })
          .eq('id', newMovement.stock_item_id);
      }

      toast({
        title: "Sucesso",
        description: "Movimentação registrada com sucesso!",
      });

      setIsMovementDialogOpen(false);
      resetNewMovement();
      loadStockItems();
      loadMovements();
    } catch (error) {
      console.error('Error creating movement:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a movimentação.",
      });
    }
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      description: '',
      category: 'medical', // Valor padrão válido
      unit: 'unit',
      current_quantity: 0,
      minimum_quantity: 0,
      unit_cost: 0,
      supplier: '',
      location: '',
      expiry_date: '',
    });
  };

  const resetNewMovement = () => {
    setNewMovement({
      stock_item_id: '',
      type: 'in',
      quantity: 0,
      unit_cost: 0,
      reason: '',
    });
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      month: 'all', // Valor padrão válido
      year: new Date().getFullYear().toString(),
      movementType: 'all',
      itemId: 'all',
      responsibleId: 'all'
    });
  };

  const exportMovements = () => {
    const csvContent = [
      ['Data', 'Item', 'Tipo', 'Quantidade', 'Custo Total', 'Motivo', 'Responsável'].join(','),
      ...movements.map(m => [
        m.date,
        m.stock_items?.name || '',
        m.type === 'in' ? 'Entrada' : 'Saída',
        m.quantity,
        m.total_cost || '',
        m.reason || '',
        m.profiles?.name || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes_estoque_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = stockItems.filter(item => 
    item.current_quantity <= item.minimum_quantity
  );

  const totalValue = stockItems.reduce((sum, item) => 
    sum + (item.current_quantity * item.unit_cost), 0
  );

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const exportSelectedPDF = () => {
    const itemsToExport = stockItems.filter(item => selectedItems.has(item.id));
    
    if (itemsToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um item para exportar.",
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Itens Selecionados', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fundação Dom Bosco - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
      
      // Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de Itens: ${itemsToExport.length}`, 14, 45);
      
      const totalSelectedValue = itemsToExport.reduce((sum, item) => sum + (item.current_quantity * item.unit_cost), 0);
      doc.text(`Valor Total: R$ ${totalSelectedValue.toFixed(2)}`, 14, 52);

      // Group items by category
      const groupedItems: { [key: string]: StockItem[] } = {};
      itemsToExport.forEach(item => {
        const category = item.category || 'Outros';
        if (!groupedItems[category]) {
          groupedItems[category] = [];
        }
        groupedItems[category].push(item);
      });

      // Table data
      const tableData: any[] = [];
      Object.keys(groupedItems).sort().forEach(category => {
        tableData.push([
          { content: category.toUpperCase(), colSpan: 6, styles: { fillColor: [229, 231, 235], fontStyle: 'bold', fontSize: 10 } }
        ]);
        
        groupedItems[category].forEach((item, index) => {
          const status = item.current_quantity === 0 
            ? 'Esgotado' 
            : item.current_quantity <= item.minimum_quantity 
              ? 'Baixo' 
              : 'Normal';
          
          tableData.push([
            `${index + 1}. ${item.name}`,
            `${item.current_quantity} ${item.unit}`,
            `${item.minimum_quantity} ${item.unit}`,
            `R$ ${item.unit_cost.toFixed(2)}`,
            `R$ ${(item.current_quantity * item.unit_cost).toFixed(2)}`,
            status
          ]);
        });
      });

      autoTable(doc, {
        startY: 60,
        head: [['Item', 'Qtd. Atual', 'Qtd. Mínima', 'Valor Unit.', 'Valor Total', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 22, halign: 'center' }
        },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      doc.save(`itens-selecionados-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: `Relatório com ${itemsToExport.length} itens exportado.`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF. Tente novamente.",
      });
    }
  };

  const exportStockPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Controle de Estoque', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fundação Dom Bosco - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
    
    // Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Itens: ${stockItems.length}`, 14, 45);
    doc.text(`Estoque Baixo: ${lowStockItems.length}`, 14, 52);
    doc.text(`Valor Total: R$ ${totalValue.toFixed(2)}`, 14, 59);

    // Group items by category
    const groupedItems: { [key: string]: StockItem[] } = {};
    stockItems.forEach(item => {
      const category = item.category || 'Outros';
      if (!groupedItems[category]) {
        groupedItems[category] = [];
      }
      groupedItems[category].push(item);
    });

    // Table data
    const tableData: any[] = [];
    Object.keys(groupedItems).sort().forEach(category => {
      // Category header row
      tableData.push([
        { content: category.toUpperCase(), colSpan: 6, styles: { fillColor: [229, 231, 235], fontStyle: 'bold', fontSize: 10 } }
      ]);
      
      groupedItems[category].forEach((item, index) => {
        const status = item.current_quantity === 0 
          ? 'Esgotado' 
          : item.current_quantity <= item.minimum_quantity 
            ? 'Baixo' 
            : 'Normal';
        
        tableData.push([
          `${index + 1}. ${item.name}`,
          `${item.current_quantity} ${item.unit}`,
          `${item.minimum_quantity} ${item.unit}`,
          `R$ ${item.unit_cost.toFixed(2)}`,
          `R$ ${(item.current_quantity * item.unit_cost).toFixed(2)}`,
          status
        ]);
      });
    });

    // Generate table
    autoTable(doc, {
      startY: 68,
      head: [['Item', 'Qtd. Atual', 'Qtd. Mínima', 'Valor Unit.', 'Valor Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 22, halign: 'center' }
      },
      didDrawPage: (data: any) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });

    doc.save(`controle-estoque-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "PDF gerado com sucesso!",
      description: `Relatório de estoque com ${stockItems.length} itens exportado.`,
    });
  };

  const exportLowStockPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Itens com Estoque Baixo', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fundação Dom Bosco - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
      
      // Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de Itens com Estoque Baixo: ${lowStockItems.length}`, 14, 45);
      
      const totalToBuy = lowStockItems.reduce((sum, item) => {
        const qtyToBuy = Math.max(0, item.minimum_quantity - item.current_quantity + 5);
        return sum + (qtyToBuy * item.unit_cost);
      }, 0);
      doc.text(`Valor Estimado para Reposição: R$ ${totalToBuy.toFixed(2)}`, 14, 52);

      // Table data
      const tableData = lowStockItems.map((item, index) => {
        const qtyToBuy = Math.max(0, item.minimum_quantity - item.current_quantity + 5);
        return [
          `${index + 1}. ${item.name}`,
          item.category || '-',
          `${item.current_quantity} ${item.unit}`,
          `${item.minimum_quantity} ${item.unit}`,
          `${qtyToBuy} ${item.unit}`,
          `R$ ${item.unit_cost.toFixed(2)}`,
          `R$ ${(qtyToBuy * item.unit_cost).toFixed(2)}`
        ];
      });

      // Generate table
      autoTable(doc, {
        startY: 60,
        head: [['Item', 'Categoria', 'Qtd. Atual', 'Qtd. Mín.', 'Comprar', 'Valor Unit.', 'Valor Est.']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [234, 88, 12],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' }
        },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      doc.save(`estoque-baixo-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: `Lista com ${lowStockItems.length} itens com estoque baixo exportada.`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF. Tente novamente.",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Gestão de Estoque</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 flex-1 sm:flex-none text-sm"
            onClick={exportStockPDF}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Baixar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 flex-1 sm:flex-none text-sm"
            onClick={() => setIsBulkImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Testes</span>
            <span className="sm:hidden">Importar</span>
          </Button>
          <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 flex-1 sm:flex-none text-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Item</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Item</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome do Item *</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Nome do item"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medical">Material Médico</SelectItem>
                      <SelectItem value="office">Material de Escritório</SelectItem>
                      <SelectItem value="cleaning">Limpeza</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Unidade</SelectItem>
                      <SelectItem value="box">Caixa</SelectItem>
                      <SelectItem value="pack">Pacote</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="liter">Litro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="current_quantity">Quantidade Inicial</Label>
                  <Input
                    id="current_quantity"
                    type="number"
                    min="0"
                    value={newItem.current_quantity}
                    onChange={(e) => setNewItem({ ...newItem, current_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="minimum_quantity">Estoque Mínimo</Label>
                  <Input
                    id="minimum_quantity"
                    type="number"
                    min="0"
                    value={newItem.minimum_quantity}
                    onChange={(e) => setNewItem({ ...newItem, minimum_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit_cost">Custo Unitário (R$)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_cost}
                    onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input
                    id="supplier"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    placeholder="Local de armazenagem"
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Data de Validade</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Descrição detalhada do item"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateItem}>
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Activity className="h-4 w-4" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="stock_item">Item *</Label>
                  <Select value={newMovement.stock_item_id} onValueChange={(value) => setNewMovement({ ...newMovement, stock_item_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um item" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Atual: {item.current_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Movimentação</Label>
                  <Select value={newMovement.type} onValueChange={(value: 'in' | 'out') => setNewMovement({ ...newMovement, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newMovement.quantity}
                    onChange={(e) => setNewMovement({ ...newMovement, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit_cost">Custo Unitário (R$)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMovement.unit_cost}
                    onChange={(e) => setNewMovement({ ...newMovement, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Motivo</Label>
                  <Textarea
                    id="reason"
                    value={newMovement.reason}
                    onChange={(e) => setNewMovement({ ...newMovement, reason: e.target.value })}
                    placeholder="Motivo da movimentação"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateMovement}>
                  Registrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimentações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Itens</TabsTrigger>
          <TabsTrigger value="low-stock">Estoque Baixo</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          {/* Barra de seleção quando há itens selecionados */}
          {selectedItems.size > 0 && (
            <Card className="border-primary bg-primary/5 mb-4">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="text-sm px-3 py-1">
                      {selectedItems.size} item(ns) selecionado(s)
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedItems(new Set())}
                    >
                      Limpar seleção
                    </Button>
                  </div>
                  <Button 
                    className="gap-2"
                    onClick={exportSelectedPDF}
                  >
                    <FileDown className="h-4 w-4" />
                    Baixar PDF dos Selecionados
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg">Todos os Itens</CardTitle>
                <Input
                  placeholder="Buscar itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              {loading ? (
                <p className="text-center py-8">Carregando...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 sticky left-0 bg-background z-10">
                          <Checkbox 
                            checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px]">Nome do Teste</TableHead>
                        <TableHead className="min-w-[120px] hidden lg:table-cell">Folha de Resposta</TableHead>
                        <TableHead className="w-20">Tipo</TableHead>
                        <TableHead className="hidden md:table-cell w-24">Editora</TableHead>
                        <TableHead className="hidden lg:table-cell w-24">Construto</TableHead>
                        <TableHead className="w-16 text-center">Qtde</TableHead>
                        <TableHead className="hidden sm:table-cell w-20 text-right">Valor</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-16 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        // Separar nome do teste e folha de resposta
                        const parts = item.name.split(' - ');
                        const testName = parts[0] || item.name;
                        const responseSheet = parts[1] || '-';
                        
                        return (
                          <TableRow key={item.id} className={`${item.current_quantity <= item.minimum_quantity ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''} ${selectedItems.has(item.id) ? 'bg-primary/10' : ''}`}>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <Checkbox 
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => handleSelectItem(item.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="truncate max-w-[180px] lg:max-w-[250px]" title={testName}>
                                {testName}
                              </div>
                              {/* Mostrar folha de resposta em mobile como sublinha */}
                              <div className="lg:hidden text-xs text-muted-foreground truncate max-w-[180px]" title={responseSheet}>
                                {responseSheet !== '-' && responseSheet}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="truncate max-w-[120px] text-sm" title={responseSheet}>
                                {responseSheet}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full whitespace-nowrap">
                                {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[80px]" title={item.supplier || '-'}>
                              {item.supplier || '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs truncate max-w-[80px]" title={item.category || '-'}>
                              {item.category || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${
                                item.current_quantity === 0 
                                  ? 'text-red-600' 
                                  : item.current_quantity <= item.minimum_quantity 
                                    ? 'text-orange-600' 
                                    : 'text-green-600'
                              }`}>
                                {item.current_quantity}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-sm">
                              R$ {item.unit_cost.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {item.current_quantity === 0 ? (
                                <Badge variant="destructive" className="text-xs px-1.5">Esgotado</Badge>
                              ) : item.current_quantity <= item.minimum_quantity ? (
                                <Badge variant="secondary" className="text-xs px-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Baixo</Badge>
                              ) : (
                                <Badge variant="default" className="text-xs px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">OK</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <StockItemInlineActions item={item} onUpdate={loadStockItems} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Itens com Estoque Baixo</CardTitle>
              {lowStockItems.length > 0 && (
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={exportLowStockPDF}
                >
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum item com estoque baixo.
                </p>
              ) : (
                 <div className="space-y-4">
                   {lowStockItems.map((item) => (
                     <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                       <div className="flex-1">
                         <h3 className="font-medium">{item.name}</h3>
                         <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                           <span>Categoria: {item.category || '-'}</span>
                           <span>Editora: {item.supplier || '-'}</span>
                           <span>R$ {item.unit_cost.toFixed(2)}</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="text-right">
                           <Badge variant="destructive" className="text-base px-3 py-1">
                             {item.current_quantity} em estoque
                           </Badge>
                           <p className="text-xs text-muted-foreground mt-1">
                             Mínimo: {item.minimum_quantity}
                           </p>
                         </div>
                         <StockItemInlineActions item={item} onUpdate={loadStockItems} />
                       </div>
                     </div>
                   ))}
                 </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
      {/* Resumo de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Relatório de Movimentações
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
              >
                Limpar Filtros
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportMovements}
                disabled={movements.length === 0}
              >
                Exportar CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros Avançados */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="date-from">Data Inicial</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value, month: '', year: ''})}
              />
            </div>
            
            <div>
              <Label htmlFor="date-to">Data Final</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value, month: '', year: ''})}
              />
            </div>

            <div>
              <Label htmlFor="month">Mês</Label>
              <Select 
                value={filters.month} 
                onValueChange={(value) => setFilters({...filters, month: value, dateFrom: '', dateTo: ''})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2030"
                value={filters.year}
                onChange={(e) => setFilters({...filters, year: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="movement-type">Tipo</Label>
              <Select 
                value={filters.movementType} 
                onValueChange={(value) => setFilters({...filters, movementType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in">Entradas</SelectItem>
                  <SelectItem value="out">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="item-filter">Item</Label>
              <Select 
                value={filters.itemId} 
                onValueChange={(value) => setFilters({...filters, itemId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os itens</SelectItem>
                  {stockItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="responsible-filter">Responsável</Label>
              <Select 
                value={filters.responsibleId} 
                onValueChange={(value) => setFilters({...filters, responsibleId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo dos Filtros Aplicados */}
          {(filters.dateFrom || filters.dateTo || filters.month || filters.movementType !== 'all' || 
            filters.itemId !== 'all' || filters.responsibleId !== 'all') && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Filtros aplicados:</p>
              <div className="flex flex-wrap gap-2">
                {filters.dateFrom && (
                  <Badge variant="outline">De: {new Date(filters.dateFrom).toLocaleDateString('pt-BR')}</Badge>
                )}
                {filters.dateTo && (
                  <Badge variant="outline">Até: {new Date(filters.dateTo).toLocaleDateString('pt-BR')}</Badge>
                )}
                {filters.month && filters.year && (
                  <Badge variant="outline">
                    {new Date(parseInt(filters.year), parseInt(filters.month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </Badge>
                )}
                {filters.movementType !== 'all' && (
                  <Badge variant="outline">
                    {filters.movementType === 'in' ? 'Entradas' : 'Saídas'}
                  </Badge>
                )}
                {filters.itemId !== 'all' && (
                  <Badge variant="outline">
                    Item: {stockItems.find(item => item.id === filters.itemId)?.name}
                  </Badge>
                )}
                {filters.responsibleId !== 'all' && (
                  <Badge variant="outline">
                    Por: {profiles.find(p => p.user_id === filters.responsibleId)?.name}
                  </Badge>
                )}
                <Badge variant="secondary">{movements.length} registros encontrados</Badge>
              </div>
            </div>
          )}
              {movements.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação registrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{movement.stock_items?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={movement.type === 'in' ? "default" : "destructive"}>
                            {movement.type === 'in' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className={movement.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                          {movement.type === 'in' ? '+' : '-'}{movement.quantity}
                        </TableCell>
                        <TableCell>
                          {movement.total_cost 
                            ? `R$ ${movement.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{movement.profiles?.name || 'Sistema'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {movement.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
         </TabsContent>
       </Tabs>

       {/* Bulk Import Dialog */}
       <BulkImportTestsDialog
         isOpen={isBulkImportDialogOpen}
         onClose={() => setIsBulkImportDialogOpen(false)}
         onUpdate={() => {
           loadStockItems();
           loadMovements();
         }}
       />
     </div>
   );
 }
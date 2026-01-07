import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCustomPermissions } from '@/hooks/useCustomPermissions';
import { Package, Plus, AlertTriangle, TrendingUp, ArrowLeftRight, Search, FileDown, LayoutList, LayoutGrid, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StockItemActions from '@/components/StockItemActions';
import AddStockItemDialog from '@/components/AddStockItemDialog';
import { StockMovementDialog } from '@/components/StockMovementDialog';
import { StockMovementHistory } from '@/components/StockMovementHistory';
import { ImportExcelStockDialog } from '@/components/ImportExcelStockDialog';
import { importAllStockItems } from '@/utils/importStockData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StockItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost: number;
  supplier?: string;
  location?: string;
  is_active: boolean;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
}

export default function Stock() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { toast } = useToast();
  const { userRole, loading: roleLoading } = useRolePermissions();
  const customPermissions = useCustomPermissions();

  // Verificar acesso ao estoque
  useEffect(() => {
    if (roleLoading || customPermissions.loading) return;
    
    const hasAccess = userRole === 'director' || 
                      userRole === 'financeiro' ||
                      userRole === 'coordinator_madre' ||
                      userRole === 'coordinator_floresta' ||
                      customPermissions.hasPermission('view_stock');
    
    console.log('🔐 Verificação de acesso - Stock:', {
      userRole,
      hasCustomPermission: customPermissions.hasPermission('view_stock'),
      hasAccess
    });
    
    if (!hasAccess) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para acessar o estoque.",
      });
      window.history.back();
    }
  }, [roleLoading, customPermissions.loading, userRole]);

  useEffect(() => {
    loadStockItems();
    loadClients();
  }, []);

  // Auto-import stock items if empty
  useEffect(() => {
    if (!loading && stockItems.length === 0) {
      handleImportStock();
    }
  }, [loading, stockItems.length]);

  const loadStockItems = async () => {
    try {
      console.log('Loading stock items...');
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading stock items:', error);
        throw error;
      }
      
      console.log('Stock items loaded:', data);
      
      // Garantir que os dados sempre tenham valores válidos para o Select
      // mas sem sobrescrever valores existentes
      const processedData = (data || []).map(item => ({
        ...item,
        category: item.category || 'Outros',
        unit: item.unit || 'Unidade'
      }));
      
      console.log('Processed stock items:', processedData);
      setStockItems(processedData);
    } catch (error) {
      console.error('Error loading stock items:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os itens do estoque."
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleImportStock = async () => {
    setIsImporting(true);
    try {
      const { importAllItemsFromList } = await import('@/utils/importStockFromList');
      const result = await importAllItemsFromList();
      
      toast({
        title: "Importação concluída!",
        description: `${result.imported} itens importados com sucesso. ${result.errors > 0 ? `${result.errors} erros encontrados.` : ''}`,
        variant: result.errors > 0 ? "destructive" : "default"
      });

      if (result.imported > 0) {
        loadStockItems();
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação dos itens.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getLowStockItems = () => {
    return stockItems.filter(item => item.current_quantity <= item.minimum_quantity);
  };

  const getStockStatus = (item: StockItem) => {
    if (item.current_quantity === 0) return { label: 'Esgotado', variant: 'destructive' as const };
    if (item.current_quantity <= item.minimum_quantity) return { label: 'Baixo', variant: 'secondary' as const };
    return { label: 'Normal', variant: 'default' as const };
  };

  const getFilteredItems = () => {
    if (!searchTerm.trim()) return stockItems;
    
    return stockItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

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
    const filteredItems = getFilteredItems();
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const exportShoppingListPDF = () => {
    const itemsToExport = stockItems.filter(item => selectedItems.has(item.id));
    
    if (itemsToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um item para exportar.",
      });
      return;
    }

    generateStockPDF(itemsToExport, 'Lista de Compras - Estoque', `lista-compras-estoque-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportAllStockPDF = () => {
    if (stockItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Estoque vazio",
        description: "Não há itens no estoque para exportar.",
      });
      return;
    }

    generateStockPDF(stockItems, 'Controle de Estoque Completo', `controle-estoque-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generateStockPDF = (items: StockItem[], title: string, filename: string) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(title, pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fundação Dom Bosco - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
      
      // Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de Itens: ${items.length}`, 14, 45);
      
      const totalValue = items.reduce((sum, item) => sum + (item.current_quantity * item.unit_cost), 0);
      doc.text(`Valor Total em Estoque: R$ ${totalValue.toFixed(2)}`, 14, 52);

      // Group by category
      const groupedItems: { [key: string]: StockItem[] } = {};
      items.forEach(item => {
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

      doc.save(filename);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: `Relatório com ${items.length} itens exportado.`,
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

  if (loading) {
    return <div className="p-6">Carregando estoque...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 rounded-full" />
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">
            Controle de Estoque
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie itens, movimentações e alertas de estoque
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            className="gap-2" 
            variant="outline"
            onClick={exportAllStockPDF}
          >
            <FileDown className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button 
            className="gap-2" 
            variant="outline"
            onClick={handleImportStock}
            disabled={isImporting}
          >
            <Package className="h-4 w-4" />
            {isImporting ? "Importando..." : "Importar Itens da Planilha"}
          </Button>
          <Button 
            className="gap-2" 
            variant="outline"
            onClick={() => setIsMovementDialogOpen(true)}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Nova Movimentação
          </Button>
          <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Item
          </Button>
        </div>
        
        <AddStockItemDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onUpdate={loadStockItems}
        />
        
        <StockMovementDialog
          open={isMovementDialogOpen}
          onOpenChange={setIsMovementDialogOpen}
          stockItems={stockItems}
          clients={clients}
          onMovementCreated={loadStockItems}
        />
        
        <ImportExcelStockDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImportComplete={loadStockItems}
        />
      </div>

      {/* Resumo - Cards Modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
              {stockItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Itens cadastrados</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-orange-500/10 via-card to-orange-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              {getLowStockItems().length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Itens com alerta</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-500/10 via-card to-green-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              R$ {stockItems.reduce((sum, item) => sum + (item.current_quantity * item.unit_cost), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor em estoque</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-500/10 via-card to-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimentações</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              —
            </div>
            <p className="text-xs text-muted-foreground mt-1">Rastreamento ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Estoque Baixo - Design Moderno */}
      {getLowStockItems().length > 0 && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500/10 via-card to-orange-500/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative border-b border-orange-500/20">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <span className="bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent font-bold">
                Atenção: Itens com Estoque Baixo
              </span>
              <Badge className="ml-2 bg-orange-500/20 text-orange-700 border-orange-500/30">
                {getLowStockItems().length} itens
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getLowStockItems().map(item => (
                <div 
                  key={item.id} 
                  className="group flex justify-between items-center p-3 bg-gradient-to-br from-background to-orange-500/5 border border-orange-500/20 rounded-lg hover:border-orange-500/40 hover:shadow-md transition-all duration-200"
                >
                  <span className="font-medium truncate">{item.name}</span>
                  <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-700 shrink-0">
                    {item.current_quantity} {item.unit}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Itens em Estoque
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movements' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Movimentações
          </button>
        </nav>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'items' && (
        <>
          {/* Barra de seleção quando há itens selecionados */}
          {selectedItems.size > 0 && (
            <Card className="border-primary bg-primary/5">
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
                    onClick={exportShoppingListPDF}
                  >
                    <FileDown className="h-4 w-4" />
                    Baixar PDF dos Selecionados
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <CardTitle>Itens em Estoque</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, categoria, localização..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={viewMode} 
                    onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
                    className="border rounded-lg p-1"
                  >
                    <ToggleGroupItem value="list" aria-label="Visualização em lista" className="px-3">
                      <LayoutList className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="grid" aria-label="Visualização em cards" className="px-3">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={getFilteredItems().length > 0 && selectedItems.size === getFilteredItems().length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredItems().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {searchTerm ? 'Nenhum item encontrado com os termos de busca.' : 'Nenhum item cadastrado.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredItems().map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-muted/50' : ''}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => handleSelectItem(item.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category || '-'}</TableCell>
                            <TableCell>{item.current_quantity}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>R$ {item.unit_cost.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>{item.location || '-'}</TableCell>
                            <TableCell>
                              <StockItemActions 
                                item={item} 
                                onUpdate={loadStockItems}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getFilteredItems().length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhum item encontrado com os termos de busca.' : 'Nenhum item cadastrado.'}
                    </div>
                  ) : (
                    getFilteredItems().map((item) => {
                      const status = getStockStatus(item);
                      const statusColors = {
                        'Esgotado': 'border-red-500/50 bg-gradient-to-br from-red-500/10 via-card to-red-500/5',
                        'Baixo': 'border-orange-500/50 bg-gradient-to-br from-orange-500/10 via-card to-orange-500/5',
                        'Normal': 'border-green-500/30 bg-gradient-to-br from-green-500/5 via-card to-green-500/5'
                      };
                      
                      return (
                        <Card 
                          key={item.id} 
                          className={`group relative overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusColors[status.label]} ${selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => handleSelectItem(item.id)}
                        >
                          <div className="absolute top-3 left-3">
                            <Checkbox 
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => handleSelectItem(item.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="absolute top-3 right-3">
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          
                          <CardContent className="pt-10 pb-4">
                            <div className="space-y-3">
                              <div>
                                <Badge variant="outline" className="text-xs mb-2">
                                  {item.category || 'Outros'}
                                </Badge>
                                <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                                  {item.name}
                                </h3>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Package className="h-3.5 w-3.5" />
                                  <span>
                                    <span className="font-medium text-foreground">{item.current_quantity}</span>
                                    /{item.minimum_quantity} {item.unit}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 font-medium text-green-600">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span>R$ {item.unit_cost.toFixed(2)}</span>
                                </div>
                              </div>
                              
                              {item.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{item.location}</span>
                                </div>
                              )}
                              
                              <div className="pt-2 border-t flex justify-end" onClick={(e) => e.stopPropagation()}>
                                <StockItemActions 
                                  item={item} 
                                  onUpdate={loadStockItems}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'movements' && (
        <StockMovementHistory />
      )}
    </div>
  );
}
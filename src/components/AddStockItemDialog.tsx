import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, X, FileText, Image } from 'lucide-react';

interface AddStockItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const CATEGORIES = [
  { value: 'Material Médico', label: 'Material Médico' },
  { value: 'Material Artístico', label: 'Material Artístico' },
  { value: 'Material de Escritório', label: 'Material de Escritório' },
  { value: 'Limpeza', label: 'Limpeza' },
  { value: 'Equipamentos', label: 'Equipamentos' },
  { value: 'Medicamentos', label: 'Medicamentos' },
  { value: 'Outros', label: 'Outros' }
];

const UNITS = [
  { value: 'Unidade', label: 'Unidade' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'pacote', label: 'Pacote' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'litro', label: 'Litro' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'metro', label: 'Metro' },
  { value: 'cm', label: 'Centímetro' }
];

export default function AddStockItemDialog({ isOpen, onClose, onUpdate }: AddStockItemDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Material Médico', // Valor padrão válido
    unit: 'Unidade',
    current_quantity: 0,
    minimum_quantity: 5,
    unit_cost: 0,
    total_expense: 0, // Novo campo para valor total da despesa
    supplier: '',
    location: '',
    barcode: '',
    expiry_date: ''
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Tipo de arquivo inválido",
          description: "Apenas JPG, PNG, WebP e PDF são permitidos."
        });
        return false;
      }
      
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB."
        });
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (stockItemId: string) => {
    if (selectedFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of selectedFiles) {
        const fileName = `${stockItemId}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stock-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Registrar anexo na tabela
        const { error: attachmentError } = await supabase
          .from('stock_item_attachments')
          .insert({
            stock_item_id: stockItemId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            document_type: file.type === 'application/pdf' ? 'invoice' : 'receipt',
            uploaded_by: user?.id,
            notes: 'Documento anexado durante cadastro do item'
          });

        if (attachmentError) throw attachmentError;
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Não foi possível fazer upload dos arquivos."
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome do item é obrigatório."
      });
      return;
    }

    if (!formData.unit) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Unidade de medida é obrigatória."
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Tentando inserir item no estoque...', formData);
      console.log('User ID:', user?.id);
      
      // Inserir item no estoque (trigger automático criará registro financeiro)
      const { data: stockData, error: stockError } = await supabase
        .from('stock_items')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category && formData.category !== '' ? formData.category : null,
          unit: formData.unit,
          current_quantity: formData.current_quantity,
          minimum_quantity: formData.minimum_quantity,
          unit_cost: formData.unit_cost,
          total_expense: formData.total_expense,
          supplier: formData.supplier.trim() || null,
          location: formData.location.trim() || null,
          barcode: formData.barcode.trim() || null,
          expiry_date: formData.expiry_date || null,
          created_by: user?.id,
          is_active: true
        })
        .select()
        .single();

      console.log('Resultado da inserção:', { stockData, stockError });

      if (stockError) {
        console.error('Erro ao inserir item:', stockError);
        throw stockError;
      }

      // Upload dos arquivos anexados
      if (selectedFiles.length > 0 && stockData) {
        await uploadFiles(stockData.id);
      }

      toast({
        title: "Sucesso",
        description: (() => {
          const expenseValue = formData.total_expense > 0 ? formData.total_expense : (formData.unit_cost * formData.current_quantity);
          const filesText = selectedFiles.length > 0 ? ` e ${selectedFiles.length} arquivo(s) anexado(s)` : '';
          return expenseValue > 0 && formData.current_quantity > 0 
            ? `Item adicionado ao estoque, registro financeiro automático criado (R$ ${expenseValue.toFixed(2)})${filesText}!`
            : `Item adicionado ao estoque com sucesso${filesText}!`;
        })()
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'Material Médico', // Valor padrão válido
        unit: 'Unidade',
        current_quantity: 0,
        minimum_quantity: 5,
        unit_cost: 0,
        total_expense: 0,
        supplier: '',
        location: '',
        barcode: '',
        expiry_date: ''
      });
      setSelectedFiles([]);

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error adding stock item:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o item ao estoque."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Novo Item ao Estoque
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <RequiredLabel htmlFor="name" required>Nome do Item</RequiredLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome do item"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="unit" required>Unidade</RequiredLabel>
              <Select 
                value={formData.unit} 
                onValueChange={(value) => handleInputChange('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_quantity">Quantidade Inicial</Label>
              <Input
                id="current_quantity"
                type="number"
                min="0"
                value={formData.current_quantity}
                onChange={(e) => handleInputChange('current_quantity', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_quantity">Estoque Mínimo</Label>
              <Input
                id="minimum_quantity"
                type="number"
                min="0"
                value={formData.minimum_quantity}
                onChange={(e) => handleInputChange('minimum_quantity', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Valor Unitário (R$)</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_expense">Valor Total da Despesa (R$)</Label>
              <Input
                id="total_expense"
                type="number"
                min="0"
                step="0.01"
                value={formData.total_expense}
                onChange={(e) => handleInputChange('total_expense', parseFloat(e.target.value) || 0)}
                placeholder="Valor total gasto na compra"
              />
              <p className="text-xs text-muted-foreground">
                Inclua frete, impostos e outros custos além do valor unitário
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Local de armazenamento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Código de barras do produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Data</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleInputChange('expiry_date', e.target.value)}
              />
            </div>
          </div>

          {/* Seção de Upload de Documentos */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Anexar Documentos</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Anexe notas fiscais, comprovantes ou outros documentos relacionados ao produto
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Selecionar Arquivos
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    PDF, JPG, PNG, WebP (max 10MB)
                  </span>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Arquivos Selecionados:</Label>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          {file.type === 'application/pdf' ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <Image className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="text-sm truncate max-w-xs" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrição detalhada do item"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
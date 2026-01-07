import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Upload } from 'lucide-react';

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
  barcode?: string;
  expiry_date?: string;
  is_active: boolean;
}

interface EditStockItemDialogProps {
  item: StockItem;
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

export default function EditStockItemDialog({ item, isOpen, onClose, onUpdate }: EditStockItemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Outros', // Valor padrão válido
    unit: 'Unidade', // Valor padrão válido
    current_quantity: 0,
    minimum_quantity: 0,
    unit_cost: 0,
    supplier: '',
    location: '',
    barcode: '',
    expiry_date: ''
  });

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || 'Outros', // Usar valor padrão válido
        unit: item.unit || 'Unidade', // Usar valor padrão válido
        current_quantity: item.current_quantity || 0,
        minimum_quantity: item.minimum_quantity || 0,
        unit_cost: item.unit_cost || 0,
        supplier: item.supplier || '',
        location: item.location || '',
        barcode: item.barcode || '',
        expiry_date: item.expiry_date || ''
      });
    }
  }, [item, isOpen]);

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

    setLoading(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category && formData.category !== '' ? formData.category : null,
        unit: formData.unit,
        current_quantity: formData.current_quantity,
        minimum_quantity: formData.minimum_quantity,
        unit_cost: formData.unit_cost,
        supplier: formData.supplier.trim() || null,
        location: formData.location.trim() || null,
        barcode: formData.barcode.trim() || null,
        expiry_date: formData.expiry_date || null,
        updated_at: new Date().toISOString()
      };

      console.log('Updating stock item:', item.id, updateData);

      // Verificar se houve mudança de quantidade para registrar movimentação
      const quantityChanged = formData.current_quantity !== item.current_quantity;
      const quantityDiff = formData.current_quantity - item.current_quantity;

      const { data, error } = await supabase
        .from('stock_items')
        .update(updateData)
        .eq('id', item.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Update successful:', data);

      // Registrar movimentação se a quantidade mudou
      if (quantityChanged) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const movementData = {
          stock_item_id: item.id,
          type: quantityDiff > 0 ? 'entrada' : 'saida',
          quantity: Math.abs(quantityDiff),
          previous_quantity: item.current_quantity,
          new_quantity: formData.current_quantity,
          unit_cost: formData.unit_cost,
          total_cost: Math.abs(quantityDiff) * formData.unit_cost,
          reason: 'Ajuste através de edição',
          notes: `Item editado: ${item.name}${item.name !== formData.name.trim() ? ` → ${formData.name.trim()}` : ''}`,
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id,
          moved_by: user?.id
        };

        console.log('Creating movement record:', movementData);

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([movementData]);

        if (movementError) {
          console.error('Error creating movement:', movementError);
          // Não falhar a atualização se o registro de movimento falhar
          toast({
            variant: "default",
            title: "Aviso",
            description: "Item atualizado, mas não foi possível registrar a movimentação."
          });
        }
      }

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso!"
      });

      onClose();
      // Aguardar um pouco antes de recarregar para garantir que o banco atualizou
      setTimeout(() => {
        onUpdate();
      }, 100);
    } catch (error: any) {
      console.error('Error updating stock item:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o item."
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
            <Edit className="h-5 w-5" />
            Editar Item do Estoque
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Item *</Label>
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
              <Label htmlFor="unit">Unidade</Label>
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
              <Label htmlFor="current_quantity">Quantidade Atual</Label>
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
              <Label htmlFor="expiry_date">Data de Validade</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleInputChange('expiry_date', e.target.value)}
              />
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
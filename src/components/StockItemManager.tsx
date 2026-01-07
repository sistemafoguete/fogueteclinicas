import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { Package, Plus, Minus, Trash2, Edit, AlertTriangle } from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  category: string;
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  unit_cost?: number;
  supplier?: string;
  description?: string;
  location?: string;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StockItemManagerProps {
  item: StockItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const StockItemManager = ({ item, isOpen, onClose, onUpdate }: StockItemManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'movement'>('view');
  
  const [editForm, setEditForm] = useState({
    name: item.name,
    category: item.category,
    minimum_quantity: item.minimum_quantity,
    unit_cost: item.unit_cost || 0,
    supplier: item.supplier || '',
    description: item.description || '',
    location: item.location || '',
    expiry_date: item.expiry_date || ''
  });
  
  const [movementForm, setMovementForm] = useState({
    type: 'in' as 'in' | 'out',
    quantity: 0,
    unit_cost: item.unit_cost || 0,
    reason: ''
  });

  const handleAddQuantity = async (quantity: number) => {
    await createMovement('in', quantity, 'Adição de estoque');
  };

  const handleRemoveQuantity = async (quantity: number) => {
    if (quantity > item.current_quantity) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade insuficiente em estoque.",
      });
      return;
    }
    await createMovement('out', quantity, 'Remoção de estoque');
  };

  const handleRemoveItem = async () => {
    if (!confirm('Tem certeza que deseja remover este item do estoque?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item removido do estoque.",
      });
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o item.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stock_items')
        .update(editForm)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso.",
      });
      
      onUpdate();
      setActiveTab('view');
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o item.",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMovement = async (type: 'in' | 'out', quantity: number, reason: string) => {
    setLoading(true);
    try {
      // Get current user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      const { error } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type,
          quantity,
          unit_cost: movementForm.unit_cost,
          total_cost: movementForm.unit_cost * quantity,
          reason,
          date: new Date().toISOString().split('T')[0],
          created_by: profileData.id
        }]);

      if (error) throw error;

      // Update stock quantity
      const newQuantity = type === 'in' 
        ? item.current_quantity + quantity 
        : item.current_quantity - quantity;

      await supabase
        .from('stock_items')
        .update({ 
          current_quantity: Math.max(0, newQuantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      toast({
        title: "Sucesso",
        description: `${type === 'in' ? 'Entrada' : 'Saída'} registrada com sucesso!`,
      });
      
      onUpdate();
      setMovementForm({ type: 'in', quantity: 0, unit_cost: item.unit_cost || 0, reason: '' });
    } catch (error) {
      console.error('Error creating movement:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a movimentação.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomMovement = async () => {
    if (!movementForm.quantity || movementForm.quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade deve ser maior que zero.",
      });
      return;
    }

    if (movementForm.type === 'out' && movementForm.quantity > item.current_quantity) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade insuficiente em estoque.",
      });
      return;
    }

    await createMovement(movementForm.type, movementForm.quantity, movementForm.reason);
  };

  const isLowStock = item.current_quantity <= item.minimum_quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Item: {item.name}
            {isLowStock && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Estoque Baixo
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'view' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Visualizar
          </button>
          <button
            onClick={() => setActiveTab('movement')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'movement' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Movimentação
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'edit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Editar
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'view' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </div>
                <div>
                  <Label>Quantidade Atual</Label>
                  <p className="text-lg font-semibold">{item.current_quantity} {item.unit}</p>
                </div>
                <div>
                  <Label>Estoque Mínimo</Label>
                  <p className="text-sm text-muted-foreground">{item.minimum_quantity} {item.unit}</p>
                </div>
                <div>
                  <Label>Custo Unitário</Label>
                  <p className="text-sm text-muted-foreground">
                    {item.unit_cost ? `R$ ${item.unit_cost.toFixed(2)}` : 'Não informado'}
                  </p>
                </div>
                {item.supplier && (
                  <div>
                    <Label>Fornecedor</Label>
                    <p className="text-sm text-muted-foreground">{item.supplier}</p>
                  </div>
                )}
                {item.location && (
                  <div>
                    <Label>Localização</Label>
                    <p className="text-sm text-muted-foreground">{item.location}</p>
                  </div>
                )}
              </div>
              
              {item.description && (
                <div>
                  <Label>Descrição</Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              )}

              {item.expiry_date && (
                <div>
                  <Label>Data de Validade</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.expiry_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleAddQuantity(1)}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  +1
                </Button>
                <Button
                  onClick={() => handleAddQuantity(10)}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  +10
                </Button>
                <Button
                  onClick={() => handleRemoveQuantity(1)}
                  disabled={loading || item.current_quantity === 0}
                  size="sm"
                  variant="outline"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  -1
                </Button>
                <Button
                  onClick={() => handleRemoveQuantity(10)}
                  disabled={loading || item.current_quantity < 10}
                  size="sm"
                  variant="outline"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  -10
                </Button>
                <Button
                  onClick={handleRemoveItem}
                  disabled={loading}
                  size="sm"
                  variant="destructive"
                  className="ml-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover Item
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'movement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Movimentação</Label>
                  <select
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as 'in' | 'out' })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="in">Entrada</option>
                    <option value="out">Saída</option>
                  </select>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Custo Unitário (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={movementForm.unit_cost}
                    onChange={(e) => setMovementForm({ ...movementForm, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Motivo</Label>
                <Textarea
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  placeholder="Motivo da movimentação"
                />
              </div>

              <Button
                onClick={handleCustomMovement}
                disabled={loading}
                className="w-full"
              >
                Registrar Movimentação
              </Button>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Item</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="medical_supplies">Material Médico</option>
                    <option value="office_supplies">Material de Escritório</option>
                    <option value="cleaning">Limpeza</option>
                    <option value="equipment">Equipamentos</option>
                    <option value="medication">Medicamentos</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.minimum_quantity}
                    onChange={(e) => setEditForm({ ...editForm, minimum_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Custo Unitário (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.unit_cost}
                    onChange={(e) => setEditForm({ ...editForm, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Input
                    value={editForm.supplier}
                    onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Localização</Label>
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={editForm.expiry_date}
                    onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descrição detalhada do item"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTab('view')}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateItem} disabled={loading}>
                  <Edit className="h-4 w-4 mr-1" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
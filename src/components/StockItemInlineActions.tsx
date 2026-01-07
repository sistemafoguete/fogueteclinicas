import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Trash2, Edit } from 'lucide-react';
import EditStockItemDialog from './EditStockItemDialog';

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

interface StockItemInlineActionsProps {
  item: StockItem;
  onUpdate: () => void;
}

export default function StockItemInlineActions({ item, onUpdate }: StockItemInlineActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [addQuantity, setAddQuantity] = useState(1);
  const [removeQuantity, setRemoveQuantity] = useState(1);

  const handleQuickAdd = async () => {
    setLoading(true);
    try {
      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type: 'in',
          quantity: 1,
          reason: 'Adição rápida',
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }]);

      if (movementError) throw movementError;

      // Atualizar quantidade no item
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          current_quantity: item.current_quantity + 1
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `1 ${item.unit} adicionado ao estoque.`
      });

      onUpdate();
    } catch (error) {
      console.error('Error adding quantity:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao adicionar item."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRemove = async () => {
    if (item.current_quantity === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Item já está sem estoque."
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type: 'out',
          quantity: 1,
          reason: 'Remoção rápida',
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }]);

      if (movementError) throw movementError;

      // Atualizar quantidade no item
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          current_quantity: Math.max(0, item.current_quantity - 1)
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `1 ${item.unit} removido do estoque.`
      });

      onUpdate();
    } catch (error) {
      console.error('Error removing quantity:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao remover item."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuantity = async () => {
    if (!addQuantity || addQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade deve ser maior que zero."
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type: 'in',
          quantity: addQuantity,
          reason: 'Entrada de estoque',
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }]);

      if (movementError) throw movementError;

      // Atualizar quantidade no item
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          current_quantity: item.current_quantity + addQuantity
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `${addQuantity} ${item.unit} adicionado(s) ao estoque.`
      });

      setIsAddDialogOpen(false);
      setAddQuantity(1);
      onUpdate();
    } catch (error) {
      console.error('Error adding quantity:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar a quantidade."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveQuantity = async () => {
    if (!removeQuantity || removeQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade deve ser maior que zero."
      });
      return;
    }

    if (removeQuantity > item.current_quantity) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade insuficiente no estoque."
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type: 'out',
          quantity: removeQuantity,
          reason: 'Saída de estoque',
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }]);

      if (movementError) throw movementError;

      // Atualizar quantidade no item
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          current_quantity: Math.max(0, item.current_quantity - removeQuantity)
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `${removeQuantity} ${item.unit} removido(s) do estoque.`
      });

      setIsRemoveDialogOpen(false);
      setRemoveQuantity(1);
      onUpdate();
    } catch (error) {
      console.error('Error removing quantity:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover a quantidade."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item removido do estoque."
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o item."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Botão de Edição */}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        onClick={() => setIsEditDialogOpen(true)}
        disabled={loading}
        title="Editar item"
      >
        <Edit className="h-4 w-4" />
      </Button>

      {/* Botão de Adição Rápida */}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={handleQuickAdd}
        disabled={loading}
        title="Adicionar 1 unidade"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Botão de Remoção Rápida */}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        onClick={handleQuickRemove}
        disabled={loading || item.current_quantity === 0}
        title="Remover 1 unidade"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Botão de Exclusão */}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setIsDeleteAlertOpen(true)}
        disabled={loading}
        title="Excluir item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Dialog para adicionar quantidade específica */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Estoque atual: <span className="font-medium">{item.current_quantity} {item.unit}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-quantity">Quantidade</Label>
              <Input
                id="add-quantity"
                type="number"
                min="1"
                value={addQuantity}
                onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddQuantity} disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para remover quantidade específica */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Estoque atual: <span className="font-medium">{item.current_quantity} {item.unit}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remove-quantity">Quantidade</Label>
              <Input
                id="remove-quantity"
                type="number"
                min="1"
                max={item.current_quantity}
                value={removeQuantity}
                onChange={(e) => setRemoveQuantity(parseInt(e.target.value) || 1)}
                autoFocus
              />
            </div>
            {removeQuantity > item.current_quantity && (
              <div className="text-sm text-red-600">
                Quantidade insuficiente no estoque!
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveQuantity} 
              disabled={loading || removeQuantity > item.current_quantity}
            >
              {loading ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item "{item.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de edição */}
      <EditStockItemDialog
        item={item}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={onUpdate}
      />
    </div>
  );
}
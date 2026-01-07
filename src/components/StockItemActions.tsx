import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Edit, MoreHorizontal, Trash, ArrowLeftRight } from 'lucide-react';
import EditStockItemDialog from './EditStockItemDialog';
import { StockMovementDialog } from './StockMovementDialog';

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

interface StockItemActionsProps {
  item: StockItem;
  onUpdate: () => void;
  clients?: Client[];
}

export default function StockItemActions({ item, onUpdate, clients = [] }: StockItemActionsProps) {
  const { user } = useAuth();
  const { canManageStock } = useRolePermissions();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [addQuantity, setAddQuantity] = useState(1);
  const [removeQuantity, setRemoveQuantity] = useState(1);
  const [reason, setReason] = useState('');

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
      const previousQuantity = item.current_quantity;
      const newQuantity = previousQuantity + addQuantity;

      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type: 'entrada',
          quantity: addQuantity,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          reason: reason || 'Ajuste manual de estoque',
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id,
          moved_by: user?.id
        }]);

      if (movementError) throw movementError;

      // Atualizar quantidade no item
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          current_quantity: newQuantity 
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `${addQuantity} ${item.unit} adicionado(s) ao estoque.`
      });

      setIsAddDialogOpen(false);
      setAddQuantity(1);
      setReason('');
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
      const previousQuantity = item.current_quantity;
      const newQuantity = Math.max(0, previousQuantity - removeQuantity);

      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          stock_item_id: item.id,
          type: 'saida',
          quantity: removeQuantity,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          reason: reason || 'Ajuste manual de estoque',
          date: new Date().toISOString().split('T')[0],
          created_by: user?.id,
          moved_by: user?.id
        }]);

      if (movementError) throw movementError;

      // Atualizar quantidade no item
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          current_quantity: newQuantity
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `${removeQuantity} ${item.unit} removido(s) do estoque.`
      });

      setIsRemoveDialogOpen(false);
      setRemoveQuantity(1);
      setReason('');
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
      // Primeiro, registrar a movimentação de remoção
      if (item.current_quantity > 0) {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            stock_item_id: item.id,
            type: 'saida',
            quantity: item.current_quantity,
            previous_quantity: item.current_quantity,
            new_quantity: 0,
            reason: 'Item excluído do sistema',
            notes: `Item "${item.name}" foi removido/desativado do estoque`,
            date: new Date().toISOString().split('T')[0],
            created_by: user?.id,
            moved_by: user?.id
          }]);

        if (movementError) {
          console.error('Error creating deletion movement:', movementError);
        }
      }

      // Depois, desativar o item
      const { error } = await supabase
        .from('stock_items')
        .update({ 
          is_active: false,
          current_quantity: 0 // Zerar quantidade ao desativar
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item removido do estoque com sucesso."
      });

      setIsDeleteDialogOpen(false);
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

  // Se não tem permissão para gerenciar estoque, mostra apenas botão de editar
  if (!canManageStock()) {
    return (
      <Button variant="outline" size="sm" className="gap-2">
        <Edit className="h-3 w-3" />
        Editar
      </Button>
    );
  }

  const isLowStock = item.current_quantity <= item.minimum_quantity;
  const isOutOfStock = item.current_quantity === 0;

  return (
    <div className="flex items-center gap-2">
      {/* Status Badge */}
      {isOutOfStock ? (
        <Badge variant="destructive">Esgotado</Badge>
      ) : isLowStock ? (
        <Badge variant="secondary">Estoque Baixo</Badge>
      ) : null}

      {/* Botões de Ação */}
      <div className="flex gap-1">
        {/* Botão Adicionar */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" className="gap-1">
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar ao Estoque - {item.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Estoque atual: {item.current_quantity} {item.unit}</Label>
              </div>
              <div>
                <Label htmlFor="add-quantity">Quantidade a adicionar</Label>
                <Input
                  id="add-quantity"
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="add-reason">Motivo (opcional)</Label>
                <Textarea
                  id="add-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Compra, recebimento, etc."
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

        {/* Botão Remover */}
        <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive" className="gap-1">
              <Minus className="h-3 w-3" />
              Remover
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover do Estoque - {item.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Estoque atual: {item.current_quantity} {item.unit}</Label>
              </div>
              <div>
                <Label htmlFor="remove-quantity">Quantidade a remover</Label>
                <Input
                  id="remove-quantity"
                  type="number"
                  min="1"
                  max={item.current_quantity}
                  value={removeQuantity}
                  onChange={(e) => setRemoveQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="remove-reason">Motivo (opcional)</Label>
                <Textarea
                  id="remove-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Uso, venda, perda, etc."
                />
              </div>
              {removeQuantity > item.current_quantity && (
                <div className="text-red-600 text-sm">
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

        {/* Menu Dropdown para outras ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsMovementDialogOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Nova Movimentação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Item
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="h-4 w-4 mr-2" />
              Excluir Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog de Confirmação para Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>Tem certeza que deseja excluir o item "{item.name}"? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <EditStockItemDialog
        item={item}
        isOpen={isEditDialogOpen} 
        onClose={() => {
          setIsEditDialogOpen(false);
          onUpdate();
        }}
        onUpdate={onUpdate}
      />

      {/* Dialog de Movimentação Completa */}
      <StockMovementDialog
        open={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
        stockItems={[item]}
        clients={clients}
        selectedItemId={item.id}
        onMovementCreated={onUpdate}
      />
    </div>
  );
}
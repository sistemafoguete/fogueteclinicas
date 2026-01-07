import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const stockMovementSchema = z.object({
  stock_item_id: z.string().min(1, "Item é obrigatório"),
  type: z.enum(["entrada", "saida", "ajuste", "transferencia"], {
    required_error: "Tipo de movimentação é obrigatório",
  }),
  quantity: z.number().int().min(1, "Quantidade deve ser maior que 0"),
  unit_cost: z.number().min(0).optional(),
  reason: z.string().min(1, "Motivo é obrigatório"),
  notes: z.string().optional(),
  client_id: z.string().optional(),
  attendance_id: z.string().optional(),
  schedule_id: z.string().optional(),
  from_location: z.string().optional(),
  to_location: z.string().optional(),
});

type StockMovementForm = z.infer<typeof stockMovementSchema>;

interface StockItem {
  id: string;
  name: string;
  current_quantity: number;
}

interface Client {
  id: string;
  name: string;
}

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  clients: Client[];
  onMovementCreated: () => void;
  selectedItemId?: string;
}

export function StockMovementDialog({
  open,
  onOpenChange,
  stockItems,
  clients,
  onMovementCreated,
  selectedItemId,
}: StockMovementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<StockMovementForm>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      stock_item_id: selectedItemId || "",
      type: "saida",
      quantity: 1,
      unit_cost: undefined,
      reason: "",
      notes: "",
      client_id: "",
      attendance_id: "",
      schedule_id: "",
      from_location: "",
      to_location: "",
    },
  });

  const selectedItem = stockItems.find(item => item.id === form.watch("stock_item_id"));

  const onSubmit = async (data: StockMovementForm) => {
    if (!user) return;

    setLoading(true);
    try {
      const selectedItem = stockItems.find(item => item.id === data.stock_item_id);
      if (!selectedItem) {
        throw new Error("Item não encontrado");
      }

      const previousQuantity = selectedItem.current_quantity;
      let newQuantity: number;

      switch (data.type) {
        case "entrada":
          newQuantity = previousQuantity + data.quantity;
          break;
        case "saida":
          newQuantity = previousQuantity - data.quantity;
          if (newQuantity < 0) {
            throw new Error("Quantidade insuficiente em estoque");
          }
          break;
        case "ajuste":
          newQuantity = data.quantity;
          break;
        case "transferencia":
          newQuantity = previousQuantity - data.quantity;
          if (newQuantity < 0) {
            throw new Error("Quantidade insuficiente para transferência");
          }
          break;
        default:
          throw new Error("Tipo de movimentação inválido");
      }

      const totalCost = data.unit_cost ? data.unit_cost * data.quantity : null;

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          stock_item_id: data.stock_item_id,
          type: data.type,
          quantity: data.quantity,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          unit_cost: data.unit_cost,
          total_cost: totalCost,
          reason: data.reason,
          notes: data.notes || null,
          client_id: data.client_id || null,
          attendance_id: data.attendance_id || null,
          schedule_id: data.schedule_id || null,
          from_location: data.from_location || null,
          to_location: data.to_location || null,
          moved_by: user.id,
          created_by: user.id,
          date: new Date().toISOString().split('T')[0],
        });

      if (movementError) {
        throw movementError;
      }

      // Update stock item quantity
      const { error: updateError } = await supabase
        .from("stock_items")
        .update({
          current_quantity: newQuantity,
        })
        .eq("id", data.stock_item_id);

      if (updateError) {
        throw updateError;
      }

      // Create financial record if there's a cost
      if (totalCost && totalCost > 0) {
        let financialType: 'income' | 'expense' = 'expense';
        let financialCategory: string = 'supplies';
        let financialDescription: string = '';

        const itemName = selectedItem.name;

        switch (data.type) {
          case "entrada":
            financialType = 'expense';
            financialCategory = 'supplies';
            financialDescription = `Entrada de estoque: ${itemName} (${data.quantity} unidades)`;
            
            if (data.reason === 'Compra') {
              financialDescription = `Compra de estoque: ${itemName} (${data.quantity} unidades)`;
            }
            break;
          case "saida":
            financialType = 'expense';
            financialCategory = 'supplies';
            financialDescription = `Saída de estoque: ${itemName} (${data.quantity} unidades)`;
            
            if (data.reason === 'Uso em atendimento') {
              financialDescription = `Custo de materiais - Atendimento: ${itemName} (${data.quantity} unidades)`;
            }
            break;
          case "ajuste":
            if (data.quantity < previousQuantity) {
              financialType = 'expense';
              financialDescription = `Ajuste de estoque (redução): ${itemName} (${Math.abs(previousQuantity - data.quantity)} unidades)`;
            }
            break;
        }

        if (financialDescription) {
          const { error: financialError } = await supabase
            .from('financial_records')
            .insert({
              type: financialType,
              category: financialCategory,
              description: financialDescription,
              amount: totalCost,
              date: new Date().toISOString().split('T')[0],
              payment_method: 'internal',
              client_id: data.client_id || null,
              employee_id: user.id,
              created_by: user.id,
              notes: `Movimentação de estoque - ${data.reason}${data.notes ? ` - ${data.notes}` : ''}`
            });

          if (financialError) {
            console.error('Financial record error:', financialError);
            // Não interrompe o processo se houver erro no financeiro
          }
        }
      }

      toast({
        title: "Movimentação registrada",
        description: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} de ${data.quantity} unidades registrada com sucesso.`,
      });

      form.reset();
      onOpenChange(false);
      onMovementCreated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar movimentação",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const movementTypes = [
    { value: "entrada", label: "Entrada (Adicionar ao estoque)" },
    { value: "saida", label: "Saída (Retirar do estoque)" },
    { value: "ajuste", label: "Ajuste (Corrigir quantidade)" },
    { value: "transferencia", label: "Transferência (Mover para outro local)" },
  ];

  const reasonOptions = {
    entrada: [
      "Compra",
      "Doação",
      "Devolução",
      "Transferência recebida",
      "Estoque inicial",
      "Outros",
    ],
    saida: [
      "Uso em atendimento",
      "Consumo interno",
      "Perda/Dano",
      "Transferência enviada",
      "Vencimento",
      "Outros",
    ],
    ajuste: [
      "Correção de inventário",
      "Erro de lançamento",
      "Acerto de sistema",
      "Outros",
    ],
    transferencia: [
      "Mudança de local",
      "Transferência entre unidades",
      "Reorganização",
      "Outros",
    ],
  };

  const selectedType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação de Estoque</DialogTitle>
          <DialogDescription>
            Registre entradas, saídas, ajustes ou transferências de itens do estoque.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock_item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stockItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} (Atual: {item.current_quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimentação *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {movementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantidade * {selectedItem && `(Atual: ${selectedItem.current_quantity})`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonOptions[selectedType]?.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(selectedType === "saida" || selectedType === "transferencia") && (
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum cliente</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedType === "transferencia" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="from_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Origem</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Sala 1, Estoque A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="to_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Destino</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Sala 2, Estoque B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a movimentação..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Movimentação
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowRightLeft } from "lucide-react";

interface StockMovement {
  id: string;
  stock_item_id: string;
  item_name: string;
  moved_by: string;
  moved_by_name: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost: number;
  total_cost: number;
  reason: string;
  notes: string;
  attendance_id: string;
  client_id: string;
  client_name: string;
  schedule_id: string;
  from_location: string;
  to_location: string;
  date: string;
  created_at: string;
}

interface StockMovementHistoryProps {
  selectedItemId?: string;
}

export function StockMovementHistory({ selectedItemId }: StockMovementHistoryProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  const loadMovements = async () => {
    setLoading(true);
    try {
      // Build the query
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          stock_items (name),
          profiles!stock_movements_moved_by_fkey (name),
          clients (name)
        `)
        .order('created_at', { ascending: false });

      // Filter by selected item if provided
      if (selectedItemId) {
        query = query.eq('stock_item_id', selectedItemId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      const transformedData: StockMovement[] = (data || []).map((movement: any) => ({
        id: movement.id,
        stock_item_id: movement.stock_item_id,
        item_name: movement.stock_items?.name || 'Item não encontrado',
        moved_by: movement.moved_by || movement.created_by,
        moved_by_name: movement.profiles?.name || 'Usuário não encontrado',
        movement_type: movement.type,
        quantity: movement.quantity,
        previous_quantity: movement.previous_quantity,
        new_quantity: movement.new_quantity,
        unit_cost: movement.unit_cost,
        total_cost: movement.total_cost,
        reason: movement.reason || '',
        notes: movement.notes || '',
        attendance_id: movement.attendance_id,
        client_id: movement.client_id,
        client_name: movement.clients?.name || '',
        schedule_id: movement.schedule_id,
        from_location: movement.from_location || '',
        to_location: movement.to_location || '',
        date: movement.date,
        created_at: movement.created_at,
      }));

      setMovements(transformedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar movimentações",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [selectedItemId]);

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch = 
      movement.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.moved_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case "saida":
        return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
      case "ajuste":
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case "transferencia":
        return <ArrowRightLeft className="h-4 w-4 text-purple-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "entrada":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Entrada</Badge>;
      case "saida":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Saída</Badge>;
      case "ajuste":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Ajuste</Badge>;
      case "transferencia":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Transferência</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Movimentações</CardTitle>
            <CardDescription>
              Registro de todas as movimentações de estoque com rastreabilidade completa.
            </CardDescription>
          </div>
          <Button onClick={loadMovements} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por item, usuário, motivo ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando movimentações...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getMovementIcon(movement.movement_type)}
                          {getMovementBadge(movement.movement_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.item_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className={`font-medium ${
                            movement.movement_type === 'entrada' ? 'text-green-600' : 
                            movement.movement_type === 'saida' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {movement.movement_type === 'entrada' ? '+' : 
                             movement.movement_type === 'saida' ? '-' : '±'}{movement.quantity}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {movement.previous_quantity} → {movement.new_quantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.moved_by_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate" title={movement.reason}>
                          {movement.reason}
                        </div>
                        {movement.notes && (
                          <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={movement.notes}>
                            {movement.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {movement.client_name && (
                          <div className="text-sm">{movement.client_name}</div>
                        )}
                        {movement.from_location && movement.to_location && (
                          <div className="text-xs text-muted-foreground">
                            {movement.from_location} → {movement.to_location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {movement.total_cost && (
                          <div className="text-sm font-medium">
                            {formatCurrency(movement.total_cost)}
                          </div>
                        )}
                        {movement.unit_cost && (
                          <div className="text-xs text-muted-foreground">
                            Unit: {formatCurrency(movement.unit_cost)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(movement.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(movement.created_at), 'HH:mm', { locale: ptBR })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
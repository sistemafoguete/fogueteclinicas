import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, DollarSign, Calendar, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DefaultPayment {
  id: string;
  client_id: string;
  client_name: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  due_date: string;
  status: string;
  installments_total: number;
  installments_paid: number;
  phone?: string;
  email?: string;
  days_overdue: number;
}

export const DefaultManagementPanel = () => {
  const [defaultPayments, setDefaultPayments] = useState<DefaultPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'partial'>('overdue');
  const { toast } = useToast();

  useEffect(() => {
    loadDefaultPayments();
  }, [filter]);

  const loadDefaultPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('client_payments')
        .select(`
          *,
          clients (
            name,
            phone,
            email
          )
        `)
        .neq('status', 'completed')
        .order('due_date', { ascending: true });

      if (filter === 'overdue') {
        query = query.eq('status', 'overdue');
      } else if (filter === 'partial') {
        query = query.eq('status', 'partial');
      }

      const { data, error } = await query;

      if (error) throw error;

      const paymentsWithDays = data?.map(payment => {
        const dueDate = new Date(payment.due_date);
        const today = new Date();
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: payment.id,
          client_id: payment.client_id,
          client_name: (payment.clients as any)?.name || 'N/A',
          total_amount: payment.total_amount,
          amount_paid: payment.amount_paid,
          amount_remaining: payment.amount_remaining,
          due_date: payment.due_date,
          status: payment.status,
          installments_total: payment.installments_total,
          installments_paid: payment.installments_paid,
          phone: (payment.clients as any)?.phone,
          email: (payment.clients as any)?.email,
          days_overdue: diffDays
        };
      }) || [];

      setDefaultPayments(paymentsWithDays);
    } catch (error) {
      console.error('Erro ao carregar inadimplências:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados de inadimplência."
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'overdue') {
      if (daysOverdue > 30) {
        return <Badge variant="destructive">Crítico ({daysOverdue}d)</Badge>;
      }
      return <Badge variant="destructive">Atrasado ({daysOverdue}d)</Badge>;
    }
    if (status === 'partial') {
      return <Badge className="bg-yellow-500">Parcial</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const totalOverdue = defaultPayments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount_remaining, 0);

  const totalPartial = defaultPayments
    .filter(p => p.status === 'partial')
    .reduce((sum, p) => sum + p.amount_remaining, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {defaultPayments.filter(p => p.status === 'overdue').length} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parcial</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {totalPartial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {defaultPayments.filter(p => p.status === 'partial').length} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(totalOverdue + totalPartial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {defaultPayments.length} pagamentos pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overdue">
            Em Atraso ({defaultPayments.filter(p => p.status === 'overdue').length})
          </TabsTrigger>
          <TabsTrigger value="partial">
            Parcial ({defaultPayments.filter(p => p.status === 'partial').length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos ({defaultPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center p-8">Carregando...</div>
              ) : defaultPayments.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  Nenhum pagamento encontrado nesta categoria
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Restante</TableHead>
                      <TableHead>Contato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaultPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.client_name}</TableCell>
                        <TableCell>
                          {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status, payment.days_overdue)}</TableCell>
                        <TableCell>
                          {payment.installments_paid}/{payment.installments_total}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {payment.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          R$ {payment.amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          R$ {payment.amount_remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {payment.phone && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(`https://wa.me/55${payment.phone.replace(/\D/g, '')}`)}
                                title="WhatsApp"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}
                            {payment.email && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(`mailto:${payment.email}`)}
                                title="Email"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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
    </div>
  );
};

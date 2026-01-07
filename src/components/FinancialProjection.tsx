import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

interface ProjectionData {
  month: string;
  receita_confirmada: number;
  receita_projetada: number;
  despesa_confirmada: number;
  despesa_projetada: number;
}

export const FinancialProjection = () => {
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    receitaTotal: 0,
    despesaTotal: 0,
    lucroProjetado: 0,
    crescimentoMes: 0
  });

  useEffect(() => {
    loadProjectionData();
  }, []);

  const loadProjectionData = async () => {
    setLoading(true);
    try {
      // Buscar dados dos próximos 6 meses
      const months: ProjectionData[] = [];
      let totalReceita = 0;
      let totalDespesa = 0;

      for (let i = 0; i < 6; i++) {
        const targetDate = addMonths(new Date(), i);
        const startDate = startOfMonth(targetDate);
        const endDate = endOfMonth(targetDate);

        // Receitas confirmadas (financial_records)
        const { data: confirmedRevenue } = await supabase
          .from('financial_records')
          .select('amount')
          .eq('type', 'income')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));

        // Despesas confirmadas
        const { data: confirmedExpenses } = await supabase
          .from('financial_records')
          .select('amount')
          .eq('type', 'expense')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));

        // Receita projetada de agendamentos futuros (estimativa baseada em histórico)
        const { data: futureAppointments } = await supabase
          .from('schedules')
          .select('id')
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString())
          .in('status', ['pending', 'confirmed']);

        // Estimativa de R$ 150 por consulta (pode ser ajustado)
        const receitaConfirmada = confirmedRevenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        const despesaConfirmada = confirmedExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const receitaProjetada = (futureAppointments?.length || 0) * 150; // Valor médio estimado

        totalReceita += receitaConfirmada + receitaProjetada;
        totalDespesa += despesaConfirmada;

        months.push({
          month: format(targetDate, 'MMM/yy', { locale: ptBR }),
          receita_confirmada: receitaConfirmada,
          receita_projetada: receitaProjetada,
          despesa_confirmada: despesaConfirmada,
          despesa_projetada: despesaConfirmada * 0.1 // Estimativa de 10% extra
        });
      }

      setProjectionData(months);

      // Calcular crescimento mês a mês
      const crescimento = months.length > 1 
        ? ((months[1].receita_confirmada + months[1].receita_projetada) - 
           (months[0].receita_confirmada + months[0].receita_projetada)) / 
           (months[0].receita_confirmada + months[0].receita_projetada) * 100
        : 0;

      setSummary({
        receitaTotal: totalReceita,
        despesaTotal: totalDespesa,
        lucroProjetado: totalReceita - totalDespesa,
        crescimentoMes: crescimento
      });

    } catch (error) {
      console.error('Erro ao carregar projeção:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return <div className="text-center p-8">Carregando projeções...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Projetada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {summary.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Próximos 6 meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Estimadas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {summary.despesaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Próximos 6 meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Projetado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.lucroProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {summary.lucroProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Margem estimada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.crescimentoMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.crescimentoMes.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Mês a mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="receita" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receita">Receita</TabsTrigger>
          <TabsTrigger value="comparacao">Comparação</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="receita" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projeção de Receita - Próximos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Bar dataKey="receita_confirmada" name="Receita Confirmada" fill="#00C49F" stackId="a" />
                  <Bar dataKey="receita_projetada" name="Receita Projetada" fill="#0088FE" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita vs Despesa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="receita_confirmada" 
                    name="Receita" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="despesa_confirmada" 
                    name="Despesa" 
                    stroke="#FF8042" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fluxo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa Projetado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectionData.map(d => ({
                  ...d,
                  saldo: (d.receita_confirmada + d.receita_projetada) - (d.despesa_confirmada + d.despesa_projetada)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Bar dataKey="saldo" name="Saldo Projetado" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

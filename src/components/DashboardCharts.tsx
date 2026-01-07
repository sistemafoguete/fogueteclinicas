import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface MonthlyRevenue {
  month: string;
  receita: number;
  despesa: number;
}

interface AttendanceType {
  name: string;
  value: number;
}

interface NewPatients {
  month: string;
  novos: number;
}

export const DashboardCharts = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [attendanceTypes, setAttendanceTypes] = useState<AttendanceType[]>([]);
  const [newPatients, setNewPatients] = useState<NewPatients[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const today = new Date();
        const monthsData: MonthlyRevenue[] = [];
        const patientsData: NewPatients[] = [];

        // Carregar dados dos últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(today, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const monthLabel = format(monthDate, 'MMM', { locale: ptBR });

          // Receitas
          const [financialResult, clientPaymentsResult, automaticResult] = await Promise.all([
            supabase
              .from('financial_records')
              .select('amount, type')
              .gte('date', monthStart.toISOString().split('T')[0])
              .lte('date', monthEnd.toISOString().split('T')[0]),
            supabase
              .from('client_payments')
              .select('amount_paid')
              .gte('created_at', monthStart.toISOString())
              .lte('created_at', monthEnd.toISOString()),
            supabase
              .from('automatic_financial_records')
              .select('amount, transaction_type')
              .gte('payment_date', monthStart.toISOString())
              .lte('payment_date', monthEnd.toISOString())
          ]);

          const income = (financialResult.data?.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0) || 0) +
                        (clientPaymentsResult.data?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0) +
                        (automaticResult.data?.filter(r => r.transaction_type === 'income').reduce((sum, r) => sum + Number(r.amount), 0) || 0);

          const expense = (financialResult.data?.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0) || 0) +
                         (automaticResult.data?.filter(r => r.transaction_type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0) || 0);

          monthsData.push({
            month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            receita: income,
            despesa: expense
          });

          // Novos pacientes
          const { count: newPatientsCount } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          patientsData.push({
            month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            novos: newPatientsCount || 0
          });
        }

        setMonthlyRevenue(monthsData);
        setNewPatients(patientsData);

        // Tipos de atendimento (últimos 3 meses)
        const threeMonthsAgo = subMonths(today, 3);
        const { data: attendanceData } = await supabase
          .from('attendance_reports')
          .select('attendance_type')
          .gte('created_at', threeMonthsAgo.toISOString())
          .eq('validation_status', 'validated');

        const typeCounts: Record<string, number> = {};
        (attendanceData || []).forEach(a => {
          const type = a.attendance_type || 'Outros';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const typesArray = Object.entries(typeCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setAttendanceTypes(typesArray);
      } catch (error) {
        console.error('Erro ao carregar dados dos gráficos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Gráfico de Receitas x Despesas */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/10 to-transparent">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Receitas x Despesas (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis 
                tick={{ fontSize: 10 }} 
                className="fill-muted-foreground"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="receita" fill="hsl(var(--chart-2))" name="Receita" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" fill="hsl(var(--chart-1))" name="Despesa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Pizza - Tipos de Atendimento */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 to-transparent">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-blue-500" />
            Tipos de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {attendanceTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={attendanceTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {attendanceTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de atendimentos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Linha - Novos Pacientes */}
      <Card className="border-0 shadow-lg overflow-hidden lg:col-span-2 xl:col-span-1">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 to-transparent">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            Novos Pacientes (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={newPatients}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="novos" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Novos Pacientes"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

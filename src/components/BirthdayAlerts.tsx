import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cake, Gift, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format, differenceInYears, isSameDay, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BirthdayClient {
  id: string;
  name: string;
  birth_date: string;
  age: number;
  daysUntil: number;
  isToday: boolean;
}

export const BirthdayAlerts = () => {
  const [birthdays, setBirthdays] = useState<BirthdayClient[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useCurrentUser();

  useEffect(() => {
    const loadBirthdays = async () => {
      if (!profile?.user_id) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = addDays(today, 7);

      // Diretores/coordenadores veem todos, profissionais veem apenas vinculados
      const isDirectorOrCoordinator = ['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'].includes(profile.employee_role || '');

      let query = supabase
        .from('clients')
        .select('id, name, birth_date')
        .eq('is_active', true)
        .not('birth_date', 'is', null);

      if (!isDirectorOrCoordinator) {
        // Profissionais veem apenas clientes vinculados
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select('client_id')
          .eq('employee_id', profile.user_id)
          .eq('is_active', true);

        if (!assignments || assignments.length === 0) {
          setBirthdays([]);
          setLoading(false);
          return;
        }

        const clientIds = assignments.map(a => a.client_id).filter(Boolean);
        query = query.in('id', clientIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar aniversários:', error);
        setLoading(false);
        return;
      }

      // Filtrar aniversários dos próximos 7 dias
      const upcomingBirthdays = (data || [])
        .map(client => {
          const birthDate = parseISO(client.birth_date);
          const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
          
          // Se já passou esse ano, considerar próximo ano
          let targetDate = thisYearBirthday;
          if (isBefore(thisYearBirthday, today) && !isSameDay(thisYearBirthday, today)) {
            targetDate = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
          }

          const isToday = isSameDay(targetDate, today);
          const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const age = differenceInYears(today, birthDate) + (isToday ? 0 : 1);

          return {
            id: client.id,
            name: client.name,
            birth_date: client.birth_date,
            age,
            daysUntil: isToday ? 0 : daysUntil,
            isToday
          };
        })
        .filter(client => client.daysUntil >= 0 && client.daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setBirthdays(upcomingBirthdays);
      setLoading(false);
    };

    loadBirthdays();
  }, [profile?.user_id, profile?.employee_role]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500/10 via-card to-pink-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            <span>Aniversários</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (birthdays.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500/10 via-card to-pink-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            <span>Aniversários</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Nenhum aniversário nos próximos 7 dias</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500/10 via-card to-pink-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500" />
          <span>Aniversários</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {birthdays.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {birthdays.map((client) => (
              <div
                key={client.id}
                className={`p-2 rounded-lg border transition-all ${
                  client.isToday 
                    ? 'bg-pink-500/20 border-pink-500/30 animate-pulse' 
                    : 'bg-card/50 border-border/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {client.isToday ? (
                      <PartyPopper className="h-4 w-4 text-pink-500 shrink-0" />
                    ) : (
                      <Gift className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {client.isToday ? (
                      <Badge className="bg-pink-500 text-white text-[10px] px-1.5">
                        Hoje! 🎉
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {client.daysUntil === 1 ? 'Amanhã' : `${client.daysUntil} dias`}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {client.age} anos
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

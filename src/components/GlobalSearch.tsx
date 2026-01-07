import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Search, User, Users, Calendar, Package, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SearchResult {
  id: string;
  type: 'client' | 'employee' | 'schedule' | 'stock';
  title: string;
  subtitle?: string;
  url: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Atalho de teclado Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Buscar resultados
  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const allResults: SearchResult[] = [];
    const searchTerm = `%${searchQuery}%`;

    try {
      // Buscar pacientes
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, cpf, phone, email')
        .ilike('name', searchTerm)
        .limit(5);

      if (clientsError) {
        console.error('Erro ao buscar pacientes:', clientsError);
      }

      if (clients && clients.length > 0) {
        clients.forEach((client) => {
          allResults.push({
            id: client.id,
            type: 'client',
            title: client.name,
            subtitle: client.phone || client.email || client.cpf || 'Sem informações adicionais',
            url: `/clients`
          });
        });
      }

      // Buscar funcionários
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, phone, employee_role')
        .not('employee_role', 'is', null)
        .ilike('name', searchTerm)
        .limit(5);

      if (employeesError) {
        console.error('Erro ao buscar funcionários:', employeesError);
      }

      if (employees && employees.length > 0) {
        employees.forEach((emp) => {
          allResults.push({
            id: emp.id,
            type: 'employee',
            title: emp.name,
            subtitle: emp.email || emp.phone || 'Funcionário',
            url: `/employees-new`
          });
        });
      }

      // Buscar agendamentos
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          id,
          title,
          start_time,
          clients (name),
          profiles:employee_id (name)
        `)
        .ilike('title', searchTerm)
        .order('start_time', { ascending: false })
        .limit(5);

      if (schedulesError) {
        console.error('Erro ao buscar agendamentos:', schedulesError);
      }

      if (schedules && schedules.length > 0) {
        schedules.forEach((schedule: any) => {
          const clientName = schedule.clients?.name || 'Cliente não informado';
          const profName = schedule.profiles?.name || 'Profissional não informado';
          
          allResults.push({
            id: schedule.id,
            type: 'schedule',
            title: `${schedule.title} - ${clientName}`,
            subtitle: `${format(new Date(schedule.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - ${profName}`,
            url: `/schedule`
          });
        });
      }

      // Buscar itens de estoque
      const { data: stockItems, error: stockError } = await supabase
        .from('stock_items')
        .select('id, name, category, current_quantity, unit')
        .ilike('name', searchTerm)
        .limit(5);

      if (stockError) {
        console.error('Erro ao buscar estoque:', stockError);
      }

      if (stockItems && stockItems.length > 0) {
        stockItems.forEach((item) => {
          allResults.push({
            id: item.id,
            type: 'stock',
            title: item.name,
            subtitle: `${item.category} - Quantidade: ${item.current_quantity} ${item.unit}`,
            url: `/stock`
          });
        });
      }

      setResults(allResults);

      // Log para debug
      if (allResults.length === 0) {
        console.log('Nenhum resultado encontrado para:', searchQuery);
      } else {
        console.log(`Encontrados ${allResults.length} resultados para:`, searchQuery);
      }

    } catch (error) {
      console.error('Erro ao buscar:', error);
      toast({
        variant: "destructive",
        title: "Erro na busca",
        description: "Não foi possível realizar a busca."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAll(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchAll]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(result.url);
    
    toast({
      title: "Navegando...",
      description: `Indo para ${result.type === 'client' ? 'Pacientes' : 
                                 result.type === 'employee' ? 'Funcionários' :
                                 result.type === 'schedule' ? 'Agenda' : 'Estoque'}`
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <User className="mr-2 h-4 w-4" />;
      case 'employee':
        return <Users className="mr-2 h-4 w-4" />;
      case 'schedule':
        return <Calendar className="mr-2 h-4 w-4" />;
      case 'stock':
        return <Package className="mr-2 h-4 w-4" />;
      default:
        return <FileText className="mr-2 h-4 w-4" />;
    }
  };

  const getGroupTitle = (type: string) => {
    switch (type) {
      case 'client':
        return 'Pacientes';
      case 'employee':
        return 'Funcionários';
      case 'schedule':
        return 'Agendamentos';
      case 'stock':
        return 'Estoque';
      default:
        return 'Outros';
    }
  };

  // Agrupar resultados por tipo
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Botão de busca visível */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar pacientes, funcionários, agendamentos ou estoque..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading ? (
            <CommandEmpty>Buscando...</CommandEmpty>
          ) : results.length === 0 && query.length >= 2 ? (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>Digite pelo menos 2 caracteres para buscar...</CommandEmpty>
          ) : null}

          {Object.entries(groupedResults).map(([type, items], index) => (
            <div key={type}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={getGroupTitle(type)}>
                {items.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`${result.type}-${result.id}-${result.title}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getIcon(result.type)}
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

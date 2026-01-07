import { HelpCircle, Search, Users, Calendar, Package, DollarSign, FileText, Clock, MessageSquare, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const tutorials = [
  {
    id: "search",
    icon: Search,
    title: "Pesquisa Global (Ctrl+K)",
    category: "Navegação",
    content: "Pressione Ctrl+K (ou Cmd+K no Mac) para abrir a pesquisa global. Você pode buscar pacientes, funcionários, atendimentos e itens do estoque rapidamente."
  },
  {
    id: "clients",
    icon: Users,
    title: "Gerenciar Pacientes",
    category: "Cadastros",
    content: "Na aba Pacientes, você pode cadastrar novos pacientes, editar informações, visualizar histórico de atendimentos e gerar contratos. Use os filtros para encontrar pacientes específicos."
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "Agenda de Atendimentos",
    category: "Agendamento",
    content: "Na Agenda, você pode criar novos agendamentos, confirmar consultas, marcar presença de pacientes e visualizar o calendário. Clique em um horário vazio para criar um novo agendamento."
  },
  {
    id: "stock",
    icon: Package,
    title: "Controle de Estoque",
    category: "Estoque",
    content: "Gerencie itens do estoque, registre entradas e saídas, e monitore quantidades mínimas. Você pode importar dados via Excel e visualizar o histórico de movimentações."
  },
  {
    id: "financial",
    icon: DollarSign,
    title: "Gestão Financeira",
    category: "Financeiro",
    content: "Registre receitas e despesas, filtre por período, categoria ou unidade. Você pode exportar relatórios e editar lançamentos financeiros conforme necessário."
  },
  {
    id: "employees",
    icon: Users,
    title: "Controle de Funcionários",
    category: "Recursos Humanos",
    content: "Cadastre funcionários, defina permissões personalizadas, gerencie cargos e acompanhe o ponto eletrônico. Você também pode gerar relatórios detalhados de cada funcionário."
  },
  {
    id: "reports",
    icon: FileText,
    title: "Relatórios",
    category: "Análises",
    content: "Gere relatórios de pacientes, funcionários, financeiro e atendimentos. Os relatórios são exportados em PDF e podem ser personalizados por período."
  },
  {
    id: "timeclock",
    icon: Clock,
    title: "Ponto Eletrônico",
    category: "Recursos Humanos",
    content: "Funcionários podem registrar entrada e saída pelo sistema. Gestores podem visualizar o histórico de ponto e gerar relatórios de jornada de trabalho."
  },
  {
    id: "messages",
    icon: MessageSquare,
    title: "Mensagens Internas",
    category: "Comunicação",
    content: "Envie mensagens diretas para outros usuários do sistema. As conversas são organizadas por usuário e você recebe notificações de novas mensagens."
  },
  {
    id: "dashboard",
    icon: BarChart3,
    title: "Dashboard",
    category: "Visão Geral",
    content: "Visualize estatísticas gerais, próximos atendimentos, ações rápidas e indicadores importantes. O dashboard é atualizado em tempo real."
  }
];

const categories = Array.from(new Set(tutorials.map(t => t.category)));

export const QuickHelpCenter = () => {
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Ajuda Rápida</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[90vw] sm:w-[400px] p-0 z-[100]" 
        align="end" 
        side="bottom" 
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div className="border-b p-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Ajuda Rápida
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Mini tutoriais para usar o sistema
          </p>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="p-4">
            <Accordion type="single" collapsible className="w-full">
              {categories.map((category) => (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {tutorials.filter(t => t.category === category).length}
                      </Badge>
                      {category}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {tutorials
                        .filter(t => t.category === category)
                        .map((tutorial) => {
                          const Icon = tutorial.icon;
                          return (
                            <div
                              key={tutorial.id}
                              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="rounded-md bg-primary/10 p-2">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="font-medium text-sm">
                                    {tutorial.title}
                                  </h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {tutorial.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>

        <div className="border-t p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            💡 Dica: Use <kbd className="px-1.5 py-0.5 text-xs bg-background border rounded">Ctrl+K</kbd> para pesquisa rápida
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

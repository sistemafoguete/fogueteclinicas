import { useLocation, Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Mapeamento de rotas para nomes amigáveis
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Pacientes',
  '/schedule': 'Agenda',
  '/schedule-control': 'Controle de Agenda',
  '/attendance-validation': 'Validação de Atendimentos',
  '/feedback-control': 'Controle de Devolutivas',
  '/financial': 'Financeiro',
  '/contracts': 'Contratos',
  '/stock': 'Estoque',
  '/reports': 'Relatórios',
  '/my-patients': 'Meus Pacientes',
  '/medical-records': 'Prontuários',
  '/employees-new': 'Funcionários',
  '/employee-control': 'Controle de Funcionários',
  '/users': 'Usuários',
  '/messages': 'Mensagens',
  '/my-files': 'Meus Arquivos',
  '/timesheet': 'Ponto',
  '/meeting-alerts': 'Alertas de Reunião',
  '/neuroassessment': 'Avaliação Neuropsicológica',
  '/contract-templates': 'Modelos de Contrato',
  '/custom-roles': 'Cargos Personalizados',
  '/anamnesis': 'Anamnese',
};

export const PageBreadcrumb = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Se estiver na home, não mostra breadcrumb
  if (currentPath === '/') {
    return null;
  }

  const currentLabel = ROUTE_LABELS[currentPath] || 'Página';

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList className="flex items-center gap-1.5 text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to="/" 
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors duration-100"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Início</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        <BreadcrumbSeparator className="mx-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </BreadcrumbSeparator>
        
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium text-foreground">
            {currentLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Eye, 
  Edit, 
  FileText, 
  Power, 
  Phone, 
  Calendar, 
  User,
  Building2,
  Brain,
  Stethoscope as StethoscopeIcon,
  Clipboard
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  unit?: string;
  diagnosis?: string;
  is_active: boolean;
  created_at: string;
  cpf?: string;
}

interface PatientCardProps {
  client: Client;
  isSelected?: boolean;
  showCheckbox?: boolean;
  showActions?: boolean;
  onSelect?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  onToggleStatus?: () => void;
}

const getUnitConfig = (unit?: string) => {
  switch (unit) {
    case "madre":
      return {
        label: "Clínica Social",
        Icon: Building2,
        gradient: "from-blue-500 to-cyan-500",
        bgLight: "bg-blue-50 dark:bg-blue-950/30",
        textColor: "text-blue-700 dark:text-blue-300",
        borderColor: "border-blue-200 dark:border-blue-800"
      };
    case "floresta":
      return {
        label: "Neuroavaliação",
        Icon: Brain,
        gradient: "from-violet-500 to-purple-500",
        bgLight: "bg-violet-50 dark:bg-violet-950/30",
        textColor: "text-violet-700 dark:text-violet-300",
        borderColor: "border-violet-200 dark:border-violet-800"
      };
    case "atendimento_floresta":
      return {
        label: "Atend. Floresta",
        Icon: StethoscopeIcon,
        gradient: "from-emerald-500 to-teal-500",
        bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
        textColor: "text-emerald-700 dark:text-emerald-300",
        borderColor: "border-emerald-200 dark:border-emerald-800"
      };
    default:
      return {
        label: "Não definido",
        Icon: Clipboard,
        gradient: "from-gray-400 to-gray-500",
        bgLight: "bg-muted/50",
        textColor: "text-muted-foreground",
        borderColor: "border-border"
      };
  }
};

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export function PatientCard({
  client,
  isSelected = false,
  showCheckbox = false,
  showActions = true,
  onSelect,
  onView,
  onEdit,
  onReport,
  onToggleStatus
}: PatientCardProps) {
  const unitConfig = getUnitConfig(client.unit);
  const age = calculateAge(client.birth_date);
  const UnitIcon = unitConfig.Icon;

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-300 
        border-0 shadow-sm hover:shadow-xl hover:-translate-y-1
        bg-gradient-to-br from-card via-card to-muted/20
        ${isSelected ? 'ring-2 ring-primary shadow-xl -translate-y-1' : ''}
        ${!client.is_active ? 'opacity-60 grayscale-[30%]' : ''}
        group cursor-pointer
      `}
      onClick={onView}
    >
      {/* Header com gradiente */}
      <div className={`h-2 bg-gradient-to-r ${unitConfig.gradient}`} />
      
      <CardContent className="p-5">
        {/* Topo: Avatar + Info Principal */}
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          {showCheckbox && (
            <div 
              className="pt-2"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              <Checkbox 
                checked={isSelected}
                onCheckedChange={onSelect}
                className="h-5 w-5 rounded-full border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>
          )}

          {/* Avatar com anel de gradiente */}
          <div className="relative">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${unitConfig.gradient} blur-sm opacity-50`} />
            <UserAvatar 
              name={client.name} 
              size="lg"
              className="relative ring-2 ring-background shadow-lg"
            />
          </div>

          {/* Informações principais */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Nome */}
            <h3 className="font-bold text-base text-foreground truncate leading-tight group-hover:text-primary transition-colors">
              {client.name}
            </h3>
            
            {/* Badge de Unidade */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${unitConfig.bgLight} ${unitConfig.textColor} border ${unitConfig.borderColor}`}>
              <UnitIcon className="h-3.5 w-3.5" />
              <span>{unitConfig.label}</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                client.is_active 
                  ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${client.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {client.is_active ? 'Ativo' : 'Inativo'}
              </span>

              {age !== null && age < 18 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                  Menor
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Informações Secundárias */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {client.phone && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group/item hover:bg-muted transition-colors">
              <Phone className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground truncate">{client.phone}</span>
            </div>
          )}
          
          {age !== null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{age} anos</span>
            </div>
          )}

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 col-span-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Cadastro: {new Date(client.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Ações */}
        {showActions && (
          <div 
            className="flex items-center justify-between mt-4 pt-4 border-t border-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                className="h-9 px-3 gap-1.5 text-xs font-medium hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
              >
                <Eye className="h-4 w-4" />
                Ver
              </Button>
              
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-9 px-3 gap-1.5 text-xs font-medium hover:bg-orange-500/10 hover:text-orange-600 rounded-lg transition-all"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {onReport && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReport}
                  className="h-9 w-9 hover:bg-violet-500/10 hover:text-violet-600 rounded-lg transition-all"
                  title="Relatório"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
              
              {onToggleStatus && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleStatus}
                  className={`h-9 w-9 rounded-lg transition-all ${
                    client.is_active 
                      ? 'hover:bg-red-500/10 hover:text-red-600' 
                      : 'hover:bg-green-500/10 hover:text-green-600'
                  }`}
                  title={client.is_active ? "Desativar" : "Ativar"}
                >
                  <Power className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

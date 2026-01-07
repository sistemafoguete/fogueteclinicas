import React, { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Professional {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  employee_role?: string;
  unit?: string;
  department?: string;
}

interface ProfessionalCommandAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  roleFilter?: string;
  unitFilter?: string;
}

export function ProfessionalCommandAutocomplete({ 
  value, 
  onValueChange, 
  placeholder = "Buscar profissional por nome, email ou telefone...",
  disabled = false,
  roleFilter,
  unitFilter
}: ProfessionalCommandAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        loadProfessionals(searchTerm);
        setOpen(true);
      } else if (searchTerm.length === 0) {
        setProfessionals([]);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, unitFilter]);

  // Update display value when selection changes
  useEffect(() => {
    const selectedProfessional = professionals.find(prof => prof.user_id === value);
    if (selectedProfessional && value) {
      setDisplayValue(selectedProfessional.name);
    } else if (!value) {
      setDisplayValue('');
    }
  }, [value, professionals]);

  const loadProfessionals = async (search: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, user_id, name, email, phone, employee_role, unit, department')
        .eq('is_active', true)
        .not('employee_role', 'is', null)
        .limit(50);

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('employee_role', roleFilter as any);
      }

      // Filtrar por unidade baseado no employee_role
      if (unitFilter && unitFilter !== 'all') {
        if (unitFilter === 'madre') {
          // Madre: excluir apenas coordenador do floresta
          query = query.not('employee_role', 'eq', 'coordinator_floresta');
        } else if (unitFilter === 'floresta') {
          // Floresta: excluir apenas coordenador da madre
          query = query.not('employee_role', 'eq', 'coordinator_madre');
        } else if (unitFilter === 'atendimento_floresta') {
          // Atendimento Floresta: permitir todos
          // Não exclui nenhum coordenador específico
        }
      }

      const { data, error } = await query.order('name');
      
      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      toast({ 
        description: 'Erro ao carregar profissionais',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'director': 'Diretor',
      'coordinator_madre': 'Coordenador Madre', 
      'coordinator_floresta': 'Coordenador Floresta',
      'administrative': 'Administrativo',
      'staff': 'Staff',
      'receptionist': 'Recepcionista',
      'financeiro': 'Financeiro'
    };
    return roleLabels[role] || role;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    setSearchTerm(newValue);
    
    if (!newValue) {
      onValueChange('');
    }
  };

  const handleSelectProfessional = (professional: Professional, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onValueChange(professional.user_id);
    setDisplayValue(professional.name);
    setSearchTerm('');
    setOpen(false);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2 || professionals.length > 0) {
      setOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow for click events and prevent premature closing
    setTimeout(() => {
      const activeElement = document.activeElement;
      const container = inputRef.current?.closest('.relative');
      const dropdown = container?.querySelector('[data-dropdown]');
      
      // Don't close if focus is still within the container or dropdown
      if (!container?.contains(activeElement) && !dropdown?.contains(activeElement)) {
        setOpen(false);
      }
    }, 300);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          className="pl-10"
        />
      </div>

      {open && professionals.length > 0 && (
        <div 
          data-dropdown
          className="absolute top-full left-0 right-0 z-[999] bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto mt-1"
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setOpen(true)}
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Buscando...
              </div>
            </div>
          ) : (
            <div className="py-2">
              {professionals.map((professional) => (
                <div
                  key={professional.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectProfessional(professional, e);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-start w-full gap-3 p-3 cursor-pointer hover:bg-muted/50 select-none"
                >
                  <Check
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0",
                      value === professional.user_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{professional.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {professional.employee_role && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Cargo:</span>
                          <span>{getRoleLabel(professional.employee_role)}</span>
                        </div>
                      )}
                      {professional.email && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Email:</span>
                          <span className="truncate">{professional.email}</span>
                        </div>
                      )}
                      {professional.phone && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Tel:</span>
                          <span>{professional.phone}</span>
                        </div>
                      )}
                      {professional.unit && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Unidade:</span>
                          <span className="capitalize">{professional.unit}</span>
                        </div>
                      )}
                      {professional.department && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Depto:</span>
                          <span>{professional.department}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
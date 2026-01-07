import React, { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  unit?: string;
}

interface PatientCommandAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  unitFilter?: string;
}

export function PatientCommandAutocomplete({ 
  value, 
  onValueChange, 
  placeholder = "Buscar paciente por nome, CPF, telefone ou email...",
  disabled = false,
  unitFilter
}: PatientCommandAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        loadClients(searchTerm);
        setOpen(true);
      } else if (searchTerm.length === 0) {
        setClients([]);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, unitFilter]);

  // Update display value when selection changes
  useEffect(() => {
    const selectedClient = clients.find(client => client.id === value);
    if (selectedClient && value) {
      setDisplayValue(selectedClient.name);
    } else if (!value) {
      setDisplayValue('');
    }
  }, [value, clients]);

  const loadClients = async (search: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('clients')
        .select('id, name, cpf, phone, email, unit')
        .eq('is_active', true)
        .limit(50);

      if (search) {
        query = query.or(`name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (unitFilter && unitFilter !== 'all') {
        query = query.eq('unit', unitFilter);
      }

      const { data, error } = await query.order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({ 
        description: 'Erro ao carregar pacientes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    setSearchTerm(newValue);
    
    if (!newValue) {
      onValueChange('');
    }
  };

  const handleSelectClient = (client: Client, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onValueChange(client.id);
    setDisplayValue(client.name);
    setSearchTerm('');
    setOpen(false);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2 || clients.length > 0) {
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

      {open && clients.length > 0 && (
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
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectClient(client, e);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-start w-full gap-3 p-3 cursor-pointer hover:bg-muted/50 select-none"
                >
                  <Check
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{client.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {client.cpf && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">CPF:</span>
                          <span>{client.cpf}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Tel:</span>
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Email:</span>
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.unit && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Unidade:</span>
                          <span className="capitalize">{client.unit}</span>
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
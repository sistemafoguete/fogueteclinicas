import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ClientImportData {
  name: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  responsible_name?: string;
  responsible_cpf?: string;
  is_active: boolean;
  unit: string;
}

export async function executeDirectImport(): Promise<{ success: number; errors: string[] }> {
  try {
    // Fetch the Excel file
    const response = await fetch('/temp/clients_import.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel file
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const parsedData: ClientImportData[] = jsonData.map((row: any) => {
      // Função para converter data do formato dd/mm/yyyy para yyyy-mm-dd
      const convertDate = (dateStr: any) => {
        if (!dateStr) return '';
        
        // Converter para string se for um número (data do Excel)
        const dateString = dateStr.toString();
        
        // Se já estiver no formato correto (yyyy-mm-dd), retorna como está
        if (dateString.match && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        
        // Se for um número de serial do Excel, converte
        if (typeof dateStr === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const days = dateStr - 2; // Excel conta erroneamente 1900 como ano bissexto
          const jsDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
          return jsDate.toISOString().split('T')[0];
        }
        
        // Se estiver no formato dd/mm/yyyy, converte
        if (dateString.includes && dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        
        return '';
      };

      // Limpar e formatar CPF
      const cleanCPF = (cpf: any) => {
        if (!cpf) return '';
        return cpf.toString().replace(/\D/g, '');
      };

      return {
        name: row['Nome Completo'] || '',
        birth_date: convertDate(row['Data de Nascimento']) || '',
        phone: row['Telefone'] || '',
        email: row['E-mail'] || '',
        cpf: cleanCPF(row['CPF']) || '',
        responsible_name: row['Nome do Responsável'] || '',
        responsible_cpf: cleanCPF(row['CPF - Responsável']) || '',
        is_active: row['Ativo ou inativo']?.toLowerCase() === 'ativo',
        unit: 'floresta' // Definir unidade padrão como floresta (neuro)
      };
    });

    // Filtrar apenas linhas com nome preenchido
    const validData = parsedData.filter(item => item.name.trim() !== '');
    
    console.log(`${validData.length} clientes encontrados para importação direta.`);
    
    const errors: string[] = [];
    let successCount = 0;

    // Importar todos os clientes de uma vez usando batch insert
    const clientsToInsert: any[] = [];
    
    for (const client of validData) {
      try {
        // Verificar se cliente já existe pelo CPF ou nome
        let existingClient = null;
        
        if (client.cpf) {
          const { data } = await supabase
            .from('clients')
            .select('id, name')
            .eq('cpf', client.cpf)
            .maybeSingle();
          existingClient = data;
        }

        if (!existingClient && client.name) {
          const { data } = await supabase
            .from('clients')
            .select('id, name')
            .ilike('name', client.name)
            .maybeSingle();
          existingClient = data;
        }

        if (existingClient) {
          errors.push(`Cliente "${client.name}" já existe no sistema`);
        } else {
          // Adicionar à lista para inserção em lote
          clientsToInsert.push({
            name: client.name,
            phone: client.phone || null,
            email: client.email || null,
            birth_date: client.birth_date || null,
            cpf: client.cpf || null,
            responsible_name: client.responsible_name || null,
            is_active: client.is_active,
            unit: client.unit
          });
        }
      } catch (error) {
        errors.push(`Erro inesperado ao processar "${client.name}": ${error}`);
      }
    }

    // Inserir todos os clientes de uma vez
    if (clientsToInsert.length > 0) {
      const { data, error } = await supabase
        .from('clients')
        .insert(clientsToInsert)
        .select('name');

      if (error) {
        errors.push(`Erro na inserção em lote: ${error.message}`);
      } else {
        successCount = data?.length || 0;
        console.log(`${successCount} clientes importados com sucesso em lote`);
      }
    }

    return { success: successCount, errors };
    
  } catch (error) {
    console.error('Erro ao importar clientes diretamente:', error);
    return { success: 0, errors: [`Erro geral na importação: ${error}`] };
  }
}
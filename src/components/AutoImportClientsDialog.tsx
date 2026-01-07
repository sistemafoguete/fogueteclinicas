import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Users, Database } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

interface AutoImportClientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ClientData {
  name: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  responsible_name?: string;
  responsible_cpf?: string;
  is_active: boolean;
  unit: string;
  status?: string;
}

export function AutoImportClientsDialog({ isOpen, onClose, onImportComplete }: AutoImportClientsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Dados dos pacientes ativos da planilha
  const activeClients: ClientData[] = [
    {
      name: 'Antônio Renato Ferreira dos Santos',
      birth_date: '2014-10-16',
      phone: '(31) 98986-9421',
      email: 'alessandraferreira3517@gmail.com',
      cpf: '14665266611',
      responsible_name: 'Alessandra Ferreira da Silva',
      responsible_cpf: '05159766600',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Daniel Barbosa Silva',
      birth_date: '1997-12-15',
      phone: '(31) 98534-7145',
      email: 'martabarbosa151221@gmail.com',
      cpf: '08807389606',
      responsible_name: 'Marta Barbosa Rocha Silva',
      responsible_cpf: '99995069687',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Gabriel Alves Novaes',
      birth_date: '2008-04-19',
      phone: '(31) 98822-9381',
      email: 'jane.a.s.novaes@gmail.com',
      cpf: '01787592600',
      responsible_name: 'Jane Alves da Silva novaes',
      responsible_cpf: '76990834668',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Luan Victor Reis da Silva Lopes',
      birth_date: '2017-03-01',
      phone: '(31) 99502-1093',
      email: 'shelenreisdasilvalopes92@gmail.com',
      cpf: '18104199641',
      responsible_name: 'Shelen Reis Da Silva Lopes',
      responsible_cpf: '12285417608',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'João Lucas Ashbel Machado',
      birth_date: '2016-12-16',
      phone: '(31) 99257-6101',
      email: 'ashbel.abgail@gmail.com',
      cpf: '16055327627',
      responsible_name: 'Maria Thereza de Jesus Machado',
      responsible_cpf: '02965750622',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Arthur Miguel Lina de Freitas',
      birth_date: '2016-06-17',
      phone: '(31) 99715-4245',
      email: '',
      cpf: '70331743655',
      responsible_name: 'Maria Lima de Freitas',
      responsible_cpf: '05423251605',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Esther Luiza Lina de Freitas',
      birth_date: '2016-06-17',
      phone: '(31) 99715-4245',
      email: '',
      cpf: '70333174507',
      responsible_name: 'Maria Lima de Freitas',
      responsible_cpf: '05423251605',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'João Paulo Lopes Bueno',
      birth_date: '2010-05-28',
      phone: '(31) 98630-7075',
      email: 'polianasilva.lopes@yahoo.com.br',
      cpf: '17808859621',
      responsible_name: 'Poliana Da Silva Lopes',
      responsible_cpf: '07892739696',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Noah Felipe Franco Bueno',
      birth_date: '2021-09-08',
      phone: '(31) 98347-8590',
      email: 'Lucineafs.37@hotmail.com',
      cpf: '18936214640',
      responsible_name: 'Lucinea Ferreira dos Santos',
      responsible_cpf: '02505229694',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'João Miguel Vieira de Souza Reis',
      birth_date: '2016-02-17',
      phone: '(31) 98786-2505',
      email: 'ianavieira465@gmail.com',
      cpf: '17820023678',
      responsible_name: 'Ianamara Vieira de Souza',
      responsible_cpf: '05220704699',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Richard Phillipe de Souza Sales',
      birth_date: '2015-09-15',
      phone: '(31) 98772-2048',
      email: 'jeniffershaiene@hotmail.com',
      cpf: '70540609625',
      responsible_name: 'Jeniffer Shaiene do Nascimento de Sales',
      responsible_cpf: '11855855674',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Jeanne Mary Vieira Chequer',
      birth_date: '1972-09-25',
      phone: '(31) 99872-5185',
      email: 'jeannemary13@gmail.com',
      cpf: '82911940687',
      responsible_name: 'Jeanne Mary Vieira Chequer',
      responsible_cpf: '',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Antônio Augusto Catão Alves Júnior',
      birth_date: '1972-10-07',
      phone: '(31) 99955-1092',
      email: 'profissional.mg9@gmail.com',
      cpf: '92376240697',
      responsible_name: 'Antônio Augusto Catão Alves Júnior',
      responsible_cpf: '92376240697',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Miguel Gomes Alves',
      birth_date: '2014-07-17',
      phone: '(31) 98556-5531',
      email: 'Heidymarcos23@gmail.com',
      cpf: '15295037606',
      responsible_name: 'Heidy Silva Alves',
      responsible_cpf: '11200194608',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Davi Meireles Chaves',
      birth_date: '2017-03-24',
      phone: '(31) 98567-2256',
      email: 'simonemeirelespower@gmail.com',
      cpf: '16190685676',
      responsible_name: 'Simone Meireles',
      responsible_cpf: '04544594677',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Eloá Quadros Cardoso',
      birth_date: '2017-11-17',
      phone: '(31) 98713-4729',
      email: 'tatielle.quadros@gmail.com',
      cpf: '16601436674',
      responsible_name: 'Tatielle Batista Oliveira Quadros',
      responsible_cpf: '12279799677',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Ketlen Vitória Viana faria Oliveira',
      birth_date: '2008-10-15',
      phone: '(31) 98727-7130',
      email: 'raquelvianafariaoliveira@gmail.com',
      cpf: '12066127620',
      responsible_name: 'Raquel Viana faria Oliveira',
      responsible_cpf: '07543862603',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Ana Carolina Lourdes da Silva',
      birth_date: '1996-11-18',
      phone: '(31) 98257-1360',
      email: 'carolthemachine@hotmail.com',
      cpf: '13959855613',
      responsible_name: 'Lucimar Lourdes Neto Regis',
      responsible_cpf: '02450093613',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Marcos Henrique Tenório Almeida',
      birth_date: '2018-11-07',
      phone: '(31) 99324-9610',
      email: 'fabiana.tenorio86@gmail.com',
      cpf: '17435057606',
      responsible_name: 'Fabiana Cristina Reis Tenório',
      responsible_cpf: '07861784690',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Mateus Gandos de Castro',
      birth_date: '2014-05-14',
      phone: '(31) 99543-9803',
      email: 'michellegandos12@gmail.com',
      cpf: '',
      responsible_name: 'Michelle mãe',
      responsible_cpf: '',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Inglecia dos Santos Santos',
      birth_date: '1999-12-31',
      phone: '(31) 99285-9568',
      email: 'Ingleciasantos2013@hotmail.com',
      cpf: '01979988609',
      responsible_name: 'Inglecia dos Santos Santos',
      responsible_cpf: '01979988609',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Matheus Righi Santos',
      birth_date: '2018-12-12',
      phone: '(31) 98470-4392',
      email: 'jurighipsi@gmail.com',
      cpf: '17503528699',
      responsible_name: 'Juliana Costa Righi',
      responsible_cpf: '00149178662',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Polliany Sincero Nunes Fialho da Silva',
      birth_date: '1986-08-11',
      phone: '(31) 99338-8715',
      email: 'pollyfialho@hotmail.com',
      cpf: '08402883605',
      responsible_name: 'Polliany Sincero Nunes Fialho da Silva',
      responsible_cpf: '08402883605',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    },
    {
      name: 'Jéssica Santos da Costa',
      birth_date: '1994-05-05',
      phone: '(31) 99815-0639',
      email: 'jessica.scd@hotmail.com',
      cpf: '12901001602',
      responsible_name: 'Jéssica Santos da Costa',
      responsible_cpf: '12901001602',
      is_active: true,
      unit: 'madre',
      status: 'Laudo'
    }
  ];

  // Pacientes em avaliação
  const evaluationClients: ClientData[] = [
    {
      name: 'Alyce Vitória Miguel de Souza',
      birth_date: '2015-06-07',
      phone: '(31) 98956-5944',
      cpf: '15292148660',
      responsible_name: 'Hélio Márcio José Miguel Júnior',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Ana Beatrice Peixoto Mário',
      birth_date: '2001-07-09',
      phone: '(31) 99299-1523',
      cpf: '14746007608',
      responsible_name: 'Ana Beatrice Peixoto Mário',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Bianca da Silva Macedo Costa',
      birth_date: '2003-04-12',
      phone: '(31) 98864-0112',
      cpf: '16083375614',
      responsible_name: 'Bianca da Silva Macedo Costa',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Bianca Pereira Viana de Carvalho',
      birth_date: '2016-05-01',
      phone: '(31) 98681-8859',
      cpf: '15566642659',
      responsible_name: 'Beatriz Pereira Viana',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Bruna Gontijo Pellegrino',
      birth_date: '1977-10-26',
      phone: '(31) 99182-4986',
      cpf: '1263891608',
      responsible_name: 'Bruna Gontijo Pellegrino',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Clóvis Prazeres dos Santos',
      birth_date: '1970-06-15',
      phone: '(31) 98762-5333',
      cpf: '59491914553',
      responsible_name: 'Clóvis Prazeres dos Santos',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Daniel Guilherme Lopes Araújo',
      birth_date: '2013-08-05',
      phone: '(31) 98642-0851',
      cpf: '14467137688',
      responsible_name: 'Talita Lima Lopes Heringer',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Daniel Henrique Pereira Gabriel',
      birth_date: '2007-11-15',
      phone: '(31) 98831-1017',
      cpf: '18189236610',
      responsible_name: 'Natália Pereira Gabriel',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Davi Lucca Plautigio Fiuza',
      birth_date: '2019-01-19',
      phone: '(31) 98598-9256',
      cpf: '17576876611',
      responsible_name: 'Luana Nunes Fiuza',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Fernanda Meireles Chaves',
      birth_date: '2014-06-05',
      phone: '(31) 98567-2256',
      cpf: '16066091654',
      responsible_name: 'Simone Meireles',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Flávia da Costa Pereira Mattoso',
      birth_date: '1972-08-01',
      phone: '(31) 99197-7791',
      cpf: '501979670',
      responsible_name: 'Flávia da Costa Pereira Mattoso',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    },
    {
      name: 'Gabriel Henrique Rodrigues Triunfo',
      birth_date: '2018-02-22',
      phone: '(31) 98779-4901',
      cpf: '16845446610',
      responsible_name: 'Fabiano Moreira triunfo',
      is_active: true,
      unit: 'madre',
      status: 'Em avaliação'
    }
  ];

  const allClients = [...activeClients, ...evaluationClients];

  const handleAutoImport = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < allClients.length; i++) {
      const client = allClients[i];
      
      try {
        // Verificar se cliente já existe pelo CPF ou nome
        let existingClient = null;
        
        if (client.cpf) {
          const { data } = await supabase
            .from('clients')
            .select('id, name')
            .eq('cpf', client.cpf.replace(/\D/g, ''))
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
          // Preparar dados para inserção
          const insertData: any = {
            name: client.name,
            phone: client.phone || null,
            email: client.email || null,
            birth_date: client.birth_date || null,
            cpf: client.cpf?.replace(/\D/g, '') || null,
            responsible_name: client.responsible_name || null,
            is_active: client.is_active,
            unit: client.unit,
            created_by: user?.id,
            diagnosis: client.status || null
          };

          const { error } = await supabase
            .from('clients')
            .insert(insertData);

          if (error) {
            errors.push(`Erro ao importar "${client.name}": ${error.message}`);
          } else {
            successCount++;
          }
        }
      } catch (error) {
        errors.push(`Erro inesperado ao processar "${client.name}": ${error}`);
      }

      setProgress(((i + 1) / allClients.length) * 100);
    }

    setResults({ success: successCount, errors });
    setIsProcessing(false);

    if (successCount > 0) {
      toast({
        title: "Importação automática concluída",
        description: `${successCount} clientes importados com sucesso.`,
      });
      onImportComplete();
    }
  };

  const handleClose = () => {
    setResults(null);
    setProgress(0);
    setIsProcessing(false);
    onClose();
  };

  // Auto-start import removed to prevent unwanted notifications
  // useEffect(() => {
  //   if (isOpen && !isProcessing && !results) {
  //     // Auto-start import when dialog opens
  //     handleAutoImport();
  //   }
  // }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Importação Automática de Clientes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Dados da Planilha</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              • {activeClients.length} clientes ativos com laudo
            </p>
            <p className="text-sm text-muted-foreground">
              • {evaluationClients.length} clientes em avaliação
            </p>
            <p className="text-sm font-medium text-foreground mt-2">
              Total: {allClients.length} clientes para importar
            </p>
          </div>

          {!isProcessing && !results && (
            <div className="text-center">
              <Button onClick={handleAutoImport} className="w-full">
                Iniciar Importação
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Importando clientes automaticamente...</p>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% concluído
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Importação concluída: {results.success} clientes importados
                </span>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{results.errors.length} cliente(s) já existiam:</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-muted/50 p-3 rounded">
                    {results.errors.map((error, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleClose}>
              {results ? 'Fechar' : 'Cancelar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
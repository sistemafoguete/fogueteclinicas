import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ImportExcelStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportExcelStockDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportExcelStockDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Dados extraídos da planilha
  const stockData = [
    {
      name: "PRONUMERO - TCAB",
      category: "Habilidades Acadêmicas",
      unit_cost: 7.80,
      current_quantity: 1,
      supplier: "Vetor",
      description: "Livro de Aplicação e Avaliação Tarefa de Cálculos Aritméticos Básicos"
    },
    {
      name: "PRONUMERO - TPAN",
      category: "Habilidades Acadêmicas", 
      unit_cost: 7.80,
      current_quantity: 1,
      supplier: "Vetor",
      description: "Livro de Aplicação e Avaliação Tarefa de Problemas Aritmético Narrativos"
    },
    {
      name: "PRONUMERO - TTN",
      category: "Habilidades Acadêmicas",
      unit_cost: 7.80,
      current_quantity: 1,
      supplier: "Vetor", 
      description: "Livro de Aplicação e Avaliação Tarefa de Transcodificação Numérica"
    },
    {
      name: "HUMOR-IJ - Folha de aplicação",
      category: "Humor e Comportamento",
      unit_cost: 17.00,
      current_quantity: 3,
      supplier: "Pearson/Hografe",
      description: "Bateria de Escalas de Sintomas Internalizantes Infantojuvenil"
    },
    {
      name: "BFP - Folha de Aplicação",
      category: "Personalidade",
      unit_cost: 15.88,
      current_quantity: 5,
      supplier: "Pearson/Hografe",
      description: "Bateria Fatorial de Personalidade - Verificar o valor da folha de aplicação"
    },
    {
      name: "BFP - Folha de Apuração", 
      category: "Personalidade",
      unit_cost: 15.88,
      current_quantity: 2,
      supplier: "Pearson/Hografe",
      description: "Bateria Fatorial de Personalidade"
    },
    {
      name: "BFP - Folha de Resposta",
      category: "Personalidade",
      unit_cost: 2.36,
      current_quantity: 9,
      supplier: "Pearson/Hografe", 
      description: "Bateria Fatorial de Personalidade"
    },
    {
      name: "MTL - Livro de Aplicação I",
      category: "Linguagem",
      unit_cost: 14.90,
      current_quantity: 6,
      supplier: "Vetor",
      description: "Bateria Montreal-Toulouse de Avaliação da Linguagem"
    },
    {
      name: "MTL - Livro de Aplicação II",
      category: "Linguagem",
      unit_cost: 14.90,
      current_quantity: 6,
      supplier: "Vetor",
      description: "Bateria Montreal-Toulouse de Avaliação da Linguagem - Inclui o livro de aplicação II"
    },
    {
      name: "BPA-2 - Atenção Alternada",
      category: "Atenção",
      unit_cost: 1.20,
      current_quantity: 16,
      supplier: "Vetor",
      description: "São 3 blocos com 25 folhas cada, mas cada vez que utiliza são 3 folhar para cada paciente, uma de cada bloco."
    },
    {
      name: "BPA-2 - Atenção Concentrada",
      category: "Atenção",
      unit_cost: 1.20,
      current_quantity: 1,
      supplier: "Vetor",
      description: "Bateria Psicológica para Avaliação da Atenção"
    },
    {
      name: "BPA-2 - Atenção Dividida",
      category: "Atenção",
      unit_cost: 1.20,
      current_quantity: 16,
      supplier: "Vetor",
      description: "Bateria Psicológica para Avaliação da Atenção"
    },
    {
      name: "Ditado Balanceado - Ficha Individual",
      category: "Habilidades Acadêmicas",
      unit_cost: 3.85,
      current_quantity: 25,
      supplier: "Pearson/Hografe",
      description: "Avaliação da escrita alfabético-ortográfica"
    },
    {
      name: "Ditado Balanceado - Ficha Progressiva",
      category: "Habilidades Acadêmicas",
      unit_cost: 5.89,
      current_quantity: 10,
      supplier: "Pearson/Hografe",
      description: "Avaliação da escrita alfabético-ortográfica"
    },
    {
      name: "Ditado Balanceado - Perfil Ortográfico",
      category: "Habilidades Acadêmicas",
      unit_cost: 5.50,
      current_quantity: 10,
      supplier: "Pearson/Hografe",
      description: "Perfil Ortográfico da Turma"
    },
    {
      name: "Columbia 3 - Folha de Respostas",
      category: "Inteligência",
      unit_cost: 2.80,
      current_quantity: 73,
      supplier: "Pearson/Hografe",
      description: "Escala de Maturidade Mental Colúmbia 3 - comprar"
    },
    {
      name: "SRS-2 - Protocolo Adulto Autorrelato",
      category: "Humor e Comportamento",
      unit_cost: 13.31,
      current_quantity: 12,
      supplier: "Pearson/Hografe",
      description: "Escala de Responsividade Social - Comprar"
    },
    {
      name: "SRS-2 - Protocolo Adulto Heterorrelato",
      category: "Humor e Comportamento",
      unit_cost: 13.31,
      current_quantity: 9,
      supplier: "Pearson/Hografe",
      description: "Escala de Responsividade Social"
    },
    {
      name: "SRS-2 - Protocolo Escolar",
      category: "Humor e Comportamento",
      unit_cost: 13.31,
      current_quantity: 7,
      supplier: "Pearson/Hografe",
      description: "Escala de Responsividade Social - Comprar"
    },
    {
      name: "SRS-2 - Protocolo Pré-Escolar",
      category: "Humor e Comportamento",
      unit_cost: 13.31,
      current_quantity: 16,
      supplier: "Pearson/Hografe",
      description: "Escala de Responsividade Social"
    },
    {
      name: "WASI - Protocolo De Registro",
      category: "Inteligência",
      unit_cost: 33.98,
      current_quantity: 8,
      supplier: "Pearson/Hografe",
      description: "Escala Weschler Abreviada de Inteligência"
    },
    {
      name: "WISC-IV - Protocolo Cancelamento",
      category: "Inteligência",
      unit_cost: 32.74,
      current_quantity: 1,
      supplier: "Pearson/Hografe",
      description: "Escala Weschler de Inteligência para Crianças - comprar"
    },
    {
      name: "WISC-IV - Protocolo Códigos",
      category: "Inteligência",
      unit_cost: 32.74,
      current_quantity: 4,
      supplier: "Pearson/Hografe",
      description: "Protocolo de Aplicação Códigos e Procurar Símbolos"
    },
    {
      name: "WISC-IV - Protocolo Geral",
      category: "Inteligência",
      unit_cost: 50.37,
      current_quantity: 4,
      supplier: "Pearson/Hografe",
      description: "Protocolo de Aplicação Geral"
    },
    {
      name: "Figura de Rey - Ficha A",
      category: "Visuoconstrução",
      unit_cost: 2.29,
      current_quantity: 22,
      supplier: "Pearson/Hografe",
      description: "Figura Complexa de Rey - Ficha de Anotação Figura A"
    },
    {
      name: "Figura de Rey - Ficha B",
      category: "Visuoconstrução",
      unit_cost: 2.29,
      current_quantity: 25,
      supplier: "Pearson/Hografe",
      description: "Figura Complexa de Rey - Ficha de Anotação Figura B"
    },
    {
      name: "BIS - Inventário Breve de Sintomas",
      category: "Outros",
      unit_cost: 0,
      current_quantity: 10,
      supplier: "Pearson/Hografe",
      description: "Verificar a quantidade que compramos"
    },
    {
      name: "IDADI - Vol. 3 (36 a 72 meses)",
      category: "Desenvolvimento",
      unit_cost: 17.80,
      current_quantity: 3,
      supplier: "Vetor",
      description: "Inventário Dimensional de Avaliação do Desenvolvimento Infantil - Verificar. Pendente 2 livros"
    },
    {
      name: "IDADI - Vol. 2 (4 a 35 meses)",
      category: "Desenvolvimento",
      unit_cost: 17.80,
      current_quantity: 5,
      supplier: "Vetor",
      description: "Inventário Dimensional de Avaliação do Desenvolvimento Infantil - Completo"
    },
    {
      name: "IDADI - Vol. 4 Avaliação",
      category: "Desenvolvimento",
      unit_cost: 17.80,
      current_quantity: 10,
      supplier: "Vetor",
      description: "Inventário Dimensional de Avaliação do Desenvolvimento Infantil - Verificar. 5 Livros a mais"
    },
    {
      name: "CPM-RAVEN - Folha de Respostas",
      category: "Inteligência",
      unit_cost: 2.07,
      current_quantity: 46,
      supplier: "Pearson/Hografe",
      description: "Matrizes Progressivas Coloridas de Raven - Verificar quantos foram testes compramos."
    },
    {
      name: "Perfil Sensorial 2 - Abreviado",
      category: "Humor e Comportamento",
      unit_cost: 18.29,
      current_quantity: 9,
      supplier: "Pearson/Hografe",
      description: "3 anos e 0 meses a 14 anos e 11 meses"
    },
    {
      name: "Perfil Sensorial 2 - Escolar",
      category: "Humor e Comportamento",
      unit_cost: 18.29,
      current_quantity: 8,
      supplier: "Pearson/Hografe",
      description: "Acompanhamento Escolar - 3 anos e 0 meses a 14 anos e 11 meses"
    },
    {
      name: "Perfil Sensorial 2 - Bebê",
      category: "Humor e Comportamento",
      unit_cost: 18.29,
      current_quantity: 10,
      supplier: "Pearson/Hografe",
      description: "Nascimento até 6 meses"
    },
    {
      name: "Perfil Sensorial 2 - Criança",
      category: "Humor e Comportamento",
      unit_cost: 18.29,
      current_quantity: 5,
      supplier: "Pearson/Hografe",
      description: "3 anos e 0 meses a 14 anos e 11 meses"
    },
    {
      name: "Perfil Sensorial 2 - Criança Pequena",
      category: "Humor e Comportamento",
      unit_cost: 18.29,
      current_quantity: 10,
      supplier: "Pearson/Hografe",
      description: "7 a 35 meses"
    },
    {
      name: "PROLEC-SE-R - Folha de Respostas",
      category: "Habilidades Acadêmicas",
      unit_cost: 10.45,
      current_quantity: 12,
      supplier: "Pearson/Hografe",
      description: "Provas de Avaliação dos Processos de Leitura - Ensino Fundamental II e Médio"
    },
    {
      name: "PROLEC-SE-R - Folha Rastreio",
      category: "Habilidades Acadêmicas",
      unit_cost: 10.45,
      current_quantity: 9,
      supplier: "Pearson/Hografe",
      description: "Provas de Avaliação dos Processos de Leitura - Folha de Respostas Rastreio"
    },
    {
      name: "D2-R - Folhas de Respostas",
      category: "Atenção",
      unit_cost: 5.92,
      current_quantity: 22,
      supplier: "Pearson/Hografe",
      description: "Teste D2 Revisado"
    },
    {
      name: "RAVLT - Livro de Aplicação Vol. 2",
      category: "Habilidades Acadêmicas",
      unit_cost: 1.76,
      current_quantity: 0,
      supplier: "Vetor",
      description: "Teste de Aprendizagem Auditivo Verbal de Rey"
    },
    {
      name: "TDE-II - Aritmética 1º ao 5º ano Vol. 6",
      category: "Habilidades Acadêmicas",
      unit_cost: 3.80,
      current_quantity: 17,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Subteste Aritmética"
    },
    {
      name: "TDE-II - Aritmética 6º ao 9º ano Vol. 11",
      category: "Habilidades Acadêmicas",
      unit_cost: 3.80,
      current_quantity: 23,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Subteste Aritmética"
    },
    {
      name: "TDE-II - Escrita 1º ao 9º ano Vol. 3",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 12,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Subteste Escrita"
    },
    {
      name: "TDE-II - Avaliação Geral Vol. 14",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 13,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Livro de Avaliação Geral"
    },
    {
      name: "TDE-II - Qualitativa Escrita 1º ao 4º Vol. 5",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 19,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Qualitativa Subteste Escrita"
    },
    {
      name: "TDE-II - Qualitativa Escrita 5º ao 9º Vol. 10",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 10,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Qualitativa Subteste Escrita"
    },
    {
      name: "TDE-II - Aritmética 1º ao 5º Vol. 7",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 20,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Subteste Aritmética"
    },
    {
      name: "TDE-II - Aritmética 6º ao 9º Vol. 12",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 20,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Subteste Aritmética"
    },
    {
      name: "TDE-II - Escrita 1º ao 4º Vol. 4",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 20,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Subteste Escrita"
    },
    {
      name: "TDE-II - Escrita 5º ao 9º Vol. 9",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.12,
      current_quantity: 19,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Subteste Escrita"
    },
    {
      name: "TDE-II - Leitura 1º ao 4º Vol. 8",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.16,
      current_quantity: 16,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Subteste Leitura"
    },
    {
      name: "TDE-II - Leitura 5º ao 9º Vol. 13",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.16,
      current_quantity: 13,
      supplier: "Vetor",
      description: "Teste de Desempenho Escolar - Avaliação Subteste Leitura"
    },
    {
      name: "THCP - Livro de Exercício I Vol. 2",
      category: "Habilidades Acadêmicas",
      unit_cost: 7.76,
      current_quantity: 20,
      supplier: "Vetor",
      description: "Teste de Habilidades e Conhecimento Pré-Alfabetização"
    },
    {
      name: "THCP - Protocolo de Registro Vol. 4",
      category: "Habilidades Acadêmicas",
      unit_cost: 2.24,
      current_quantity: 20,
      supplier: "Vetor",
      description: "Teste de Habilidades e Conhecimento Pré-Alfabetização"
    },
    {
      name: "FDT - Folha de Respostas",
      category: "Funções Executivas",
      unit_cost: 3.00,
      current_quantity: 16,
      supplier: "Pearson/Hografe",
      description: "Teste dos Cinco Dígitos - Comprar"
    },
    {
      name: "FPT - Bloco de Respostas",
      category: "Funções Executivas",
      unit_cost: 1.06,
      current_quantity: 22,
      supplier: "Ampla",
      description: "Teste dos Cinco Pontos"
    },
    {
      name: "TISD - Livro de Aplicação Vol. 4",
      category: "Habilidades Acadêmicas",
      unit_cost: 8.20,
      current_quantity: 4,
      supplier: "Vetor",
      description: "Teste para Identificação de Sinais de Dislexia"
    },
    {
      name: "TISD - Livro de Aplicação Vol. 5",
      category: "Habilidades Acadêmicas",
      unit_cost: 8.20,
      current_quantity: 5,
      supplier: "Vetor",
      description: "Teste para Identificação de Sinais de Dislexia"
    },
    {
      name: "TriC - Livro de Aplicação Vol. 2",
      category: "Humor e Comportamento",
      unit_cost: 2.12,
      current_quantity: 24,
      supplier: "Vetor",
      description: "Triagem de Problemas Emocionais e Comportamentais em Crianças"
    },
    {
      name: "TriA - Livro de Aplicação Vol. 2",
      category: "Humor e Comportamento",
      unit_cost: 6.40,
      current_quantity: 0,
      supplier: "Vetor",
      description: "Triagem de Psicopatologia para Adultos - comprar"
    },
    {
      name: "Vineland-3 - Níveis de Domínio",
      category: "Funcionamento Adaptativo",
      unit_cost: 15.25,
      current_quantity: 3,
      supplier: "Pearson/Hografe",
      description: "Vineland Escala de Comportamentos Adaptativos - Formulário de Entrevista"
    },
    {
      name: "Vineland-3 - Entrevista Extensivo",
      category: "Funcionamento Adaptativo",
      unit_cost: 24.15,
      current_quantity: 1,
      supplier: "Pearson/Hografe",
      description: "Vineland Escala de Comportamentos Adaptativos"
    },
    {
      name: "Vineland-3 - Domínio Pais",
      category: "Funcionamento Adaptativo",
      unit_cost: 15.25,
      current_quantity: 8,
      supplier: "Pearson/Hografe",
      description: "Vineland Escala de Comportamentos Adaptativos"
    },
    {
      name: "Vineland-3 - Domínio Professores",
      category: "Funcionamento Adaptativo",
      unit_cost: 15.25,
      current_quantity: 5,
      supplier: "Pearson/Hografe",
      description: "Vineland Escala de Comportamentos Adaptativos - comprar"
    },
    {
      name: "Vineland-3 - Extensivo Pais",
      category: "Funcionamento Adaptativo",
      unit_cost: 24.15,
      current_quantity: 0,
      supplier: "Pearson/Hografe",
      description: "Vineland Escala de Comportamentos Adaptativos - comprar"
    },
    {
      name: "Vineland-3 - Extensivo Professores",
      category: "Funcionamento Adaptativo",
      unit_cost: 24.15,
      current_quantity: 0,
      supplier: "Pearson/Hografe",
      description: "Vineland Escala de Comportamentos Adaptativos - comprar"
    },
    {
      name: "TENA - Folha de registro",
      category: "Outros",
      unit_cost: 0,
      current_quantity: 22,
      supplier: "",
      description: "Teste de Nomeação automática"
    },
    {
      name: "TIMER-R - Folha de registro",
      category: "Outros",
      unit_cost: 0,
      current_quantity: 20,
      supplier: "", 
      description: "Teste Infantil de Memória"
    }
  ];

  const handleImport = async () => {
    setIsImporting(true);
    setProgress(0);

    try {
      const total = stockData.length;
      let imported = 0;
      let errors = 0;

      for (const item of stockData) {
        try {
          const { error } = await supabase
            .from('stock_items')
            .insert({
              name: item.name,
              category: item.category,
              unit_cost: item.unit_cost,
              current_quantity: item.current_quantity,
              minimum_quantity: Math.max(1, Math.ceil(item.current_quantity * 0.2)), // 20% do estoque atual como mínimo
              supplier: item.supplier || null,
              description: item.description,
              unit: 'unidade',
              location: 'Estoque Principal',
              is_active: true
            });

          if (error) {
            console.error(`Erro ao importar ${item.name}:`, error);
            errors++;
          } else {
            imported++;
          }
        } catch (error) {
          console.error(`Erro ao importar ${item.name}:`, error);
          errors++;
        }

        setProgress(((imported + errors) / total) * 100);
      }

      toast({
        title: "Importação concluída",
        description: `${imported} itens importados com sucesso. ${errors > 0 ? `${errors} erros encontrados.` : ''}`,
        variant: errors > 0 ? "destructive" : "default"
      });

      if (imported > 0) {
        onImportComplete();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erro geral na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação dos itens.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Itens do Estoque</DialogTitle>
          <DialogDescription>
            Importar todos os itens da planilha "Estoque_de_Instrumentos_22-09-2025.xlsx" para o sistema.
            <br />
            <strong>Total de itens: {stockData.length}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isImporting && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Importando itens... {Math.round(progress)}%
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? "Importando..." : "Importar Todos os Itens"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
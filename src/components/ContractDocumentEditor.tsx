import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import timbradoFooter from '@/assets/contract-timbrado-footer.jpg';
import logoFundacao from '@/assets/fundacao-dom-bosco-logo-main.png';

interface ContractDocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  previewData?: Record<string, string>;
}

export function ContractDocumentEditor({ 
  content, 
  onChange, 
  readOnly = false,
  previewData 
}: ContractDocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Substitui variáveis por dados de preview
  const displayContent = previewData
    ? Object.entries(previewData).reduce(
        (text, [key, value]) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
        content
      )
    : content;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !readOnly) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 800)}px`;
    }
  }, [content, readOnly]);

  return (
    <div className="h-full flex flex-col bg-[#525659]">
      {/* Barra de régua estilo Word */}
      <div className="bg-[#f3f3f3] border-b border-[#d4d4d4] px-4 py-1 flex items-center justify-center">
        <div className="w-full max-w-[210mm] relative h-6">
          {/* Régua horizontal */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-4 bg-white border border-[#c0c0c0] rounded-sm flex items-center px-1">
              {/* Marcações da régua */}
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="flex-1 flex justify-center">
                  <div className={`h-${i % 5 === 0 ? '3' : '1.5'} w-px bg-[#666]`} />
                  {i % 5 === 0 && (
                    <span className="text-[8px] text-[#666] absolute mt-2">{i}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Área de documento com scroll */}
      <ScrollArea className="flex-1">
        <div className="flex justify-center py-8 px-6 min-h-full">
          {/* Página A4 estilo Word */}
          <div 
            className="relative flex flex-col"
            style={{
              width: '210mm',
              minHeight: '297mm',
              background: '#ffffff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
              fontFamily: 'Times New Roman, Georgia, serif',
            }}
          >
            {/* Indicadores de margem (linhas pontilhadas) */}
            <div 
              className="absolute pointer-events-none"
              style={{
                top: '25mm',
                left: '30mm',
                right: '25mm',
                bottom: '25mm',
                border: '1px dashed rgba(0,0,0,0.1)',
              }}
            />

            {/* Cabeçalho com Logo - Apenas primeira página */}
            <div 
              className="flex justify-center items-center"
              style={{ 
                paddingTop: '20mm',
                paddingBottom: '10mm',
              }}
            >
              <img 
                src={logoFundacao} 
                alt="Fundação Dom Bosco" 
                style={{ 
                  height: '25mm',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Área de Conteúdo Editável */}
            <div 
              className="flex-1"
              style={{
                paddingLeft: '30mm',
                paddingRight: '25mm',
                paddingBottom: '10mm',
              }}
            >
              {readOnly ? (
                <div 
                  className="whitespace-pre-wrap"
                  style={{ 
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    color: '#000000',
                    textAlign: 'justify',
                  }}
                >
                  {displayContent || 'Conteúdo do contrato aparecerá aqui...'}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Digite o conteúdo do contrato aqui...

Dica: Use as variáveis do painel lateral para inserir dados dinâmicos como {{NOME_CONTRATANTE}}, {{VALOR}}, etc."
                  className="w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent placeholder:text-gray-400"
                  style={{ 
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    color: '#000000',
                    minHeight: '600px',
                  }}
                />
              )}
            </div>

            {/* Rodapé - Imagem exata do documento Word */}
            <div className="mt-auto">
              <img 
                src={timbradoFooter} 
                alt="Papel Timbrado - Fundação Dom Bosco" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Barra de status estilo Word */}
      <div className="bg-[#217346] text-white px-4 py-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span>Página 1 de 1</span>
          <span>|</span>
          <span>{content.split(/\s+/).filter(Boolean).length} palavras</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Português (Brasil)</span>
        </div>
      </div>
    </div>
  );
}

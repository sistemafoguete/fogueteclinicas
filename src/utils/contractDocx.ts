import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export interface ContractDocxData {
  textoPartes: string;
  valor: string;
  valorExtenso: string;
  formaPagamento: string;
  dataDia: string;
  dataMes: string;
  dataAno: string;
}

/**
 * Gera um documento Word (.docx) a partir do template timbrado
 * substituindo os placeholders pelos dados do contrato
 */
export const generateContractDocx = async (data: ContractDocxData): Promise<Blob> => {
  // Buscar o template
  const response = await fetch('/static/templates/fundacao_timbrado-3.docx');
  if (!response.ok) {
    throw new Error('Não foi possível carregar o template do contrato');
  }
  
  const templateArrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(templateArrayBuffer);
  
  // Configurar docxtemplater com delimitadores {{ }}
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  });

  // Substituir os placeholders
  doc.render({
    TEXTO_PARTES: data.textoPartes,
    VALOR: data.valor,
    VALOR_EXTENSO: data.valorExtenso,
    FORMA_PAGAMENTO: data.formaPagamento,
    DATA_DIA: data.dataDia,
    DATA_MES: data.dataMes,
    DATA_ANO: data.dataAno,
  });

  // Gerar o blob do documento
  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
};

/**
 * Baixa o documento gerado
 */
export const downloadContractDocx = async (
  data: ContractDocxData,
  clientName: string
): Promise<void> => {
  const blob = await generateContractDocx(data);
  
  // Criar link de download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Nome do arquivo: Contrato_NomeCliente_Data.docx
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = clientName.replace(/[^a-zA-Z0-9\u00C0-\u017F ]/g, '').replace(/\s+/g, '_');
  link.download = `Contrato_${safeName}_${dateStr}.docx`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

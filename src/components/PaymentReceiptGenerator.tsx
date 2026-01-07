import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface PaymentReceiptProps {
  payment: {
    id: string;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    client_name?: string;
    receipt_number?: string;
  };
  variant?: "icon" | "button";
}

export const PaymentReceiptGenerator = ({ payment, variant = "button" }: PaymentReceiptProps) => {
  const { toast } = useToast();

  const generateReceipt = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFillColor(51, 102, 204);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('FUNDAÇÃO DOM BOSCO', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Recibo de Pagamento', pageWidth / 2, 30, { align: 'center' });

      // Número do recibo
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const receiptNumber = payment.receipt_number || `REC-${payment.id.slice(0, 8).toUpperCase()}`;
      doc.text(`Nº ${receiptNumber}`, 20, 55);

      // Data
      doc.setFont('helvetica', 'normal');
      const formattedDate = format(new Date(payment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      doc.text(`Data: ${formattedDate}`, pageWidth - 20, 55, { align: 'right' });

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 65, pageWidth - 20, 65);

      // Informações do pagamento
      let yPos = 80;
      doc.setFontSize(11);
      
      // Recebido de
      doc.setFont('helvetica', 'bold');
      doc.text('Recebemos de:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(payment.client_name || 'Cliente', 60, yPos);
      yPos += 15;

      // Valor
      doc.setFont('helvetica', 'bold');
      doc.text('Valor:', 20, yPos);
      doc.setFontSize(16);
      doc.setTextColor(0, 128, 0);
      doc.text(
        `R$ ${payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        60, yPos
      );
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // Valor por extenso (simplificado)
      doc.setFont('helvetica', 'normal');
      doc.text('(', 20, yPos);
      doc.text(numeroParaExtenso(payment.amount), 25, yPos);
      doc.text(')', pageWidth - 20, yPos, { align: 'right' });
      yPos += 15;

      // Referente a
      doc.setFont('helvetica', 'bold');
      doc.text('Referente a:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      const descriptionLines = doc.splitTextToSize(payment.description, pageWidth - 80);
      doc.text(descriptionLines, 60, yPos);
      yPos += (descriptionLines.length * 7) + 15;

      // Forma de pagamento
      doc.setFont('helvetica', 'bold');
      doc.text('Forma de pagamento:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(getPaymentMethodLabel(payment.payment_method), 80, yPos);
      yPos += 20;

      // Box de assinatura
      doc.setDrawColor(150, 150, 150);
      doc.rect(20, pageHeight - 60, pageWidth - 40, 40);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Assinatura do Responsável', pageWidth / 2, pageHeight - 25, { align: 'center' });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'Este documento é um recibo de pagamento emitido pela Fundação Dom Bosco',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Salvar PDF
      const fileName = `recibo-${receiptNumber}-${format(new Date(), 'ddMMyyyy')}.pdf`;
      doc.save(fileName);

      toast({
        title: "Recibo gerado!",
        description: `O recibo ${receiptNumber} foi baixado com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar recibo",
        description: "Não foi possível gerar o recibo. Tente novamente."
      });
    }
  };

  const numeroParaExtenso = (valor: number): string => {
    // Simplificado - pode ser melhorado com biblioteca específica
    const reais = Math.floor(valor);
    const centavos = Math.round((valor - reais) * 100);
    return `${reais} reais e ${centavos} centavos`;
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'PIX',
      bank_transfer: 'Transferência Bancária',
      check: 'Cheque',
      internal: 'Interno'
    };
    return labels[method] || method;
  };

  if (variant === "icon") {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={generateReceipt}
        title="Gerar Recibo"
      >
        <FileText className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      onClick={generateReceipt}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Gerar Recibo
    </Button>
  );
};

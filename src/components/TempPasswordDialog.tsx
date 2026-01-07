import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';

interface TempPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeEmail: string;
  tempPassword: string;
}

export const TempPasswordDialog = ({ 
  isOpen, 
  onClose, 
  employeeName, 
  employeeEmail, 
  tempPassword 
}: TempPasswordDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast({
        title: "Senha copiada!",
        description: "A senha temporária foi copiada para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar a senha. Copie manualmente.",
      });
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            Funcionário Criado com Sucesso!
          </DialogTitle>
          <DialogDescription>
            O funcionário já pode fazer login no sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Funcionário:</p>
            <p className="font-medium">{employeeName}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Email:</p>
            <p className="font-medium">{employeeEmail}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Senha Temporária:</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={tempPassword}
                readOnly
                className="font-mono text-lg tracking-wider bg-muted"
              />
              <Button
                type="button"
                variant={copied ? "default" : "outline"}
                size="icon"
                onClick={handleCopyPassword}
                className={copied ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <p className="font-medium text-sm">Atenção</p>
            </div>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
              <li>Esta senha só será exibida <strong>uma vez</strong></li>
              <li>Copie e passe ao funcionário de forma segura</li>
              <li>O funcionário deverá <strong>alterá-la no primeiro login</strong></li>
            </ul>
          </div>
        </div>
        
        <Button onClick={handleClose} className="w-full">
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
};

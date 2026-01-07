import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AuditService } from '@/services/auditService';
import logo from '@/assets/fundacao-dom-bosco-logo-optimized.png';
interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignUp?: () => void;
}
export const LoginForm = ({
  onSuccess,
  onSwitchToSignUp
}: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Log login attempt
      await AuditService.logAction({
        entityType: 'auth',
        action: 'login_attempted',
        metadata: {
          user_email: email
        }
      });
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        // Log failed login
        await AuditService.logAction({
          entityType: 'auth',
          action: 'login_failed',
          metadata: {
            user_email: email,
            error_message: error.message
          }
        });
        toast({
          variant: "destructive",
          title: "Erro no Login",
          description: error.message
        });
        return;
      }
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao sistema."
      });
      onSuccess();
    } catch (error) {
      // Log unexpected error
      await AuditService.logAction({
        entityType: 'auth',
        action: 'login_error',
        metadata: {
          user_email: email,
          error: 'unexpected_error'
        }
      });
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="login-container">
      <div className="login-bubble bubble-1"></div>
      <div className="login-bubble bubble-2"></div>
      <div className="login-bubble bubble-3"></div>
      
      <Card className="login-form">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img alt="Fundação Dom Bosco - Sistema de Gestão Clínica e Neuropsicológica" width="168" height="128" fetchPriority="high" src="/lovable-uploads/d1e09cd0-006f-4737-87e4-4824049ed50a.png" className="h-48 w-auto object-contain" />
          </div>
          
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} placeholder="seu@email.com" />
            </div>
            <div className="form-group">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} placeholder="Sua senha" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          {onSwitchToSignUp && false && <div className="mt-4 text-center">
              <Button variant="link" onClick={onSwitchToSignUp} disabled={isLoading}>
                Não tem uma conta? Criar conta
              </Button>
            </div>}
        </CardContent>
      </Card>
    </div>;
};
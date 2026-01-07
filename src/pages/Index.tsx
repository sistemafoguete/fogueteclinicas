import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { MainApp } from '@/components/MainApp';
import { ChangeOwnPasswordDialog } from '@/components/ChangeOwnPasswordDialog';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { user, loading, mustChangePassword, setMustChangePassword } = useAuth();
  const [showApp, setShowApp] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    if (!loading) {
      const shouldShowApp = !!user;
      setShowApp(shouldShowApp);
      
      // Get user name from metadata
      if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name);
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showSignUp) {
      return (
        <SignUpForm 
          onSuccess={() => {
            setShowApp(true);
          }}
          onSwitchToLogin={() => setShowSignUp(false)}
        />
      );
    }
    
    return (
      <LoginForm 
        onSuccess={() => {
          setShowApp(true);
        }}
        onSwitchToSignUp={() => setShowSignUp(true)}
      />
    );
  }

  return (
    <>
      <MainApp />
      <ChangeOwnPasswordDialog
        isOpen={mustChangePassword}
        onSuccess={() => setMustChangePassword(false)}
        userName={userName}
      />
    </>
  );
};
const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;

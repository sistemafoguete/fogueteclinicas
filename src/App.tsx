import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { MainApp } from "@/components/MainApp";
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from 'next-themes';

const queryClient = new QueryClient();


const AppContent = () => {
  const { user, loading } = useAuth();
  const [showApp, setShowApp] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    if (!loading) {
      const shouldShowApp = !!user;
      setShowApp(shouldShowApp);
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

  return <MainApp />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

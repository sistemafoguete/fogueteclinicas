import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuditService } from '@/services/auditService';
import { useAppPreload } from '@/hooks/useAppPreload';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mustChangePassword: boolean;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  mustChangePassword: false,
  setMustChangePassword: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const { preloadCriticalData } = useAppPreload();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user is active when logging in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_active, employee_role, must_change_password')
                .eq('user_id', session.user.id)
                .single();
              
              if (error) {
                console.error('AuthProvider: Error checking user status', error);
                return;
              }
              
              // If user is inactive, sign them out immediately
              if (profile && !profile.is_active) {
                await supabase.auth.signOut();
                // Don't log audit event here as signOut will trigger its own event
                return;
              }
              
              // Check if user must change password
              if (profile && profile.must_change_password === true) {
                setMustChangePassword(true);
              } else {
                setMustChangePassword(false);
              }

              // Pré-carregar dados críticos para performance
              if (profile?.employee_role) {
                preloadCriticalData(session.user.id, profile.employee_role);
              }
              
              // Continue with normal login process
              AuditService.logAction({
                entityType: 'auth',
                action: 'login_success',
                metadata: { 
                  user_email: session.user.email,
                  login_method: 'email_password'
                }
              });
              AuditService.updateUserActivity();
            } catch (error) {
              console.error('AuthProvider: Error in login validation', error);
            }
          }, 0);
          
          const userData = session.user.user_metadata;
          
          if (userData?.employee_role) {
            try {
              // Wait a bit for the profile to be created by the trigger
              setTimeout(async () => {
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    employee_role: userData.employee_role,
                    phone: userData.phone,
                  })
                  .eq('user_id', session.user.id);
                  
                if (error) {
                  console.error('AuthProvider: Error updating profile', error);
                }
              }, 1000);
            } catch (error) {
              console.error('AuthProvider: Unexpected error updating profile', error);
            }
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            AuditService.logAction({
              entityType: 'auth',
              action: 'logout_completed',
              metadata: { timestamp: new Date().toISOString() }
            });
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('AuthProvider: Error getting initial session', error);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, mustChangePassword, setMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
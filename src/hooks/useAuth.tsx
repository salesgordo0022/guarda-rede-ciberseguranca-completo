import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  full_name: string;
  department_id: string | null;
  company_id: string | null;
  role: 'admin' | 'gestor' | 'colaborador';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  selectedCompanyId: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  refetchProfile: () => Promise<void>;
  setSelectedCompanyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    selectedCompanyId: null,
  });

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      // Busca perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profileData) {
        return null;
      }

      // Busca role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // Busca empresa do usuário
      const { data: companyData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      // Busca departamento do usuário
      const { data: departmentData } = await supabase
        .from('user_departments')
        .select('department_id')
        .eq('user_id', userId)
        .maybeSingle();

      const userProfile: UserProfile = {
        id: profileData.id,
        full_name: profileData.full_name,
        department_id: departmentData?.department_id || null,
        company_id: companyData?.company_id || null,
        role: (roleData?.role as 'admin' | 'gestor' | 'colaborador') || 'colaborador',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      return userProfile;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  };

  const initializeAuth = async () => {
    try {
      // Configura listener ANTES de verificar sessão existente
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          // Apenas atualizações síncronas aqui
          if (session?.user) {
            setAuthState(prev => ({
              ...prev,
              user: session.user,
              session,
              loading: false,
            }));
            
            // Busca perfil de forma assíncrona
            setTimeout(async () => {
              const profile = await fetchProfile(session.user.id);
              setAuthState(prev => ({
                ...prev,
                profile,
                selectedCompanyId: profile?.company_id || null,
              }));
            }, 0);
          } else {
            setAuthState({
              user: null,
              profile: null,
              session: null,
              loading: false,
              selectedCompanyId: null,
            });
          }
        }
      );

      // Verifica sessão existente
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setAuthState({
          user: session.user,
          session,
          profile,
          loading: false,
          selectedCompanyId: profile?.company_id || null,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        selectedCompanyId: null,
      });
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Erro ao sair');
    }
  };

  const isAdmin = authState.profile?.role === 'admin';
  const isGestor = authState.profile?.role === 'gestor';
  const isColaborador = authState.profile?.role === 'colaborador';

  const setSelectedCompanyId = (id: string | null) => {
    setAuthState(prev => ({ ...prev, selectedCompanyId: id }));
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      signOut,
      isAdmin,
      isGestor,
      isColaborador,
      refetchProfile: async () => {
        if (authState.user) {
          const profile = await fetchProfile(authState.user.id);
          setAuthState(prev => ({
            ...prev,
            profile,
            selectedCompanyId: profile?.company_id || prev.selectedCompanyId
          }));
        }
      },
      setSelectedCompanyId
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

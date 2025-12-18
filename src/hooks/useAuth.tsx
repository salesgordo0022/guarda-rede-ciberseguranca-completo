import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
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
  companyLoading: boolean;
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
    companyLoading: true,
    selectedCompanyId: null,
  });

  const fetchProfile = async (userId: string): Promise<{ profile: UserProfile | null; companyId: string | null }> => {
    try {
      // Busca perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { profile: null, companyId: null };
      }

      if (!profileData) {
        return { profile: null, companyId: null };
      }

      // Busca role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // Busca TODAS as empresas do usuário e seleciona a primeira
      const { data: companiesData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1);

      const firstCompanyId = companiesData && companiesData.length > 0 
        ? companiesData[0].company_id 
        : null;

      // Busca departamento do usuário
      const { data: departmentData } = await supabase
        .from('user_departments')
        .select('department_id')
        .eq('user_id', userId)
        .maybeSingle();

      const userProfile: UserProfile = {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        avatar_url: profileData.avatar_url,
        department_id: departmentData?.department_id || null,
        company_id: firstCompanyId,
        role: (roleData?.role as 'admin' | 'gestor' | 'colaborador') || 'colaborador',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      return { profile: userProfile, companyId: firstCompanyId };
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return { profile: null, companyId: null };
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
              const { profile, companyId } = await fetchProfile(session.user.id);
              setAuthState(prev => ({
                ...prev,
                profile,
                selectedCompanyId: companyId,
                companyLoading: false,
              }));
            }, 0);
          } else {
            setAuthState({
              user: null,
              profile: null,
              session: null,
              loading: false,
              companyLoading: false,
              selectedCompanyId: null,
            });
          }
        }
      );

      // Verifica sessão existente
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { profile, companyId } = await fetchProfile(session.user.id);
        setAuthState({
          user: session.user,
          session,
          profile,
          loading: false,
          companyLoading: false,
          selectedCompanyId: companyId,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false, companyLoading: false }));
      }

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setAuthState(prev => ({ ...prev, loading: false, companyLoading: false }));
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
        companyLoading: false,
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
          setAuthState(prev => ({ ...prev, companyLoading: true }));
          const { profile, companyId } = await fetchProfile(authState.user.id);
          setAuthState(prev => ({
            ...prev,
            profile,
            selectedCompanyId: companyId || prev.selectedCompanyId,
            companyLoading: false,
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

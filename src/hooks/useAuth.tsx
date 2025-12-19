import { useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
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
  refetchProfile: (companyId?: string | null) => Promise<void>;
  setSelectedCompanyId: (id: string | null) => Promise<void>;
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

  // Evita loop de re-fetch em caso de ausência de empresa ou falhas intermitentes
  const companyBootstrapRef = useRef<string | null>(null);

  const storageKeyForCompany = (userId: string) => `selected_company_id:${userId}`;

  const readStoredCompanyId = (userId: string): string | null => {
    try {
      return localStorage.getItem(storageKeyForCompany(userId));
    } catch {
      return null;
    }
  };

  const writeStoredCompanyId = (userId: string, companyId: string | null) => {
    try {
      if (companyId) {
        localStorage.setItem(storageKeyForCompany(userId), companyId);
      } else {
        localStorage.removeItem(storageKeyForCompany(userId));
      }
    } catch {
      // ignore
    }
  };
  const fetchProfile = async (userId: string, overrideCompanyId?: string | null): Promise<{ profile: UserProfile | null; companyId: string | null }> => {
    try {
      // Buscar perfil, empresas e departamento em paralelo para melhor performance
      const [profileResult, companiesResult, departmentResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_companies').select('company_id, role').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('user_departments').select('department_id').eq('user_id', userId).maybeSingle()
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
        return { profile: null, companyId: null };
      }

      const profileData = profileResult.data;
      if (!profileData) {
        return { profile: null, companyId: null };
      }

      const companiesData = companiesResult.data;
      if (companiesResult.error) {
        console.error('Error fetching user companies:', companiesResult.error);
      }

      const firstCompanyId = companiesData && companiesData.length > 0
        ? companiesData[0].company_id
        : null;

      const overrideIsValid = !!(
        overrideCompanyId &&
        companiesData &&
        companiesData.some((c) => c.company_id === overrideCompanyId)
      );

      // Usa a empresa override apenas se for válida; senão usa a primeira empresa
      const targetCompanyId = overrideIsValid ? overrideCompanyId! : firstCompanyId;

      // Role vem prioritariamente da associação por empresa (user_companies)
      let userRole: 'admin' | 'gestor' | 'colaborador' = 'colaborador';
      const hasCompanyContext = !!(targetCompanyId && companiesData && companiesData.length > 0);

      if (hasCompanyContext) {
        const companyRecord = companiesData!.find(c => c.company_id === targetCompanyId);
        if (companyRecord?.role) {
          userRole = companyRecord.role as 'admin' | 'gestor' | 'colaborador';
        }
      }

      // Fallback: se o usuário ainda não tiver empresas vinculadas, usa user_roles (papel global)
      if (!hasCompanyContext) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleData?.role) {
          userRole = roleData.role as 'admin' | 'gestor' | 'colaborador';
        }
      }

      const userProfile: UserProfile = {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        avatar_url: profileData.avatar_url,
        department_id: departmentResult.data?.department_id || null,
        company_id: targetCompanyId,
        role: userRole,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      return { profile: userProfile, companyId: targetCompanyId };
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
              const storedCompanyId = readStoredCompanyId(session.user.id);
              const { profile, companyId } = await fetchProfile(session.user.id, storedCompanyId);

              // Persiste a empresa resolvida (evita cair na empresa errada no próximo login)
              writeStoredCompanyId(session.user.id, companyId);

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
        const storedCompanyId = readStoredCompanyId(session.user.id);
        const { profile, companyId } = await fetchProfile(session.user.id, storedCompanyId);
        writeStoredCompanyId(session.user.id, companyId);

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

  // Em alguns reloads, o listener + getSession podem gerar race e deixar selectedCompanyId nulo.
  // Este efeito garante que sempre tentaremos selecionar a empresa do banco automaticamente (1x por usuário).
  useEffect(() => {
    if (authState.loading) return;

    if (!authState.user) {
      companyBootstrapRef.current = null;
      return;
    }

    if (authState.selectedCompanyId) return;
    if (authState.companyLoading) return;

    // Só tenta uma vez por usuário (evita loop infinito quando o usuário não tem empresa)
    if (companyBootstrapRef.current === authState.user.id) return;
    companyBootstrapRef.current = authState.user.id;

    let cancelled = false;

    (async () => {
      setAuthState(prev => ({ ...prev, companyLoading: true }));
      const { profile, companyId } = await fetchProfile(authState.user!.id);

      if (cancelled) return;

      setAuthState(prev => ({
        ...prev,
        profile: profile ?? prev.profile,
        selectedCompanyId: companyId,
        companyLoading: false,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [authState.loading, authState.user?.id, authState.companyLoading, authState.selectedCompanyId]);

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

  const setSelectedCompanyId = async (id: string | null) => {
    if (!authState.user || id === authState.selectedCompanyId) return;

    // Persistir seleção (mesmo se a aba recarregar, o usuário volta para a empresa correta)
    writeStoredCompanyId(authState.user.id, id);

    setAuthState(prev => ({ ...prev, selectedCompanyId: id, companyLoading: true }));

    // Rebusca o perfil com a role da nova empresa
    const { profile } = await fetchProfile(authState.user.id, id);
    setAuthState(prev => ({
      ...prev,
      profile,
      companyLoading: false,
    }));
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      signOut,
      isAdmin,
      isGestor,
      isColaborador,
       refetchProfile: async (companyId?: string | null) => {
         if (authState.user) {
           setAuthState(prev => ({ ...prev, companyLoading: true }));
           // Usa a empresa informada (quando existir) para buscar a role correta
           const targetCompanyId = companyId ?? authState.selectedCompanyId;
           const { profile, companyId: resolvedCompanyId } = await fetchProfile(authState.user.id, targetCompanyId);

           // Persistir a empresa que foi resolvida/selecionada
           writeStoredCompanyId(authState.user.id, resolvedCompanyId);

           setAuthState(prev => ({
             ...prev,
             profile,
             selectedCompanyId: prev.selectedCompanyId || resolvedCompanyId,
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

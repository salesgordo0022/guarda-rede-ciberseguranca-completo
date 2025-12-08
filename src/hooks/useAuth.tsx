// Importações de bibliotecas e dependências
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Interface para definir o perfil do usuário
export interface UserProfile {
    id: string;                       // Identificador único do usuário
    full_name: string;                // Nome completo do usuário
    department_id: string | null;     // ID do departamento ao qual o usuário pertence (ou null)
    company_id: string | null;        // ID da empresa à qual o usuário pertence (ou null)
    role: 'admin' | 'gestor' | 'colaborador'; // Papel/permissão do usuário no sistema
    created_at: string;               // Data de criação do perfil
    updated_at: string;               // Data da última atualização do perfil
}

// Interface para definir o estado de autenticação
export interface AuthState {
    user: User | null;                // Objeto do usuário autenticado (ou null se não autenticado)
    profile: UserProfile | null;      // Perfil detalhado do usuário (ou null se não disponível)
    session: Session | null;          // Sessão de autenticação (ou null se não autenticado)
    loading: boolean;                 // Indicador de carregamento durante a inicialização
    selectedCompanyId: string | null; // ID da empresa selecionada pelo usuário
}

// Interface para definir o tipo do contexto de autenticação
interface AuthContextType extends AuthState {
    signOut: () => Promise<void>;                    // Função para realizar logout
    isAdmin: boolean;                                // Indicador se o usuário é administrador
    isGestor: boolean;                               // Indicador se o usuário é gestor
    isColaborador: boolean;                          // Indicador se o usuário é colaborador
    refetchProfile: () => Promise<void>;             // Função para atualizar os dados do perfil
    setSelectedCompanyId: (id: string | null) => void; // Função para definir a empresa selecionada
}

// Criação do contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componente provedor de autenticação que encapsula a lógica de autenticação da aplicação
export function AuthProvider({ children }: { children: ReactNode }) {
    // Estado para armazenar todas as informações de autenticação
    const [authState, setAuthState] = useState<AuthState>({
        user: null,              // Usuário autenticado
        profile: null,           // Perfil do usuário
        session: null,           // Sessão ativa
        loading: true,           // Estado de carregamento
        selectedCompanyId: null, // Empresa selecionada
    });

    // Função para buscar o perfil do usuário no banco de dados
    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            // Busca perfil básico
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return null;
            }

            // Busca role do usuário
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            // Busca empresa do usuário
            const { data: companyData } = await supabase
                .from('user_companies')
                .select('company_id')
                .eq('user_id', userId)
                .single();

            // Busca departamento do usuário
            const { data: departmentData } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', userId)
                .single();

            // Monta o perfil completo
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

    // Função para inicializar o estado de autenticação
    const initializeAuth = async () => {
        try {
            // Verifica se há uma sessão ativa
            const { data: { session } } = await supabase.auth.getSession();
            console.log('Initial session check:', session);

            // Se houver usuário na sessão, busca o perfil
            if (session?.user) {
                const profile = await fetchProfile(session.user.id);
                console.log('Fetched profile:', profile);

                // Se estiver usando mock/local e nenhum perfil foi retornado, usa um perfil mock
                const finalProfile = profile || (session.user.id === 'local-user' ? {
                    id: 'local-user',
                    full_name: 'Usuário Local',
                    department_id: null,
                    company_id: 'company-1', // Empresa mock
                    role: 'admin',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as UserProfile : null);

                // Atualiza o estado de autenticação com os dados obtidos
                setAuthState({
                    user: session.user,
                    session,
                    profile: finalProfile,
                    loading: false,
                    selectedCompanyId: finalProfile?.company_id || null,
                });
            } else {
                // Se não houver sessão, marca como carregado
                console.log('No session found, checking if we should create a default session');
                // Check if we're in mock mode and should create a default session
                const isLocal = import.meta.env.VITE_USE_LOCAL_DB === 'true' || import.meta.env.MODE === 'development' || !import.meta.env.VITE_SUPABASE_URL;
                if (isLocal) {
                    console.log('Creating default local session');
                    // Create a default session for local development
                    const defaultUser = {
                        id: 'local-user',
                        email: 'admin@gclick.com',
                        aud: 'authenticated',
                        role: 'authenticated',
                        created_at: new Date().toISOString(),
                        app_metadata: {},
                        user_metadata: {}
                    };
                    
                    const defaultSession = {
                        user: defaultUser,
                        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                        access_token: 'mock-access-token',
                        refresh_token: 'mock-refresh-token',
                        expires_in: 3600,
                        token_type: 'bearer'
                    } as Session;
                    
                    const profile = await fetchProfile(defaultUser.id);
                    const finalProfile = profile || {
                        id: 'local-user',
                        full_name: 'Usuário Local',
                        department_id: null,
                        company_id: 'company-1',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    } as UserProfile;
                    
                    setAuthState({
                        user: defaultUser,
                        session: defaultSession,
                        profile: finalProfile,
                        loading: false,
                        selectedCompanyId: finalProfile.company_id || null,
                    });
                } else {
                    setAuthState(prev => ({ ...prev, loading: false }));
                }
            }

            // Escuta mudanças no estado de autenticação
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state change:', event, session);

                // Se houver uma nova sessão, atualiza os dados
                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setAuthState({
                        user: session.user,
                        session,
                        profile: profile,
                        loading: false,
                        selectedCompanyId: profile?.company_id || null,
                    });
                } else {
                    // Se não houver sessão, limpa os dados
                    setAuthState({
                        user: null,
                        profile: null,
                        session: null,
                        loading: false,
                        selectedCompanyId: null,
                    });
                }
            });

            // Função de limpeza para cancelar a subscrição
            return () => subscription.unsubscribe();
        } catch (error) {
            // Trata erros durante a inicialização
            console.error('Error initializing auth:', error);
            setAuthState(prev => ({ ...prev, loading: false }));
        }
    };

    // Efeito para inicializar a autenticação quando o componente é montado
    useEffect(() => {
        initializeAuth();
    }, []); // Array de dependências vazio significa que só executa uma vez

    // Função para realizar logout do usuário
    const signOut = async () => {
        try {
            // Realiza o logout na API do Supabase
            await supabase.auth.signOut();
            
            // Limpa o estado de autenticação
            setAuthState({
                user: null,
                profile: null,
                session: null,
                loading: false,
                selectedCompanyId: null,
            });
            
            // Exibe mensagem de sucesso
            toast.success('Logout realizado com sucesso');
        } catch (error) {
            // Trata erros durante o logout
            console.error('Error signing out:', error);
            toast.error('Erro ao sair');
        }
    };

    // Propriedades computadas para verificar o papel do usuário
    const isAdmin = authState.profile?.role === 'admin';        // Verifica se é administrador
    const isGestor = authState.profile?.role === 'gestor';      // Verifica se é gestor
    const isColaborador = authState.profile?.role === 'colaborador'; // Verifica se é colaborador

    // Função para definir a empresa selecionada
    const setSelectedCompanyId = (id: string | null) => {
        setAuthState(prev => ({ ...prev, selectedCompanyId: id }));
    };

    // Renderiza o provedor de contexto com todos os valores e funções
    return (
        <AuthContext.Provider value={{
            ...authState,           // Espalha todas as propriedades do estado de autenticação
            signOut,                // Função de logout
            isAdmin,                // Indicador de administrador
            isGestor,               // Indicador de gestor
            isColaborador,          // Indicador de colaborador
            refetchProfile: async () => {  // Função para atualizar o perfil
                if (authState.user) {
                    const profile = await fetchProfile(authState.user.id);
                    setAuthState(prev => ({
                        ...prev,
                        profile,
                        selectedCompanyId: profile?.company_id || prev.selectedCompanyId
                    }));
                }
            },
            setSelectedCompanyId    // Função para definir empresa selecionada
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook personalizado para acessar o contexto de autenticação
export function useAuth() {
    // Obtém o contexto de autenticação
    const context = useContext(AuthContext);
    
    // Lança um erro se o hook for usado fora do AuthProvider
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    // Retorna o contexto de autenticação
    return context;
}

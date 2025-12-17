// Banco de dados local simples usando localStorage. Suporta select/insert/update/delete com filtros encadeados.

type Row = Record<string, string | number | boolean | null | undefined | Date | object>;

interface UserSession {
  user: {
    id: string;
    email: string;
    aud: string;
    role: string;
    created_at: string;
  };
  expires_at: number;
}

interface QueryResult<T> {
  data: T | T[] | null;
  error: { message: string } | null;
}

const DB_KEY = "vigil_watch_db_v6_final";
const AUTH_KEY = "mtv_local_auth_session";

type Tables = {
  companies: Row[];
  departments: Row[];
  profiles: Row[];
  tasks: Row[];
  task_assignees: Row[];
  task_history: Row[];
  task_comments: Row[];
  // Tabelas de relacionamento de usuário
  user_companies: Row[];
  user_roles: Row[];
  user_departments: Row[];
  // Suporte legado se necessário
  activities: Row[];
  sub_activities: Row[];
  processes: Row[];
  process_activities: Row[];
  workflows: Row[];
  workflow_processes: Row[];
  activity_completions: Row[]; // Restaurado
  department_activities: Row[];
  department_activity_assignees: Row[];
  project_activity_assignees: Row[];
  // Tabelas para projetos
  projects: Row[];
  project_activities: Row[];
  project_assignees: Row[];
  // Tabela de notificações
  notifications: Row[];
  checklist_items: Row[];
};

function readDB(): Tables {
  // Always use the rich mock data - ignore localStorage
  // const raw = localStorage.getItem(DB_KEY);

  // Dados de Exemplo Ricos
  const initial: Tables = {    companies: [
      { id: 'company-1', name: 'Tech Solutions SA', created_at: new Date().toISOString() },
      { id: 'company-2', name: 'Logística Express', created_at: new Date().toISOString() },
    ],
    departments: [
      { id: 'dept-1', company_id: 'company-1', name: 'Desenvolvimento', description: 'Engenharia de Software', created_at: new Date().toISOString() },
      { id: 'dept-2', company_id: 'company-1', name: 'Marketing', description: 'Growth e Vendas', created_at: new Date().toISOString() },
      { id: 'dept-3', company_id: 'company-1', name: 'RH', description: 'Pessoas e Cultura', created_at: new Date().toISOString() },
      { id: 'dept-4', company_id: 'company-2', name: 'Operações', description: 'Frota e Rotas', created_at: new Date().toISOString() },
      { id: 'dept-5', company_id: 'company-1', name: 'Financeiro', description: 'Contabilidade e Tesouraria', created_at: new Date().toISOString() },
      { id: 'dept-6', company_id: 'company-1', name: 'Comercial', description: 'Vendas e Parcerias', created_at: new Date().toISOString() },
      { id: 'dept-7', company_id: 'company-1', name: 'Suporte', description: 'Atendimento ao Cliente', created_at: new Date().toISOString() }
    ],
    profiles: [
      // Admin principal
      { id: 'local-user', company_id: 'company-1', full_name: 'Admin Local', role: 'admin', email: 'admin@gclick.com', created_at: new Date().toISOString() },
      // Usuários da Tech Solutions
      { id: 'dev-lead', company_id: 'company-1', full_name: 'Roberto Dev', role: 'gestor', email: 'roberto@tech.com', created_at: new Date().toISOString() },
      { id: 'dev-jr', company_id: 'company-1', full_name: 'Ana Júnior', role: 'colaborador', email: 'ana@tech.com', created_at: new Date().toISOString() },
      { id: 'mkt-lead', company_id: 'company-1', full_name: 'Carla Marketing', role: 'gestor', email: 'carla@tech.com', created_at: new Date().toISOString() },
      // Novos usuários
      { id: 'fin-lead', company_id: 'company-1', full_name: 'Carlos Financeiro', role: 'gestor', email: 'carlos@tech.com', created_at: new Date().toISOString() },
      { id: 'com-lead', company_id: 'company-1', full_name: 'Mariana Comercial', role: 'gestor', email: 'mariana@tech.com', created_at: new Date().toISOString() },
      { id: 'sup-lead', company_id: 'company-1', full_name: 'Pedro Suporte', role: 'gestor', email: 'pedro@tech.com', created_at: new Date().toISOString() },
      { id: 'dev-pl', company_id: 'company-1', full_name: 'João Pleno', role: 'colaborador', email: 'joao@tech.com', created_at: new Date().toISOString() },
      { id: 'mkt-jr', company_id: 'company-1', full_name: 'Julia Estagiária', role: 'colaborador', email: 'julia@tech.com', created_at: new Date().toISOString() },
      // Additional 15 users for more comprehensive mock data
      { id: 'dev-sr-1', company_id: 'company-1', full_name: 'Alex Silva', role: 'colaborador', email: 'alex@tech.com', created_at: new Date().toISOString() },
      { id: 'dev-sr-2', company_id: 'company-1', full_name: 'Bruna Costa', role: 'colaborador', email: 'bruna@tech.com', created_at: new Date().toISOString() },
      { id: 'fin-analyst-1', company_id: 'company-1', full_name: 'Daniel Oliveira', role: 'colaborador', email: 'daniel@tech.com', created_at: new Date().toISOString() },
      { id: 'fin-analyst-2', company_id: 'company-1', full_name: 'Eduarda Santos', role: 'colaborador', email: 'eduarda@tech.com', created_at: new Date().toISOString() },
      { id: 'mkt-spec-1', company_id: 'company-1', full_name: 'Felipe Rodrigues', role: 'colaborador', email: 'felipe@tech.com', created_at: new Date().toISOString() },
      { id: 'mkt-spec-2', company_id: 'company-1', full_name: 'Gabriela Almeida', role: 'colaborador', email: 'gabriela@tech.com', created_at: new Date().toISOString() },
      { id: 'hr-lead', company_id: 'company-1', full_name: 'Henrique Pereira', role: 'gestor', email: 'henrique@tech.com', created_at: new Date().toISOString() },
      { id: 'hr-spec', company_id: 'company-1', full_name: 'Isabela Lima', role: 'colaborador', email: 'isabela@tech.com', created_at: new Date().toISOString() },
      { id: 'ops-lead', company_id: 'company-1', full_name: 'João Santos', role: 'gestor', email: 'joao.s@tech.com', created_at: new Date().toISOString() },
      { id: 'ops-tech-1', company_id: 'company-1', full_name: 'Karina Souza', role: 'colaborador', email: 'karina@tech.com', created_at: new Date().toISOString() },
      { id: 'ops-tech-2', company_id: 'company-1', full_name: 'Lucas Mendes', role: 'colaborador', email: 'lucas@tech.com', created_at: new Date().toISOString() },
      { id: 'qa-lead', company_id: 'company-1', full_name: 'Mariana Silva', role: 'gestor', email: 'mariana.s@tech.com', created_at: new Date().toISOString() },
      { id: 'qa-eng-1', company_id: 'company-1', full_name: 'Nicolas Rocha', role: 'colaborador', email: 'nicolas@tech.com', created_at: new Date().toISOString() },
      { id: 'qa-eng-2', company_id: 'company-1', full_name: 'Olivia Martins', role: 'colaborador', email: 'olivia@tech.com', created_at: new Date().toISOString() },
      { id: 'biz-dev-lead', company_id: 'company-1', full_name: 'Paulo Ferreira', role: 'gestor', email: 'paulo@tech.com', created_at: new Date().toISOString() }
    ],
    user_companies: [
      { id: 'uc-1', user_id: 'local-user', company_id: 'company-1', role: 'admin' },
      { id: 'uc-2', user_id: 'dev-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-3', user_id: 'dev-jr', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-4', user_id: 'mkt-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-5', user_id: 'fin-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-6', user_id: 'com-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-7', user_id: 'sup-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-8', user_id: 'dev-pl', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-9', user_id: 'mkt-jr', company_id: 'company-1', role: 'colaborador' },
      // Additional user companies
      { id: 'uc-10', user_id: 'dev-sr-1', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-11', user_id: 'dev-sr-2', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-12', user_id: 'fin-analyst-1', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-13', user_id: 'fin-analyst-2', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-14', user_id: 'mkt-spec-1', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-15', user_id: 'mkt-spec-2', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-16', user_id: 'hr-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-17', user_id: 'hr-spec', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-18', user_id: 'ops-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-19', user_id: 'ops-tech-1', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-20', user_id: 'ops-tech-2', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-21', user_id: 'qa-lead', company_id: 'company-1', role: 'gestor' },
      { id: 'uc-22', user_id: 'qa-eng-1', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-23', user_id: 'qa-eng-2', company_id: 'company-1', role: 'colaborador' },
      { id: 'uc-24', user_id: 'biz-dev-lead', company_id: 'company-1', role: 'gestor' }
    ],
    user_roles: [
      { id: 'ur-1', user_id: 'local-user', role: 'admin' },
      { id: 'ur-2', user_id: 'dev-lead', role: 'gestor' },
      { id: 'ur-3', user_id: 'dev-jr', role: 'colaborador' },
      { id: 'ur-4', user_id: 'mkt-lead', role: 'gestor' },
      { id: 'ur-5', user_id: 'fin-lead', role: 'gestor' },
      { id: 'ur-6', user_id: 'com-lead', role: 'gestor' },
      { id: 'ur-7', user_id: 'sup-lead', role: 'gestor' },
      { id: 'ur-8', user_id: 'dev-pl', role: 'colaborador' },
      { id: 'ur-9', user_id: 'mkt-jr', role: 'colaborador' },
      // Additional user roles
      { id: 'ur-10', user_id: 'dev-sr-1', role: 'colaborador' },
      { id: 'ur-11', user_id: 'dev-sr-2', role: 'colaborador' },
      { id: 'ur-12', user_id: 'fin-analyst-1', role: 'colaborador' },
      { id: 'ur-13', user_id: 'fin-analyst-2', role: 'colaborador' },
      { id: 'ur-14', user_id: 'mkt-spec-1', role: 'colaborador' },
      { id: 'ur-15', user_id: 'mkt-spec-2', role: 'colaborador' },
      { id: 'ur-16', user_id: 'hr-lead', role: 'gestor' },
      { id: 'ur-17', user_id: 'hr-spec', role: 'colaborador' },
      { id: 'ur-18', user_id: 'ops-lead', role: 'gestor' },
      { id: 'ur-19', user_id: 'ops-tech-1', role: 'colaborador' },
      { id: 'ur-20', user_id: 'ops-tech-2', role: 'colaborador' },
      { id: 'ur-21', user_id: 'qa-lead', role: 'gestor' },
      { id: 'ur-22', user_id: 'qa-eng-1', role: 'colaborador' },
      { id: 'ur-23', user_id: 'qa-eng-2', role: 'colaborador' },
      { id: 'ur-24', user_id: 'biz-dev-lead', role: 'gestor' }
    ],
    user_departments: [
      { id: 'ud-1', user_id: 'dev-lead', department_id: 'dept-1', is_manager: true },
      { id: 'ud-2', user_id: 'dev-jr', department_id: 'dept-1', is_manager: false },
      { id: 'ud-3', user_id: 'mkt-lead', department_id: 'dept-2', is_manager: true },
      { id: 'ud-4', user_id: 'fin-lead', department_id: 'dept-5', is_manager: true },
      { id: 'ud-5', user_id: 'com-lead', department_id: 'dept-6', is_manager: true },
      { id: 'ud-6', user_id: 'sup-lead', department_id: 'dept-7', is_manager: true },
      { id: 'ud-7', user_id: 'dev-pl', department_id: 'dept-1', is_manager: false },
      { id: 'ud-8', user_id: 'mkt-jr', department_id: 'dept-2', is_manager: false },
      // Additional user departments
      { id: 'ud-9', user_id: 'dev-sr-1', department_id: 'dept-1', is_manager: false },
      { id: 'ud-10', user_id: 'dev-sr-2', department_id: 'dept-1', is_manager: false },
      { id: 'ud-11', user_id: 'fin-analyst-1', department_id: 'dept-5', is_manager: false },
      { id: 'ud-12', user_id: 'fin-analyst-2', department_id: 'dept-5', is_manager: false },
      { id: 'ud-13', user_id: 'mkt-spec-1', department_id: 'dept-2', is_manager: false },
      { id: 'ud-14', user_id: 'mkt-spec-2', department_id: 'dept-2', is_manager: false },
      { id: 'ud-15', user_id: 'hr-lead', department_id: 'dept-3', is_manager: true },
      { id: 'ud-16', user_id: 'hr-spec', department_id: 'dept-3', is_manager: false },
      { id: 'ud-17', user_id: 'ops-lead', department_id: 'dept-4', is_manager: true },
      { id: 'ud-18', user_id: 'ops-tech-1', department_id: 'dept-4', is_manager: false },
      { id: 'ud-19', user_id: 'ops-tech-2', department_id: 'dept-4', is_manager: false },
      { id: 'ud-20', user_id: 'qa-lead', department_id: 'dept-1', is_manager: true },
      { id: 'ud-21', user_id: 'qa-eng-1', department_id: 'dept-1', is_manager: false },
      { id: 'ud-22', user_id: 'qa-eng-2', department_id: 'dept-1', is_manager: false },
      { id: 'ud-23', user_id: 'biz-dev-lead', department_id: 'dept-6', is_manager: true }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'Plataforma E-commerce V2',
        company_id: 'company-1',
        description: 'Refatoração completa do checkout e catálogo.',
        status: 'em_andamento',
        progress: 35,
        total_activities: 10,
        completed_activities: 3,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'local-user'
      },
      {
        id: 'proj-2',
        name: 'Website Institucional',
        company_id: 'company-1',
        description: 'Novo site institucional com blog.',
        status: 'planejamento',
        progress: 0,
        total_activities: 5,
        completed_activities: 0,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'mkt-lead'
      },
      {
        id: 'proj-3',
        name: 'Sistema de Gestão Financeira',
        company_id: 'company-1',
        description: 'Desenvolvimento de sistema para controle de contas a pagar e receber.',
        status: 'em_andamento',
        progress: 60,
        total_activities: 8,
        completed_activities: 5,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'fin-lead'
      },
      {
        id: 'proj-4',
        name: 'Campanha de Natal',
        company_id: 'company-1',
        description: 'Planejamento e execução da campanha promocional de fim de ano.',
        status: 'em_andamento',
        progress: 20,
        total_activities: 12,
        completed_activities: 2,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'com-lead'
      },
      // Additional projects to reach 25 total
      {
        id: 'proj-5',
        name: 'Sistema de RH',
        company_id: 'company-1',
        description: 'Plataforma para gestão de funcionários e folha de pagamento.',
        status: 'em_andamento',
        progress: 45,
        total_activities: 15,
        completed_activities: 7,
        start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'hr-lead'
      },
      {
        id: 'proj-6',
        name: 'App Mobile Corporativo',
        company_id: 'company-1',
        description: 'Aplicativo mobile para acesso a informações corporativas.',
        status: 'planejamento',
        progress: 0,
        total_activities: 8,
        completed_activities: 0,
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'dev-lead'
      },
      {
        id: 'proj-7',
        name: 'Migração de Infraestrutura',
        company_id: 'company-1',
        description: 'Migração dos servidores para a nuvem.',
        status: 'atrasado',
        progress: 25,
        total_activities: 12,
        completed_activities: 3,
        start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'ops-lead'
      },
      {
        id: 'proj-8',
        name: 'Relatórios Gerenciais Automatizados',
        company_id: 'company-1',
        description: 'Automação da geração de relatórios para diretoria.',
        status: 'em_andamento',
        progress: 70,
        total_activities: 10,
        completed_activities: 7,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'fin-lead'
      },
      {
        id: 'proj-9',
        name: 'Redesign da Marca',
        company_id: 'company-1',
        description: 'Atualização da identidade visual da empresa.',
        status: 'em_andamento',
        progress: 30,
        total_activities: 9,
        completed_activities: 3,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'mkt-lead'
      },
      {
        id: 'proj-10',
        name: 'Treinamento de Equipe',
        company_id: 'company-1',
        description: 'Programa de capacitação técnica para toda a equipe.',
        status: 'concluido',
        progress: 100,
        total_activities: 6,
        completed_activities: 6,
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'hr-lead'
      },
      {
        id: 'proj-11',
        name: 'Integração com ERP',
        company_id: 'company-1',
        description: 'Integração do sistema interno com o ERP da empresa.',
        status: 'em_andamento',
        progress: 55,
        total_activities: 11,
        completed_activities: 6,
        start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'dev-lead'
      },
      {
        id: 'proj-12',
        name: 'Plano de expansão internacional',
        company_id: 'company-1',
        description: 'Estudo e planejamento para entrada em novos mercados.',
        status: 'planejamento',
        progress: 0,
        total_activities: 7,
        completed_activities: 0,
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'biz-dev-lead'
      },
      {
        id: 'proj-13',
        name: 'Sistema de Backup Automatizado',
        company_id: 'company-1',
        description: 'Implementação de backup automático de todos os sistemas.',
        status: 'em_andamento',
        progress: 80,
        total_activities: 8,
        completed_activities: 6,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'ops-lead'
      },
      {
        id: 'proj-14',
        name: 'Portal do Cliente',
        company_id: 'company-1',
        description: 'Área restrita para clientes acompanharem seus projetos.',
        status: 'em_andamento',
        progress: 40,
        total_activities: 12,
        completed_activities: 5,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'dev-lead'
      },
      {
        id: 'proj-15',
        name: 'Pesquisa de Clima Organizacional',
        company_id: 'company-1',
        description: 'Levantamento de satisfação dos funcionários.',
        status: 'concluido',
        progress: 100,
        total_activities: 5,
        completed_activities: 5,
        start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'hr-lead'
      },
      {
        id: 'proj-16',
        name: 'Otimização de SEO',
        company_id: 'company-1',
        description: 'Melhoria do posicionamento nos motores de busca.',
        status: 'em_andamento',
        progress: 65,
        total_activities: 9,
        completed_activities: 6,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'mkt-lead'
      },
      {
        id: 'proj-17',
        name: 'Sistema de Controle de Estoque',
        company_id: 'company-1',
        description: 'Automação do controle de estoque e pedidos.',
        status: 'planejamento',
        progress: 0,
        total_activities: 10,
        completed_activities: 0,
        start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'biz-dev-lead'
      },
      {
        id: 'proj-18',
        name: 'Plataforma de E-learning',
        company_id: 'company-1',
        description: 'Ambiente virtual para treinamentos corporativos.',
        status: 'em_andamento',
        progress: 50,
        total_activities: 14,
        completed_activities: 7,
        start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'dev-lead'
      },
      {
        id: 'proj-19',
        name: 'Relatórios Regulatórios',
        company_id: 'company-1',
        description: 'Geração automatizada de relatórios para órgãos reguladores.',
        status: 'em_andamento',
        progress: 75,
        total_activities: 8,
        completed_activities: 6,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'fin-lead'
      },
      {
        id: 'proj-20',
        name: 'Sistema de Gestão de Projetos',
        company_id: 'company-1',
        description: 'Plataforma interna para gestão de todos os projetos da empresa.',
        status: 'em_andamento',
        progress: 35,
        total_activities: 12,
        completed_activities: 4,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'local-user'
      },
      {
        id: 'proj-21',
        name: 'Campanha de Responsabilidade Social',
        company_id: 'company-1',
        description: 'Planejamento e execução de ações de responsabilidade social.',
        status: 'planejamento',
        progress: 0,
        total_activities: 6,
        completed_activities: 0,
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'mkt-lead'
      },
      {
        id: 'proj-22',
        name: 'Sistema de Controle de Qualidade',
        company_id: 'company-1',
        description: 'Implementação de processos de controle de qualidade.',
        status: 'em_andamento',
        progress: 55,
        total_activities: 9,
        completed_activities: 5,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'qa-lead'
      },
      {
        id: 'proj-23',
        name: 'Plataforma de Atendimento ao Cliente',
        company_id: 'company-1',
        description: 'Sistema centralizado de atendimento ao cliente.',
        status: 'em_andamento',
        progress: 45,
        total_activities: 11,
        completed_activities: 5,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'sup-lead'
      },
      {
        id: 'proj-24',
        name: 'Análise de Performance de TI',
        company_id: 'company-1',
        description: 'Avaliação e otimização da infraestrutura de TI.',
        status: 'em_andamento',
        progress: 60,
        total_activities: 8,
        completed_activities: 5,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'ops-lead'
      },
      {
        id: 'proj-25',
        name: 'Sistema de Gestão de Documentos',
        company_id: 'company-1',
        description: 'Digitalização e organização de documentos corporativos.',
        status: 'planejamento',
        progress: 0,
        total_activities: 7,
        completed_activities: 0,
        start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'local-user'
      }
    ],
    project_activities: [
      { id: 'pa-1', project_id: 'proj-1', name: 'Design System', description: 'Implementar design tokens conforme especificado no Figma.', status: 'concluida', priority: 'nao_urgente', deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-2', project_id: 'proj-1', name: 'API de Pagamentos', description: 'Desenvolver endpoints para processamento de pagamentos.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now()).toISOString(), schedule_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-3', project_id: 'proj-1', name: 'Frontend Checkout', description: 'Criar interface de checkout com validação de formulário.', status: 'nao_iniciado', priority: 'media_urgencia', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-4', project_id: 'proj-2', name: 'Wireframes', description: 'Criar wireframes de baixa fidelidade para fluxo de usuário.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now()).toISOString(), schedule_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 3 - Sistema de Gestão Financeira
      { id: 'pa-5', project_id: 'proj-3', name: 'Modelagem de Dados', description: 'Criar modelo de dados para contas a pagar e receber.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-6', project_id: 'proj-3', name: 'Interface de Contas a Pagar', description: 'Desenvolver frontend para lançamento de contas a pagar.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-7', project_id: 'proj-3', name: 'Integração Bancária', description: 'Integrar sistema com APIs dos bancos parceiros.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-8', project_id: 'proj-3', name: 'Relatórios Gerenciais', description: 'Criar relatórios de fluxo de caixa e balancete.', status: 'nao_iniciado', priority: 'media_urgencia', deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 4 - Campanha de Natal
      { id: 'pa-9', project_id: 'proj-4', name: 'Briefing Criativo', description: 'Definir conceito e identidade visual da campanha.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-10', project_id: 'proj-4', name: 'Criação de Peças', description: 'Produzir materiais gráficos para todas as mídias.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-11', project_id: 'proj-4', name: 'Setup de Anúncios', description: 'Configurar campanhas em redes sociais e Google Ads.', status: 'nao_iniciado', priority: 'media_urgencia', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-12', project_id: 'proj-4', name: 'Monitoramento de Performance', description: 'Acompanhar resultados e otimizar campanhas.', status: 'pendente', priority: 'media_urgencia', deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 5 - Sistema de RH
      { id: 'pa-13', project_id: 'proj-5', name: 'Modelagem de Dados', description: 'Criar modelo de dados para funcionários e folha de pagamento.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-14', project_id: 'proj-5', name: 'Interface de Cadastro', description: 'Desenvolver frontend para cadastro de funcionários.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-15', project_id: 'proj-5', name: 'Integração com Folha', description: 'Integrar sistema com software de folha de pagamento.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 6 - App Mobile Corporativo
      { id: 'pa-16', project_id: 'proj-6', name: 'Definição de Requisitos', description: 'Levantar requisitos com usuários finais.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-17', project_id: 'proj-6', name: 'Prototipagem', description: 'Criar protótipos de alta fidelidade.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 7 - Migração de Infraestrutura
      { id: 'pa-18', project_id: 'proj-7', name: 'Levantamento de Ativos', description: 'Identificar todos os servidores e serviços atuais.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-19', project_id: 'proj-7', name: 'Escolha de Provedor', description: 'Selecionar provedor de nuvem.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-20', project_id: 'proj-7', name: 'Migração de Dados', description: 'Transferir dados para a nuvem.', status: 'atrasado', priority: 'urgente', deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 8 - Relatórios Gerenciais Automatizados
      { id: 'pa-21', project_id: 'proj-8', name: 'Definição de KPIs', description: 'Identificar indicadores-chave para diretoria.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-22', project_id: 'proj-8', name: 'Desenvolvimento de Queries', description: 'Criar consultas SQL para extração de dados.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-23', project_id: 'proj-8', name: 'Interface de Visualização', description: 'Criar dashboards para exibição de dados.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 9 - Redesign da Marca
      { id: 'pa-24', project_id: 'proj-9', name: 'Pesquisa de Mercado', description: 'Analisar percepção atual da marca.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-25', project_id: 'proj-9', name: 'Criação de Conceitos', description: 'Desenvolver conceitos visuais para nova marca.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 10 - Treinamento de Equipe
      { id: 'pa-26', project_id: 'proj-10', name: 'Definição de Conteúdo', description: 'Selecionar temas e conteúdo dos treinamentos.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-27', project_id: 'proj-10', name: 'Execução de Treinamentos', description: 'Ministrar treinamentos para equipes.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 11 - Integração com ERP
      { id: 'pa-28', project_id: 'proj-11', name: 'Análise de APIs', description: 'Estudar APIs disponíveis do ERP.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-29', project_id: 'proj-11', name: 'Desenvolvimento de Conectores', description: 'Criar conectores para integração.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 12 - Plano de Expansão Internacional
      { id: 'pa-30', project_id: 'proj-12', name: 'Análise de Mercado', description: 'Estudar potenciais mercados internacionais.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now()).toISOString(), schedule_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 13 - Sistema de Backup Automatizado
      { id: 'pa-31', project_id: 'proj-13', name: 'Definição de Estratégia', description: 'Definir estratégia de backup e recuperação.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-32', project_id: 'proj-13', name: 'Implementação de Scripts', description: 'Criar scripts de backup automatizados.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-33', project_id: 'proj-13', name: 'Testes de Recuperação', description: 'Testar processos de recuperação de dados.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 14 - Portal do Cliente
      { id: 'pa-34', project_id: 'proj-14', name: 'Definição de Requisitos', description: 'Levantar requisitos com clientes.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-35', project_id: 'proj-14', name: 'Prototipagem', description: 'Criar protótipos da interface do portal.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 15 - Pesquisa de Clima Organizacional
      { id: 'pa-36', project_id: 'proj-15', name: 'Criação de Questionário', description: 'Desenvolver questionário para pesquisa.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-37', project_id: 'proj-15', name: 'Aplicação da Pesquisa', description: 'Distribuir e coletar respostas.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 16 - Otimização de SEO
      { id: 'pa-38', project_id: 'proj-16', name: 'Análise de Palavras-Chave', description: 'Identificar palavras-chave relevantes.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-39', project_id: 'proj-16', name: 'Otimização On-Page', description: 'Otimizar conteúdo e estrutura das páginas.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 17 - Sistema de Controle de Estoque
      { id: 'pa-40', project_id: 'proj-17', name: 'Definição de Requisitos', description: 'Levantar requisitos com área de estoque.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now()).toISOString(), schedule_end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 18 - Plataforma de E-learning
      { id: 'pa-41', project_id: 'proj-18', name: 'Definição de Arquitetura', description: 'Definir arquitetura da plataforma.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-42', project_id: 'proj-18', name: 'Desenvolvimento de Cursos', description: 'Criar módulos de cursos iniciais.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 19 - Relatórios Regulatórios
      { id: 'pa-43', project_id: 'proj-19', name: 'Identificação de Requisitos', description: 'Identificar requisitos regulatórios.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-44', project_id: 'proj-19', name: 'Desenvolvimento de Relatórios', description: 'Criar relatórios automáticos.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 20 - Sistema de Gestão de Projetos
      { id: 'pa-45', project_id: 'proj-20', name: 'Definição de Requisitos', description: 'Levantar requisitos com gestores de projeto.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-46', project_id: 'proj-20', name: 'Prototipagem', description: 'Criar protótipos da interface.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 21 - Campanha de Responsabilidade Social
      { id: 'pa-47', project_id: 'proj-21', name: 'Definição de Temas', description: 'Selecionar temas para a campanha.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now()).toISOString(), schedule_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 22 - Sistema de Controle de Qualidade
      { id: 'pa-48', project_id: 'proj-22', name: 'Definição de Métricas', description: 'Definir métricas de qualidade.', status: 'concluida', priority: 'urgente', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-49', project_id: 'proj-22', name: 'Implementação de Testes', description: 'Criar testes automatizados.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 23 - Plataforma de Atendimento ao Cliente
      { id: 'pa-50', project_id: 'proj-23', name: 'Definição de Fluxos', description: 'Mapear fluxos de atendimento.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-51', project_id: 'proj-23', name: 'Desenvolvimento de Chatbot', description: 'Criar chatbot para atendimento inicial.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 24 - Análise de Performance de TI
      { id: 'pa-52', project_id: 'proj-24', name: 'Benchmarking', description: 'Comparar performance com benchmarks da indústria.', status: 'concluida', priority: 'media_urgencia', deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'pa-53', project_id: 'proj-24', name: 'Otimização de Servidores', description: 'Otimizar configurações de servidores.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Atividades do Projeto 25 - Sistema de Gestão de Documentos
      { id: 'pa-54', project_id: 'proj-25', name: 'Definição de Categorias', description: 'Definir categorias e estrutura de documentos.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now()).toISOString(), schedule_end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() }
    ],
    department_activities: [
      { id: 'da-1', department_id: 'dept-1', name: 'Revisão de Código Semanal', description: 'Revisar pull requests pendentes da sprint atual.', status: 'nao_iniciado', priority: 'urgente', deadline: new Date().toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 'da-2', department_id: 'dept-2', name: 'Planejamento Q3', description: 'Definir objetivos e metas para o próximo trimestre.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-3', department_id: 'dept-3', name: 'Treinamento de Segurança', description: 'Planejar e executar treinamento de segurança da informação.', status: 'nao_iniciado', priority: 'nao_urgente', deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-4', department_id: 'dept-1', name: 'Atualizar Bibliotecas', description: 'Atualizar dependências do projeto para versões estáveis.', status: 'concluida', priority: 'nao_urgente', deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_end: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Novas atividades de departamento
      { id: 'da-5', department_id: 'dept-5', name: 'Fechamento Mensal', description: 'Realizar fechamento contábil e envio de demonstrativos.', status: 'em_andamento', priority: 'urgente', deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-6', department_id: 'dept-6', name: 'Reunião de Vendas', description: 'Análise de pipeline e definição de estratégias.', status: 'nao_iniciado', priority: 'media_urgencia', deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-7', department_id: 'dept-7', name: 'Triagem de Tickets', description: 'Classificação e priorização de chamados recebidos.', status: 'pendente', priority: 'urgente', deadline: new Date().toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 'da-8', department_id: 'dept-1', name: 'Code Review', description: 'Revisão de código para manutenção do projeto.', status: 'pendente', priority: 'media_urgencia', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      // Additional department activities
      { id: 'da-9', department_id: 'dept-3', name: 'Avaliação de Clima', description: 'Coletar e analisar feedback dos funcionários.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-10', department_id: 'dept-4', name: 'Auditoria de Infraestrutura', description: 'Verificar conformidade e segurança dos sistemas.', status: 'pendente', priority: 'urgente', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-11', department_id: 'dept-2', name: 'Criação de Campanha', description: 'Desenvolver nova campanha promocional.', status: 'pendente', priority: 'media_urgencia', deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
      { id: 'da-12', department_id: 'dept-5', name: 'Análise de Investimentos', description: 'Avaliar oportunidades de investimento.', status: 'em_andamento', priority: 'media_urgencia', deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), schedule_start: new Date().toISOString(), schedule_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() }
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Reunião de Alinhamento',
        description: 'Alinhar expectativas com stakeholders',
        responsible: 'dev-lead',
        status: 'pendente',
        priority: 'alta',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 'task-2',
        title: 'Atualizar Documentação',
        description: 'Revisar wiki do projeto',
        responsible: 'dev-jr',
        status: 'em_andamento',
        priority: 'media',
        deadline: new Date(Date.now() + 172800000).toISOString(),
        created_at: new Date().toISOString()
      },
      // Novas tarefas
      {
        id: 'task-3',
        company_id: 'company-1',
        department_id: 'dept-5',
        title: 'Preparar Demonstrativo Financeiro',
        description: 'Elaborar relatório de despesas e receitas do mês',
        responsible: 'fin-lead',
        status: 'em_andamento',
        priority: 'alta',
        deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        created_by: 'fin-lead'
      },
      {
        id: 'task-4',
        company_id: 'company-1',
        department_id: 'dept-6',
        title: 'Contato com Cliente Potencial',
        description: 'Ligação para discutir proposta comercial',
        responsible: 'com-lead',
        status: 'pendente',
        priority: 'urgente',
        deadline: new Date().toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date().toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'com-lead'
      },
      {
        id: 'task-5',
        company_id: 'company-1',
        department_id: 'dept-7',
        title: 'Responder Ticket de Suporte',
        description: 'Resolver problema de acesso relatado pelo cliente',
        responsible: 'sup-lead',
        status: 'pendente',
        priority: 'urgente',
        deadline: new Date().toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date().toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'sup-lead'
      },
      {
        id: 'task-6',
        company_id: 'company-1',
        department_id: 'dept-1',
        title: 'Implementar Autenticação OAuth',
        description: 'Adicionar suporte a login com Google e GitHub',
        responsible: 'dev-pl',
        status: 'em_andamento',
        priority: 'media',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'dev-lead'
      },
      // Additional tasks for demonstration
      {
        id: 'task-7',
        company_id: 'company-1',
        department_id: 'dept-3',
        title: 'Atualizar Políticas de RH',
        description: 'Revisar e atualizar o manual do funcionário',
        responsible: 'hr-lead',
        status: 'em_andamento',
        priority: 'media',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        created_by: 'hr-lead'
      },
      {
        id: 'task-8',
        company_id: 'company-1',
        department_id: 'dept-2',
        title: 'Criar Conteúdo para Blog',
        description: 'Escrever artigo sobre tendências de marketing digital',
        responsible: 'mkt-spec-1',
        status: 'pendente',
        priority: 'media',
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'mkt-lead'
      },
      {
        id: 'task-9',
        company_id: 'company-1',
        department_id: 'dept-1',
        title: 'Refatorar Módulo de Usuários',
        description: 'Melhorar performance e segurança do módulo de usuários',
        responsible: 'dev-sr-1',
        status: 'em_andamento',
        priority: 'alta',
        deadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        created_by: 'dev-lead'
      },
      {
        id: 'task-10',
        company_id: 'company-1',
        department_id: 'dept-4',
        title: 'Manutenção Preventiva de Servidores',
        description: 'Realizar manutenção preventiva nos servidores principais',
        responsible: 'ops-tech-1',
        status: 'pendente',
        priority: 'urgente',
        deadline: new Date().toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date().toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'ops-lead'
      },
      {
        id: 'task-11',
        company_id: 'company-1',
        department_id: 'dept-1',
        title: 'Testes de Integração',
        description: 'Executar testes de integração após deploy',
        responsible: 'qa-eng-1',
        status: 'pendente',
        priority: 'alta',
        deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'qa-lead'
      },
      {
        id: 'task-12',
        company_id: 'company-1',
        department_id: 'dept-5',
        title: 'Conciliação Bancária',
        description: 'Realizar conciliação bancária mensal',
        responsible: 'fin-analyst-2',
        status: 'em_andamento',
        priority: 'urgente',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        created_by: 'fin-lead'
      },
      {
        id: 'task-13',
        company_id: 'company-1',
        department_id: 'dept-6',
        title: 'Análise de Concorrência',
        description: 'Pesquisar e analisar estratégias da concorrência',
        responsible: 'biz-dev-lead',
        status: 'em_andamento',
        priority: 'media',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        created_by: 'local-user'
      },
      {
        id: 'task-14',
        company_id: 'company-1',
        department_id: 'dept-3',
        title: 'Treinamento de Onboarding',
        description: 'Preparar material para treinamento de novos funcionários',
        responsible: 'hr-spec',
        status: 'pendente',
        priority: 'media',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'hr-lead'
      },
      {
        id: 'task-15',
        company_id: 'company-1',
        department_id: 'dept-2',
        title: 'Análise de Métricas de Campanha',
        description: 'Analisar performance das campanhas atuais',
        responsible: 'mkt-spec-2',
        status: 'pendente',
        priority: 'alta',
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        schedule_start: new Date().toISOString().split('T')[0],
        schedule_end: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        schedule_status: 'Dentro do prazo',
        has_fine: false,
        created_at: new Date().toISOString().split('T')[0],
        created_by: 'mkt-lead'
      }
    ],
    activities: [
      { id: 'act-1', name: 'Fechamento Mensal', description: 'Processo de fechamento contábil', department_id: 'dept-2', type: 'rotina', created_at: new Date().toISOString() },
      { id: 'act-2', name: 'Onboarding de Funcionario', description: 'Integração de novos colaboradores', department_id: 'dept-3', type: 'processo', created_at: new Date().toISOString() },
      { id: 'act-3', name: 'Manutenção de Servidores', description: 'Rotina de backup e updates', department_id: 'dept-1', type: 'rotina', created_at: new Date().toISOString() },
      // Novas atividades
      { id: 'act-4', name: 'Relatório Gerencial', description: 'Apresentação de KPIs para diretoria', department_id: 'dept-5', type: 'rotina', created_at: new Date().toISOString() },
      { id: 'act-5', name: 'Pesquisa de Satisfação', description: 'Coleta de feedback dos clientes', department_id: 'dept-7', type: 'processo', created_at: new Date().toISOString() },
      { id: 'act-6', name: 'Reunião de Planejamento', description: 'Definição de estratégias trimestrais', department_id: 'dept-6', type: 'rotina', created_at: new Date().toISOString() }
    ],
    sub_activities: [
      { id: 'sub-1', activity_id: 'act-1', name: 'Conciliação Bancária', order: 1, created_at: new Date().toISOString() },
      { id: 'sub-2', activity_id: 'act-1', name: 'Emissão de Relatórios', order: 2, created_at: new Date().toISOString() },
      { id: 'sub-3', activity_id: 'act-2', name: 'Configurar Email', order: 1, created_at: new Date().toISOString() },
      { id: 'sub-4', activity_id: 'act-2', name: 'Acesso ao Jira', order: 2, created_at: new Date().toISOString() },
      // Novas sub-atividades
      { id: 'sub-5', activity_id: 'act-4', name: 'Consolidar Dados', order: 1, created_at: new Date().toISOString() },
      { id: 'sub-6', activity_id: 'act-4', name: 'Gerar Gráficos', order: 2, created_at: new Date().toISOString() },
      { id: 'sub-7', activity_id: 'act-5', name: 'Enviar Pesquisa', order: 1, created_at: new Date().toISOString() },
      { id: 'sub-8', activity_id: 'act-5', name: 'Analisar Resultados', order: 2, created_at: new Date().toISOString() }
    ],
    processes: [
      { id: 'proc-1', company_id: 'company-1', name: 'Solicitação de Despesas', description: 'Workflow de aprovação de reembolso', created_at: new Date().toISOString() },
      { id: 'proc-2', company_id: 'company-1', name: 'Aprovação de Contrato', description: 'Jurídico e Financeiro', created_at: new Date().toISOString() },
      // Novos processos
      { id: 'proc-3', company_id: 'company-1', name: 'Onboarding de Cliente', description: 'Processo de integração de novos clientes', created_at: new Date().toISOString() },
      { id: 'proc-4', company_id: 'company-1', name: 'Liberação de Acesso', description: 'Solicitação e aprovação de acessos ao sistema', created_at: new Date().toISOString() }
    ],
    process_activities: [
      { id: 'pa-1', process_id: 'proc-1', name: 'Envio de Comprovantes', order: 1, created_at: new Date().toISOString() },
      { id: 'pa-2', process_id: 'proc-1', name: 'Aprovação do Gestor', order: 2, created_at: new Date().toISOString() },
      { id: 'pa-3', process_id: 'proc-1', name: 'Pagamento Financeiro', order: 3, created_at: new Date().toISOString() },
      // Novas atividades de processo
      { id: 'pa-4', process_id: 'proc-3', name: 'Cadastro Inicial', order: 1, created_at: new Date().toISOString() },
      { id: 'pa-5', process_id: 'proc-3', name: 'Configuração de Ambiente', order: 2, created_at: new Date().toISOString() },
      { id: 'pa-6', process_id: 'proc-3', name: 'Treinamento do Usuário', order: 3, created_at: new Date().toISOString() },
      { id: 'pa-7', process_id: 'proc-4', name: 'Solicitação de Acesso', order: 1, created_at: new Date().toISOString() },
      { id: 'pa-8', process_id: 'proc-4', name: 'Avaliação de Necessidade', order: 2, created_at: new Date().toISOString() },
      { id: 'pa-9', process_id: 'proc-4', name: 'Liberação Técnica', order: 3, created_at: new Date().toISOString() }
    ],
    workflows: [
      { id: 'wf-1', company_id: 'company-1', name: 'Pipeline de Vendas', status: 'ativo', created_at: new Date().toISOString() },
      { id: 'wf-2', company_id: 'company-1', name: 'Dev Ops Pipeline', status: 'ativo', created_at: new Date().toISOString() },
      // Novos workflows
      { id: 'wf-3', company_id: 'company-1', name: 'Processo de Contratação', status: 'ativo', created_at: new Date().toISOString() },
      { id: 'wf-4', company_id: 'company-1', name: 'Gestão de Projetos', status: 'ativo', created_at: new Date().toISOString() }
    ],
    workflow_processes: [],
    task_assignees: [],
    task_history: [],
    task_comments: [],

    activity_completions: [],
    department_activity_assignees: [
      { id: 'daa-1', activity_id: 'da-1', user_id: 'dev-lead' },
      { id: 'daa-2', activity_id: 'da-2', user_id: 'mkt-lead' },
      { id: 'daa-3', activity_id: 'da-3', user_id: 'dev-jr' },
      // Assignees para novas atividades de departamento
      { id: 'daa-4', activity_id: 'da-5', user_id: 'fin-lead' },
      { id: 'daa-5', activity_id: 'da-6', user_id: 'com-lead' },
      { id: 'daa-6', activity_id: 'da-7', user_id: 'sup-lead' },
      { id: 'daa-7', activity_id: 'da-8', user_id: 'dev-pl' },
      // Assignees for additional department activities
      { id: 'daa-8', activity_id: 'da-9', user_id: 'hr-lead' },
      { id: 'daa-9', activity_id: 'da-10', user_id: 'ops-lead' },
      { id: 'daa-10', activity_id: 'da-11', user_id: 'mkt-lead' },
      { id: 'daa-11', activity_id: 'da-12', user_id: 'fin-lead' }
    ],
    project_activity_assignees: [
      { id: 'paa-1', activity_id: 'pa-1', user_id: 'dev-lead' },
      { id: 'paa-2', activity_id: 'pa-2', user_id: 'dev-jr' },
      { id: 'paa-3', activity_id: 'pa-3', user_id: 'dev-jr' },
      { id: 'paa-4', activity_id: 'pa-4', user_id: 'mkt-lead' },
      // Assignees para novas atividades de projeto
      { id: 'paa-5', activity_id: 'pa-5', user_id: 'fin-lead' },
      { id: 'paa-6', activity_id: 'pa-6', user_id: 'fin-lead' },
      { id: 'paa-7', activity_id: 'pa-7', user_id: 'dev-pl' },
      { id: 'paa-8', activity_id: 'pa-8', user_id: 'dev-lead' },
      { id: 'paa-9', activity_id: 'pa-9', user_id: 'com-lead' },
      { id: 'paa-10', activity_id: 'pa-10', user_id: 'mkt-jr' },
      { id: 'paa-11', activity_id: 'pa-11', user_id: 'mkt-lead' },
      { id: 'paa-12', activity_id: 'pa-12', user_id: 'com-lead' },
      // Assignees para atividades dos projetos 5-25
      { id: 'paa-13', activity_id: 'pa-13', user_id: 'hr-lead' },
      { id: 'paa-14', activity_id: 'pa-14', user_id: 'dev-sr-1' },
      { id: 'paa-15', activity_id: 'pa-15', user_id: 'fin-analyst-1' },
      { id: 'paa-16', activity_id: 'pa-16', user_id: 'dev-lead' },
      { id: 'paa-17', activity_id: 'pa-17', user_id: 'dev-sr-2' },
      { id: 'paa-18', activity_id: 'pa-18', user_id: 'ops-lead' },
      { id: 'paa-19', activity_id: 'pa-19', user_id: 'ops-tech-1' },
      { id: 'paa-20', activity_id: 'pa-20', user_id: 'ops-tech-2' },
      { id: 'paa-21', activity_id: 'pa-21', user_id: 'fin-lead' },
      { id: 'paa-22', activity_id: 'pa-22', user_id: 'fin-analyst-2' },
      { id: 'paa-23', activity_id: 'pa-23', user_id: 'dev-pl' },
      { id: 'paa-24', activity_id: 'pa-24', user_id: 'mkt-lead' },
      { id: 'paa-25', activity_id: 'pa-25', user_id: 'mkt-spec-1' },
      { id: 'paa-26', activity_id: 'pa-26', user_id: 'hr-lead' },
      { id: 'paa-27', activity_id: 'pa-27', user_id: 'hr-spec' },
      { id: 'paa-28', activity_id: 'pa-28', user_id: 'dev-lead' },
      { id: 'paa-29', activity_id: 'pa-29', user_id: 'dev-sr-1' },
      { id: 'paa-30', activity_id: 'pa-30', user_id: 'biz-dev-lead' },
      { id: 'paa-31', activity_id: 'pa-31', user_id: 'ops-lead' },
      { id: 'paa-32', activity_id: 'pa-32', user_id: 'ops-tech-1' },
      { id: 'paa-33', activity_id: 'pa-33', user_id: 'ops-tech-2' },
      { id: 'paa-34', activity_id: 'pa-34', user_id: 'dev-lead' },
      { id: 'paa-35', activity_id: 'pa-35', user_id: 'dev-sr-2' },
      { id: 'paa-36', activity_id: 'pa-36', user_id: 'hr-lead' },
      { id: 'paa-37', activity_id: 'pa-37', user_id: 'hr-spec' },
      { id: 'paa-38', activity_id: 'pa-38', user_id: 'mkt-lead' },
      { id: 'paa-39', activity_id: 'pa-39', user_id: 'mkt-spec-2' },
      { id: 'paa-40', activity_id: 'pa-40', user_id: 'biz-dev-lead' },
      { id: 'paa-41', activity_id: 'pa-41', user_id: 'dev-lead' },
      { id: 'paa-42', activity_id: 'pa-42', user_id: 'dev-pl' },
      { id: 'paa-43', activity_id: 'pa-43', user_id: 'fin-lead' },
      { id: 'paa-44', activity_id: 'pa-44', user_id: 'fin-analyst-1' },
      { id: 'paa-45', activity_id: 'pa-45', user_id: 'local-user' },
      { id: 'paa-46', activity_id: 'pa-46', user_id: 'dev-sr-1' },
      { id: 'paa-47', activity_id: 'pa-47', user_id: 'mkt-lead' },
      { id: 'paa-48', activity_id: 'pa-48', user_id: 'qa-lead' },
      { id: 'paa-49', activity_id: 'pa-49', user_id: 'qa-eng-1' },
      { id: 'paa-50', activity_id: 'pa-50', user_id: 'sup-lead' },
      { id: 'paa-51', activity_id: 'pa-51', user_id: 'dev-sr-2' },
      { id: 'paa-52', activity_id: 'pa-52', user_id: 'ops-lead' },
      { id: 'paa-53', activity_id: 'pa-53', user_id: 'ops-tech-1' },
      { id: 'paa-54', activity_id: 'pa-54', user_id: 'local-user' }
    ],
    project_assignees: [],
    notifications: [
      {
        id: 'notif-1',
        title: 'Nova atividade atribuída',
        description: 'Você recebeu uma nova atividade: "Definir escopo do projeto"',
        type: 'task_assigned',
        created_by: 'local-user',
        created_for: 'user-2',
        task_id: 'proj-act-1',
        project_id: 'proj-1',
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updated_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'notif-2',
        title: 'Atividade concluída',
        description: 'A atividade "Backup do Servidor" foi marcada como concluída',
        type: 'task_completed',
        created_by: 'user-3',
        created_for: 'local-user',
        task_id: 'task-3',
        read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 7200000).toISOString()
      },
      // Novas notificações
      {
        id: 'notif-3',
        title: 'Prazo se aproximando',
        description: 'A tarefa "Preparar Demonstrativo Financeiro" vence amanhã',
        type: 'deadline_warning',
        created_by: 'system',
        created_for: 'fin-lead',
        task_id: 'task-3',
        read: false,
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        updated_at: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'notif-4',
        title: 'Nova solicitação de acesso',
        description: 'Um novo pedido de acesso ao sistema foi registrado',
        type: 'access_request',
        created_by: 'system',
        created_for: 'local-user',
        task_id: 'task-5',
        read: false,
        created_at: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        updated_at: new Date(Date.now() - 900000).toISOString()
      },
      // Additional notifications
      {
        id: 'notif-5',
        title: 'Reunião agendada',
        description: 'Reunião de planejamento com a equipe de desenvolvimento',
        type: 'meeting_scheduled',
        created_by: 'dev-lead',
        created_for: 'dev-pl',
        task_id: 'task-9',
        read: false,
        created_at: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
        updated_at: new Date(Date.now() - 1200000).toISOString()
      },
      {
        id: 'notif-6',
        title: 'Relatório disponível',
        description: 'Relatório mensal de performance já pode ser acessado',
        type: 'report_available',
        created_by: 'fin-lead',
        created_for: 'local-user',
        task_id: 'task-12',
        read: false,
        created_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        updated_at: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 'notif-7',
        title: 'Campanha publicada',
        description: 'Campanha de marketing foi publicada com sucesso',
        type: 'campaign_published',
        created_by: 'mkt-lead',
        created_for: 'com-lead',
        task_id: 'task-15',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated_at: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    checklist_items: [
      { id: crypto.randomUUID(), activity_id: 'pa-1', text: 'Validar tokens de cor', completed: true, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'pa-1', text: 'Exportar assets do Figma', completed: false, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'da-1', text: 'Verificar PR #123', completed: false, created_at: new Date().toISOString() },
      // Novos itens de checklist
      { id: crypto.randomUUID(), activity_id: 'pa-7', text: 'Configurar endpoints', completed: true, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'pa-7', text: 'Testar conexão com API', completed: false, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'da-5', text: 'Revisar lançamentos', completed: false, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'da-6', text: 'Preparar apresentação', completed: false, created_at: new Date().toISOString() },
      // Additional checklist items
      { id: crypto.randomUUID(), activity_id: 'pa-15', text: 'Mapear campos de integração', completed: true, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'pa-15', text: 'Testar sincronização de dados', completed: false, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'pa-25', text: 'Criar paleta de cores', completed: true, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'pa-25', text: 'Desenvolver protótipos', completed: false, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'da-9', text: 'Preparar questionário', completed: true, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'da-9', text: 'Distribuir pesquisa', completed: true, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), activity_id: 'da-9', text: 'Analisar resultados', completed: false, created_at: new Date().toISOString() }
    ]
  };

  // Always use initial data - bypass localStorage parsing
  // if (raw) {
  //   try {
  //     const parsed = JSON.parse(raw);
  //     const merged = { ...initial, ...parsed };

  //     // Garantir que os dados iniciais existam se estiverem vazios
  //     if (!merged.companies || merged.companies.length === 0) merged.companies = initial.companies;
  //     if (!merged.departments || merged.departments.length === 0) merged.departments = initial.departments;
  //     if (!merged.profiles || merged.profiles.length === 0) merged.profiles = initial.profiles;

  //     // Garantir que tabelas novas existam
  //     if (!merged.user_companies) merged.user_companies = initial.user_companies;
  //     if (!merged.user_roles) merged.user_roles = initial.user_roles;
  //     if (!merged.user_departments) merged.user_departments = initial.user_departments;


  //     // Popular tarefas se estiverem vazias
  //     if (!merged.tasks || merged.tasks.length === 0) {
  const merged = initial;
  // Always populate tasks with rich mock data
  if (true) {        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        merged.tasks = [
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-1',
            title: "Ligar para Leads",
            description: "Contatar lista de leads da semana",
            responsible: "Gestor Comercial",
            status: "Em andamento",
            priority: "alta",
            deadline: today,
            schedule_start: today,
            schedule_end: today,
            schedule_status: "Dentro do prazo",
            has_fine: false,
            created_at: yesterday,
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-2',
            title: "Pagar Fornecedores",
            description: "Realizar pagamentos agendados",
            responsible: "Admin Local",
            status: "Não iniciado",
            priority: "urgente",
            deadline: today,
            schedule_start: today,
            schedule_end: today,
            schedule_status: "Dentro do prazo",
            has_fine: true,
            fine_amount: 150.00,
            created_at: yesterday,
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-3',
            title: "Backup do Servidor",
            description: "Verificar integridade dos backups",
            responsible: "Colaborador TI",
            status: "Feito",
            priority: "média",
            deadline: yesterday,
            schedule_start: yesterday,
            schedule_end: yesterday,
            schedule_status: "Dentro do prazo",
            has_fine: false,
            created_at: yesterday,
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-1',
            title: "Reunião de Metas",
            description: "Definir metas para o próximo trimestre",
            responsible: "Gestor Comercial",
            status: "Não iniciado",
            priority: "alta",
            deadline: tomorrow,
            schedule_start: tomorrow,
            schedule_end: tomorrow,
            schedule_status: "Dentro do prazo",
            has_fine: false,
            created_at: today,
            created_by: 'local-user'
          },
          // Novos dados mocados adicionados
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-2',
            title: "Relatório Financeiro Mensal",
            description: "Preparar relatório financeiro para diretoria",
            responsible: "Admin Local",
            status: "Em andamento",
            priority: "alta",
            deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // In 2 days
            schedule_start: today,
            schedule_end: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // In 2 days
            schedule_status: "Dentro do prazo",
            has_fine: false,
            created_at: yesterday,
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-3',
            title: "Atualização de Segurança",
            description: "Aplicar patches de segurança nos servidores",
            responsible: "Colaborador TI",
            status: "Não iniciado",
            priority: "urgente",
            deadline: today,
            schedule_start: today,
            schedule_end: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            schedule_status: "Dentro do prazo",
            has_fine: true,
            fine_amount: 500.00,
            fine_reason: "Atraso na atualização de segurança",
            created_at: today,
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-1',
            title: "Campanha Publicitária",
            description: "Desenvolver nova campanha para redes sociais",
            responsible: "Gestor Comercial",
            status: "Parado",
            priority: "média",
            deadline: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (overdue)
            schedule_start: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], // 3 days ago
            schedule_end: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
            schedule_status: "Atrasado",
            has_fine: false,
            created_at: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-3',
            title: "Treinamento de Equipe",
            description: "Treinamento sobre novas ferramentas de desenvolvimento",
            responsible: "Colaborador TI",
            status: "Em andamento",
            priority: "baixa",
            deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // In 1 week
            schedule_start: today,
            schedule_end: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // In 1 week
            schedule_status: "Dentro do prazo",
            has_fine: false,
            created_at: today,
            created_by: 'local-user'
          },
          {
            id: crypto.randomUUID(),
            company_id: 'company-1',
            department_id: 'dept-2',
            title: "Auditoria Interna",
            description: "Realizar auditoria dos processos financeiros",
            responsible: "Admin Local",
            status: "Não iniciado",
            priority: "alta",
            deadline: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], // In 10 days
            schedule_start: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // In 5 days
            schedule_end: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], // In 10 days
            schedule_status: "Dentro do prazo",
            has_fine: false,
            created_at: today,
            created_by: 'local-user'
          }
        ];
      }

      // Popular histórico de tarefas se estiver vazio
      if (!merged.task_history || merged.task_history.length === 0) {
        const taskId = merged.tasks[0]?.id || 'task-1';
        merged.task_history = [
          {
            id: crypto.randomUUID(),
            task_id: taskId,
            user_id: 'local-user',
            action: 'criada',
            old_values: null,
            new_values: { status: 'Não iniciado' },
            created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          },
          {
            id: crypto.randomUUID(),
            task_id: taskId,
            user_id: 'local-user',
            action: 'atualizada',
            old_values: { status: 'Não iniciado' },
            new_values: { status: 'Em andamento' },
            created_at: new Date().toISOString()
          }
        ];
      }

      // Popular comentários de tarefas se estiver vazio
      if (!merged.task_comments || merged.task_comments.length === 0) {
        const taskId = merged.tasks[0]?.id || 'task-1';
        merged.task_comments = [
          {
            id: crypto.randomUUID(),
            task_id: taskId,
            user_id: 'local-user',
            comment: 'Iniciando trabalho nesta tarefa hoje.',
            created_at: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
          },
          {
            id: crypto.randomUUID(),
            task_id: taskId,
            user_id: 'user-2',
            comment: 'Precisamos finalizar isso até amanhã.',
            created_at: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
          }
        ];
      }



      // Popular checklist se vazio
      if (!merged.checklist_items || merged.checklist_items.length === 0) {
        merged.checklist_items = [
          { id: crypto.randomUUID(), activity_id: 'pa-1', text: 'Validar tokens de cor', completed: true, created_at: new Date().toISOString() },
          { id: crypto.randomUUID(), activity_id: 'pa-1', text: 'Exportar assets do Figma', completed: false, created_at: new Date().toISOString() },
          { id: crypto.randomUUID(), activity_id: 'da-1', text: 'Verificar PR #123', completed: false, created_at: new Date().toISOString() }
        ];
      }

      // Always return initial data
    // return merged;
    return initial;
    // } catch (e) {
    //   console.error("Failed to parse local DB, resetting:", e);
    //   localStorage.removeItem(DB_KEY);
    // }
  }

  // Always return initial data
  // localStorage.setItem(DB_KEY, JSON.stringify(initial));
  // return initial;
  function writeDB(db: Tables) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function getTable<T extends keyof Tables>(table: T): Tables[T] {
    const db = readDB();
    return db[table];
  }

  function setTable<T extends keyof Tables>(table: T, rows: Tables[T]) {
    const db = readDB();
    db[table] = rows;
    writeDB(db);
  }

  // Lógica do Construtor de Consultas
  class MockQueryBuilder {
    private table: keyof Tables;
    private filters: Array<(row: Row) => boolean> = [];
    private sorts: Array<{ column: string; ascending: boolean }> = [];
    private _limit: number | null = null;
    private _single: boolean = false;
    private _maybe = false;
    private _select: string | undefined;
    private _insertData: Row | Row[] | null = null;
    private _updateData: Partial<Row> | null = null;
    private _delete: boolean = false;

    constructor(table: keyof Tables) {
      this.table = table;
    }

    select(columns?: string) {
      this._select = columns;
      return this;
    }

    insert(data: Row | Row[]) {
      this._insertData = data;
      return this;
    }

    update(data: Partial<Row>) {
      this._updateData = data;
      return this;
    }

    delete() {
      this._delete = true;
      return this;
    }

    // Filtros
    eq(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] == value); // Igualdade flexível para correspondência de números/strings
      return this;
    }

    neq(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] != value);
      return this;
    }

    gt(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] > value);
      return this;
    }

    gte(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] >= value);
      return this;
    }

    lt(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] < value);
      return this;
    }

    lte(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] <= value);
      return this;
    }

    in(column: string, values: (string | number | boolean | null | undefined)[]) {
      this.filters.push(row => {
        const rowValue = row[column];
        // Handle primitive types
        if (typeof rowValue !== 'object' || rowValue === null) {
          return values.includes(rowValue as string | number | boolean | null | undefined);
        }
        // Handle object types (like Date)
        return values.some(v =>
          v !== null && v !== undefined &&
          typeof v === 'object' &&
          JSON.stringify(rowValue) === JSON.stringify(v)
        );
      });
      return this;
    }

    is(column: string, value: string | number | boolean | null | undefined) {
      this.filters.push(row => row[column] === value);
      return this;
    }

    like(column: string, pattern: string) {
      const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
      this.filters.push(row => typeof row[column] === 'string' && regex.test(row[column] as string));
      return this;
    }

    ilike(column: string, pattern: string) {
      return this.like(column, pattern);
    }

    or(filters: string) {
      // Implementação básica de OR: "col1.eq.val1,col2.eq.val2"
      // Isso é complexo de analisar completamente, implementando uma versão simplificada para casos comuns
      // Exemplo: "title.ilike.%search%,description.ilike.%search%"
      const conditions = filters.split(',');
      this.filters.push(row => {
        return conditions.some(cond => {
          const [col, op, val] = cond.split('.');
          if (op === 'eq') return row[col] == val;
          if (op === 'ilike' || op === 'like') {
            const regex = new RegExp(val.replace(/%/g, '.*'), 'i');
            return typeof row[col] === 'string' && regex.test(row[col] as string);
          }
          return false;
        });
      });
      return this;
    }

    order(column: string, opts?: { ascending?: boolean }) {
      this.sorts.push({ column, ascending: opts?.ascending ?? true });
      return this;
    }

    limit(count: number) {
      this._limit = count;
      return this;
    }

    single() {
      this._single = true;
      this._maybe = false; // Garante que single() puro não é maybeSingle
      return this;
    }

    maybeSingle() {
      this._single = true;
      this._maybe = true; // Flag para indicar que não deve lançar erro se vazio
      return this;
    }

    processSelect(rows: Row[]) {
      if (!this._select || this._select === '*') return rows;

      return rows.map(row => {
        const newRow: Row = {} as Row;

        // Seleção básica de colunas
        if (this._select?.includes('*')) {
          Object.assign(newRow, row);
        } else {
          this._select?.split(',').forEach(col => {
            const cleanCol = col.trim();
            if (!cleanCol.includes(':') && !cleanCol.includes('(')) {
              if (row[cleanCol] !== undefined) newRow[cleanCol] = row[cleanCol];
            }
          });
        }

        // Tratar Joins (Implementação mock para relações conhecidas específicas)
        if (this._select?.includes('department:departments')) {
          const dept = getTable('departments').find(d => d.id === row.department_id);
          newRow.department = dept ? { id: dept.id, name: dept.name, company_id: dept.company_id } : null;
        }
        if (this._select?.includes('project:projects')) {
          const proj = getTable('projects').find(p => p.id === row.project_id);
          newRow.project = proj ? { id: proj.id, name: proj.name, company_id: proj.company_id } : null;
        }
        if (this._select?.includes('assigned_user:profiles')) {
          // Mock: responsável é armazenado como string de nome nas tarefas, mas tentamos encontrar o perfil
          // No banco de dados real é um ID. Aqui podemos ter problemas se o responsável for nome.
          // Vamos tentar corresponder pelo nome se o ID falhar
          let user = getTable('profiles').find(p => p.id === row.responsible);
          if (!user) user = getTable('profiles').find(p => p.full_name === row.responsible);
          newRow.assigned_user = user ? { id: user.id, full_name: user.full_name } : null;
        }
        if (this._select?.includes('creator:profiles')) {
          const user = getTable('profiles').find(p => p.id === row.created_by);
          newRow.creator = user ? { id: user.id, full_name: user.full_name } : null;
        }

        // Handle notifications creator join
        if (this.table === 'notifications' && this._select?.includes('creator:created_by')) {
          const user = getTable('profiles').find(p => p.id === row.created_by);
          newRow.creator = user ? { full_name: user.full_name } : null;
        }

        return newRow;
      });
    }

    // Execução
    async then(
      resolve: (res: { data: Row | Row[] | null; error: { message: string } | null }) => void,
      reject: (err: { message: string }) => void
    ) {
      try {
        // Handle insert operation
        if (this._insertData) {
          const db = readDB();
          const tableData = db[this.table];

          // Add the new data
          const newData = Array.isArray(this._insertData)
            ? this._insertData.map(item => ({
              ...item,
              id: (item.id as string) || crypto.randomUUID(),
              created_at: (item.created_at as string) || new Date().toISOString(),
              updated_at: (item.updated_at as string) || new Date().toISOString()
            }))
            : [{
              ...this._insertData,
              id: (this._insertData.id as string) || crypto.randomUUID(),
              created_at: (this._insertData.created_at as string) || new Date().toISOString(),
              updated_at: (this._insertData.updated_at as string) || new Date().toISOString()
            }];

          db[this.table] = [...tableData, ...newData] as Tables[keyof Tables];
          writeDB(db);

          resolve({ data: Array.isArray(this._insertData) ? newData : newData[0], error: null });
          return;
        }

        // Handle update operation
        if (this._updateData) {
          const db = readDB();
          let tableData = db[this.table] as Row[];

          // Find rows to update
          let matchingRows = tableData;
          for (const filter of this.filters) {
            matchingRows = matchingRows.filter(filter);
          }

          if (matchingRows.length > 0) {
            // Apply updates
            const updatedRows = tableData.map(row => {
              if (matchingRows.some(mr => mr.id === row.id)) {
                return {
                  ...row,
                  ...this._updateData,
                  updated_at: new Date().toISOString()
                };
              }
              return row;
            });

            db[this.table] = updatedRows as Tables[keyof Tables];
            writeDB(db);
            resolve({ data: null, error: null });
            return;
          }
          resolve({ data: null, error: null }); // No matching rows
          return;
        }

        // Handle delete operation
        if (this._delete) {
          const db = readDB();
          let tableData = db[this.table] as Row[];

          // Find rows to delete (keep rows that DON'T match)
          // Simplest: filter matching rows to identify IDs, then exclude them
          let rowsToDelete = tableData;
          for (const filter of this.filters) {
            rowsToDelete = rowsToDelete.filter(filter);
          }

          if (rowsToDelete.length > 0) {
            const deleteIds = new Set(rowsToDelete.map(r => r.id));
            const newTableData = tableData.filter(r => !deleteIds.has(r.id));

            db[this.table] = newTableData as Tables[keyof Tables];
            writeDB(db);
            resolve({ data: null, error: null });
            return;
          }
          resolve({ data: null, error: null });
          return;
        }

        let data = getTable(this.table);

        // Aplicar filtros
        for (const filter of this.filters) {
          data = data.filter(filter);
        }

        // Aplicar ordenações
        for (const sort of this.sorts) {
          data.sort((a, b) => {
            if (a[sort.column] < b[sort.column]) return sort.ascending ? -1 : 1;
            if (a[sort.column] > b[sort.column]) return sort.ascending ? 1 : -1;
            return 0;
          });
        }

        // Aplicar limite
        if (this._limit) {
          data = data.slice(0, this._limit);
        }

        // Tratar Select & Joins (Simplificado)
        data = this.processSelect(data);

        // Tratar Select & Joins (Simplificado)
        data = this.processSelect(data);

        if (this._single) {
          if (data.length === 0) {
            if (this._maybe) {
              resolve({ data: null, error: null });
            } else {
              resolve({ data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } });
            }
          } else if (data.length > 1) {
            resolve({ data: null, error: { message: "JSON object requested, multiple rows returned" } });
          } else {
            resolve({ data: data[0], error: null });
          }
        } else {
          resolve({ data, error: null });
        }
      } catch (e: unknown) {
        const error = e as { message: string };
        resolve({ data: null, error: { message: error.message } });
      }
    }
  }

function readSession() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

function writeSession(session: UserSession | null) {
  if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_KEY);
}

export function createMockClient() {
  // Garantir sessão padrão para ambiente de desenvolvimento
  if (!readSession()) {
    const session: UserSession = {
      user: {
        id: 'local-user',
        email: 'admin@gclick.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString()
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    writeSession(session);
  }

  // Array para manter os subscribers
  const authSubscribers: ((event: string, session: UserSession | null) => void)[] = [];

  function notifySubscribers(event: string, session: UserSession | null) {
    authSubscribers.forEach(cb => cb(event, session));
  }

  return {
    from(table: keyof Tables) {
      return new MockQueryBuilder(table);
    },
    auth: {
      getSession: async () => {
        const session = readSession();
        return { data: { session }, error: null };
      },
      onAuthStateChange: (cb: (event: string, session: UserSession | null) => void) => {
        // Register subscriber
        authSubscribers.push(cb);

        // Immediately call with current session state
        const session = readSession();
        cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authSubscribers.indexOf(cb);
                if (idx > -1) authSubscribers.splice(idx, 1);
              }
            }
          }
        };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        // Login mock - encontrar usuário por email
        const profiles = getTable('profiles');
        const user = profiles.find(p => p.email === email);
        if (user) {
          const session: UserSession = {
            user: {
              id: user.id as string,
              email: user.email as string,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString()
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
          };
          writeSession(session);
          notifySubscribers('SIGNED_IN', session);
          return { data: { session }, error: null };
        }
        // Alternativa para usuário local padrão
        if (email === 'admin@gclick.com') {
          const session: UserSession = {
            user: {
              id: 'local-user',
              email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString()
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
          };
          writeSession(session);
          notifySubscribers('SIGNED_IN', session);
          return { data: { session }, error: null };
        }
        return { data: null, error: { message: 'Invalid credentials' } };
      },
      signOut: async () => {
        writeSession(null);
        notifySubscribers('SIGNED_OUT', null);
        return { error: null };
      }
    },
    // Mock de Storage para evitar crashes em uploads de avatar
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => {
          console.log('Mock upload:', bucket, path, file.name);
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => {
          // Retorna uma imagem placeholder qualquer
          return { data: { publicUrl: `https://placehold.co/400?text=${path}` } };
        }
      })
    }
  };
}
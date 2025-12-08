// Banco de dados local simples usando localStorage. Suporta select/insert/update/delete com filtros encadeados.

type Row = Record<string, any>;

const DB_KEY = "mtv_local_db";

type Tables = {
  companies: Row[];
  departments: Row[];
  profiles: Row[];
  tasks: Row[];
  task_assignees: Row[];
  // Suporte legado se necessário
  activities: Row[];
  sub_activities: Row[];
  processes: Row[];
  process_activities: Row[];
  workflows: Row[];
  workflow_processes: Row[];
  activity_completions: Row[];
  // Tabelas para projetos
  projects: Row[];
  project_activities: Row[];
  project_assignees: Row[];
};

function readDB(): Tables {
  const raw = localStorage.getItem(DB_KEY);
  const initial: Tables = {
    companies: [
      { id: 'company-1', name: 'Gclick Imperial', created_at: new Date().toISOString() },
      { id: 'company-2', name: 'Empresa Secundária', created_at: new Date().toISOString() },
    ],
    departments: [
      { id: 'dept-1', company_id: 'company-1', name: 'Comercial', description: 'Vendas e CRM', created_at: new Date().toISOString() },
      { id: 'dept-2', company_id: 'company-1', name: 'Financeiro', description: 'Contas a pagar/receber', created_at: new Date().toISOString() },
      { id: 'dept-3', company_id: 'company-1', name: 'TI', description: 'Suporte e Infra', created_at: new Date().toISOString() },
      { id: 'dept-4', company_id: 'company-2', name: 'RH', description: 'Recursos Humanos', created_at: new Date().toISOString() },
      { id: 'dept-5', company_id: 'company-2', name: 'Logística', description: 'Entregas e Estoque', created_at: new Date().toISOString() },
    ],
    profiles: [
      { id: 'local-user', company_id: 'company-1', full_name: 'Admin Local', role: 'admin', email: 'admin@gclick.com', created_at: new Date().toISOString() },
      { id: 'user-2', company_id: 'company-1', full_name: 'Gestor Comercial', role: 'gestor', email: 'gestor@gclick.com', created_at: new Date().toISOString() },
      { id: 'user-3', company_id: 'company-1', full_name: 'Colaborador TI', role: 'colaborador', email: 'colab@gclick.com', created_at: new Date().toISOString() },
    ],
    tasks: [],
    task_assignees: [],
    activities: [],
    sub_activities: [],
    processes: [],
    process_activities: [],
    workflows: [],
    workflow_processes: [],
    activity_completions: [],
    // Dados iniciais para projetos
    projects: [
      { 
        id: 'proj-1', 
        company_id: 'company-1', 
        name: 'Projeto de Expansão Comercial', 
        description: 'Expansão para novos mercados regionais', 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 'proj-2', 
        company_id: 'company-1', 
        name: 'Migração de Sistema', 
        description: 'Migração do sistema legado para a nuvem', 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    project_activities: [
      {
        id: 'proj-act-1',
        project_id: 'proj-1',
        title: 'Definir escopo do projeto',
        description: 'Documentar objetivos e entregas do projeto',
        responsible: 'local-user',
        department_ids: ['dept-1'],
        status: 'Feito',
        priority: 'alta',
        deadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        schedule_start: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        schedule_end: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        schedule_status: 'Dentro do prazo',
        completed_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'proj-act-2',
        project_id: 'proj-1',
        title: 'Identificar stakeholders',
        description: 'Listar todas as partes interessadas',
        responsible: 'user-2',
        department_ids: ['dept-1', 'dept-2'],
        status: 'Em andamento',
        priority: 'média',
        deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        schedule_start: new Date().toISOString(),
        schedule_end: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        schedule_status: 'Dentro do prazo',
        completed_at: null,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'proj-act-3',
        project_id: 'proj-2',
        title: 'Configurar ambiente de teste',
        description: 'Preparar infraestrutura para testes',
        responsible: 'user-3',
        department_ids: ['dept-3'],
        status: 'Não iniciado',
        priority: 'baixa',
        deadline: new Date(Date.now() + 259200000).toISOString(), // In 3 days
        schedule_start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        schedule_end: new Date(Date.now() + 259200000).toISOString(), // In 3 days
        schedule_status: 'Dentro do prazo',
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    project_assignees: [],
  };

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const merged = { ...initial, ...parsed };

      // Garantir que os dados iniciais existam se estiverem vazios
      if (!merged.companies || merged.companies.length === 0) merged.companies = initial.companies;
      if (!merged.departments || merged.departments.length === 0) merged.departments = initial.departments;
      if (!merged.profiles || merged.profiles.length === 0) merged.profiles = initial.profiles;

      // Popular tarefas se estiverem vazias
      if (!merged.tasks || merged.tasks.length === 0) {
        const today = new Date().toISOString().split('T')[0];
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
          }
        ];
      }

      return merged;
    } catch (e) {
      console.error("Failed to parse local DB, resetting:", e);
      localStorage.removeItem(DB_KEY);
    }
  }

  localStorage.setItem(DB_KEY, JSON.stringify(initial));
  return initial;
}

function writeDB(db: Tables) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getTable<T extends keyof Tables>(table: T): Tables[T] {
  const db = readDB();
  return db[table];
}

function setTable<T extends keyof Tables>(table: T, rows: Tables[T]) {
  const db = readDB();
  db[table] = rows as any;
  writeDB(db);
}

// Lógica do Construtor de Consultas
class MockQueryBuilder {
  private table: keyof Tables;
  private filters: Array<(row: Row) => boolean> = [];
  private sorts: Array<{ column: string; ascending: boolean }> = [];
  private _limit: number | null = null;
  private _single: boolean = false;
  private _select: string | undefined;
  private _insertData: any = null;

  constructor(table: keyof Tables) {
    this.table = table;
  }

  select(columns?: string) {
    this._select = columns;
    return this;
  }

  insert(data: any) {
    this._insertData = data;
    return this;
  }

  // Filtros
  eq(column: string, value: any) {
    this.filters.push(row => row[column] == value); // Igualdade flexível para correspondência de números/strings
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push(row => row[column] != value);
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push(row => row[column] > value);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push(row => row[column] >= value);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push(row => row[column] < value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push(row => row[column] <= value);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push(row => values.includes(row[column]));
    return this;
  }

  is(column: string, value: any) {
    this.filters.push(row => row[column] === value);
    return this;
  }

  like(column: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this.filters.push(row => regex.test(row[column]));
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
          return regex.test(row[col]);
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
    return this;
  }

  // Execução
  async then(resolve: (res: { data: any; error: any }) => void, reject: (err: any) => void) {
    try {
      // Handle insert operation
      if (this._insertData) {
        const db = readDB();
        const tableData = db[this.table];
        
        // Add the new data
        const newData = Array.isArray(this._insertData) 
          ? this._insertData.map(item => ({
            ...item,
            id: item.id || crypto.randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString()
          }))
          : [{
            ...this._insertData,
            id: this._insertData.id || crypto.randomUUID(),
            created_at: this._insertData.created_at || new Date().toISOString(),
            updated_at: this._insertData.updated_at || new Date().toISOString()
          }];
        
        db[this.table] = [...tableData, ...newData];
        writeDB(db);
        
        resolve({ data: Array.isArray(this._insertData) ? newData : newData[0], error: null });
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

      if (this._single) {
        resolve({ data: data[0] || null, error: null });
      } else {
        resolve({ data, error: null });
      }
    } catch (e: any) {
      resolve({ data: null, error: { message: e.message } });
    }
  }

  processSelect(rows: Row[]) {
    if (!this._select || this._select === '*') return rows;

    return rows.map(row => {
      const newRow: any = {};

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
        newRow.department = dept ? { id: dept.id, name: dept.name } : null;
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

      return newRow;
    });
  }
}

export function createMockClient() {
  const AUTH_KEY = "mtv_local_auth_session";

  function readSession() {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function writeSession(session: any | null) {
    if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    else localStorage.removeItem(AUTH_KEY);
  }

  // Garantir sessão padrão
  if (!readSession()) {
    writeSession({ user: { id: 'local-user', email: 'admin@gclick.com' } });
  }

  return {
    from(table: keyof Tables) {
      return new MockQueryBuilder(table);
    },
    auth: {
      getSession: async () => ({ data: { session: readSession() }, error: null }),
      onAuthStateChange: (cb: any) => {
        cb('SIGNED_IN', readSession());
        return { data: { subscription: { unsubscribe: () => { } } } };
      },
      signInWithPassword: async ({ email }: any) => {
        // Login mock - encontrar usuário por email
        const profiles = getTable('profiles');
        const user = profiles.find(p => p.email === email);
        if (user) {
          const session = { user: { id: user.id, email: user.email } };
          writeSession(session);
          return { data: { session }, error: null };
        }
        // Alternativa para usuário local padrão
        if (email === 'admin@gclick.com') {
          const session = { user: { id: 'local-user', email } };
          writeSession(session);
          return { data: { session }, error: null };
        }
        return { data: null, error: { message: 'Invalid credentials' } };
      },
      signOut: async () => {
        writeSession(null);
        return { error: null };
      }
    }
  };
}
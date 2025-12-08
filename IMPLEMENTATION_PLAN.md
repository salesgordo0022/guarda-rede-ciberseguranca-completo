# Plano de Implementação - Sistema de Gerenciamento de Tarefas

## 📋 Visão Geral
Sistema completo de gerenciamento de tarefas com três níveis de permissão: **Admin**, **Gestor** e **Colaborador**.

## 🎯 Objetivos

### 1. Sistema de Permissões
- **Admin**: Acesso total ao sistema
- **Gestor**: Gerenciamento do departamento próprio
- **Colaborador**: Visualização e execução de tarefas atribuídas

### 2. Funcionalidades Principais
- Criação e delegação de tarefas
- Filtros avançados (data, status, responsável, departamento)
- Dashboard com métricas e gráficos
- Relatórios do dia
- Sistema de multas

## 🗄️ Estrutura do Banco de Dados

### Tabelas Necessárias

#### 1. Atualizar `profiles` (já existe)
```sql
- id (UUID)
- full_name (TEXT)
- department_id (UUID)
- role (TEXT) -> 'admin', 'gestor', 'colaborador'
- created_at
- updated_at
```

#### 2. Atualizar `tasks` (já existe)
```sql
- id (UUID)
- title (TEXT)
- description (TEXT)
- department_id (UUID) -> pode ser NULL
- assigned_to (UUID) -> referência ao usuário
- created_by (UUID)
- status (TEXT) -> 'não iniciado', 'em andamento', 'parado', 'feito'
- priority (TEXT) -> 'baixa', 'média', 'alta', 'urgente'
- deadline (DATE)
- schedule_start (DATE)
- schedule_end (DATE)
- schedule_status (TEXT) -> calculado
- has_fine (BOOLEAN)
- fine_amount (DECIMAL)
- fine_reason (TEXT)
- completed_at (TIMESTAMP)
- created_at
- updated_at
```

#### 3. Nova tabela `task_history`
```sql
- id (UUID)
- task_id (UUID)
- user_id (UUID)
- action (TEXT) -> 'criada', 'atualizada', 'concluída', 'delegada'
- old_values (JSONB)
- new_values (JSONB)
- created_at
```

#### 4. Nova tabela `task_comments`
```sql
- id (UUID)
- task_id (UUID)
- user_id (UUID)
- comment (TEXT)
- created_at
```

## 🎨 Componentes a Criar

### 1. Context/Hooks
- `useAuth.tsx` - Gerenciamento de autenticação e permissões
- `usePermissions.tsx` - Hook para verificar permissões
- `useTasks.tsx` - Hook para gerenciar tarefas

### 2. Páginas

#### Dashboard (`/`)
- Cards de métricas:
  - Vencem hoje
  - Sujeitas a multa
  - Multas geradas
  - Pendentes
- Gráficos:
  - Pizza: Distribuição de tarefas
  - Barras: Comparativo por status
  - Resumo por categoria

#### Tarefas (`/tasks`)
- Lista de tarefas com filtros
- Criação/edição de tarefas
- Delegação (para gestores)
- Visualização de histórico

#### Relatórios (`/reports`)
- Relatório do dia
- Tarefas concluídas
- Tarefas pendentes
- Tarefas atrasadas
- Exportação (PDF/Excel)

### 3. Componentes UI

#### `TaskCard.tsx`
- Exibição de tarefa individual
- Ações baseadas em permissão

#### `TaskFilters.tsx`
- Filtros por data, status, responsável, departamento

#### `TaskForm.tsx`
- Formulário de criação/edição
- Validação com Zod

#### `DashboardCard.tsx`
- Card de métrica reutilizável

#### `TaskChart.tsx`
- Gráficos usando Recharts

#### `PermissionGuard.tsx`
- Componente para controlar acesso

## 🔐 Sistema de Permissões

### Admin
```typescript
permissions: {
  tasks: {
    view: 'all',
    create: true,
    edit: 'all',
    delete: 'all',
    delegate: true
  },
  departments: {
    view: 'all',
    filter: true
  },
  reports: {
    view: 'all',
    export: true
  }
}
```

### Gestor
```typescript
permissions: {
  tasks: {
    view: 'department',
    create: true,
    edit: 'department',
    delete: 'own',
    delegate: 'department'
  },
  departments: {
    view: 'own',
    filter: false
  },
  reports: {
    view: 'department',
    export: true
  }
}
```

### Colaborador
```typescript
permissions: {
  tasks: {
    view: 'assigned',
    create: false,
    edit: 'assigned_status_only',
    delete: false,
    delegate: false
  },
  departments: {
    view: 'none',
    filter: false
  },
  reports: {
    view: 'own',
    export: false
  }
}
```

## 📊 Fluxo de Trabalho

### 1. Login
- Usuário faz login
- Sistema identifica role (admin/gestor/colaborador)
- Redireciona para dashboard apropriado

### 2. Dashboard
- **Admin**: Vê todas as tarefas, pode filtrar por departamento
- **Gestor**: Vê tarefas do seu departamento
- **Colaborador**: Vê apenas suas tarefas

### 3. Criação de Tarefa
- **Admin/Gestor**: Pode criar tarefas
1. ✅ Criar `TaskCard`
2. ✅ Criar `TaskFilters`
3. ✅ Criar `TaskForm`
4. ✅ Criar `DashboardCard`

### Fase 4: Páginas Principais (Prioridade Alta)
1. ✅ Atualizar Dashboard (`/`)
2. ✅ Atualizar página Tasks (`/tasks`)
3. ✅ Criar página Reports (`/reports`)

### Fase 5: Funcionalidades Avançadas (Prioridade Média)
1. ⏳ Sistema de multas
2. ⏳ Gráficos e visualizações
3. ⏳ Exportação de relatórios
4. ⏳ Notificações

### Fase 6: Polimento (Prioridade Baixa)
1. ⏳ Animações e transições
2. ⏳ Responsividade mobile
3. ⏳ Testes
4. ⏳ Documentação

## 📝 Notas Técnicas

### Stack Atual
- **Frontend**: React + TypeScript + Vite
- **UI**: Shadcn/ui + Tailwind CSS
- **Backend**: Supabase
- **Gráficos**: Recharts
- **Formulários**: React Hook Form + Zod
- **Roteamento**: React Router DOM

### Considerações
- Usar React Query para cache de dados
- Implementar loading states
- Tratamento de erros consistente
- Feedback visual para ações do usuário
- Validação de dados no frontend e backend

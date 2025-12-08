# 📋 SISTEMA DE TAREFAS - DOCUMENTAÇÃO

## 📌 ESTRUTURA DA TABELA DE TAREFAS

### Colunas da Tabela

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| **Tarefa** | TEXT | Nome da tarefa | "Material para Comprar" |
| **Responsável** | TEXT (opcional) | Nome da pessoa responsável | "Luciano Nascimento" ou "—" |
| **Status** | ENUM | Estado atual da tarefa | "Em andamento", "Feito", "Parado", "Não iniciado" |
| **Prazo** | DATE (opcional) | Data limite para conclusão | "27/11" ou "—" |
| **Cronograma** | DATE RANGE | Intervalo planejado | "nov 27–28" ou "—" |
| **Situação do Cronograma** | COMPUTED | Status calculado automaticamente | "✔ Dentro do prazo" ou "❗ Atrasado" |
| **Última Atualização** | TIMESTAMP | Tempo desde a última modificação | "1 semana atrás" |

---

## 🎯 STATUS DISPONÍVEIS

1. **Em andamento** - Tarefa sendo executada
2. **Feito** - Tarefa concluída
3. **Parado** - Tarefa pausada/bloqueada
4. **Não iniciado** - Tarefa ainda não começou

---

## ✅ SITUAÇÃO DO CRONOGRAMA

A situação é calculada automaticamente baseada em:

- **✔ Dentro do prazo**: Data atual ≤ Prazo E Data atual ≤ Fim do cronograma
- **❗ Atrasado**: Data atual > Prazo OU Data atual > Fim do cronograma
- **—**: Sem prazo ou cronograma definido

---

## 📊 EXEMPLO DE DADOS

```markdown
| Tarefa | Responsável | Status | Prazo | Cronograma | Situação do Cronograma | Última Atualização |
|--------|-------------|--------|-------|------------|------------------------|-------------------|
| Material para Comprar | Luciano Nascimento | Em andamento | 27/11 | nov 27–28 | ❗ Atrasado | 1 semana atrás |
| Liberação do Link | — | Feito | 28/11 | nov 29–30 | ✔ Dentro do prazo | 1 semana atrás |
| Impressão de Apostila | — | Parado | 29/11 | dez 1–2 | ❗ Atrasado | 1 semana atrás |
| Alimentação dos participantes | — | Não iniciado | — | — | — | 1 semana atrás |
| Configurar o Som 4 canais | — | Não iniciado | — | — | — | 1 semana atrás |
```

---

## 🚀 COMO USAR

### 1. Criar Nova Tarefa
1. Acesse a aba "Tarefas"
2. Clique em "Nova Tarefa"
3. Preencha os campos:
   - **Tarefa** (obrigatório)
   - **Responsável** (opcional)
   - **Status** (obrigatório)
   - **Prazo** (opcional)
   - **Início do Cronograma** (opcional)
   - **Fim do Cronograma** (opcional)
4. Clique em "Criar"

### 2. Editar Tarefa
1. Clique no ícone de lápis na linha da tarefa
2. Modifique os campos desejados
3. Clique em "Atualizar"

### 3. Excluir Tarefa
1. Clique no ícone de lixeira na linha da tarefa
2. Confirme a exclusão

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  responsible TEXT,
  status TEXT NOT NULL,
  deadline DATE,
  schedule_start DATE,
  schedule_end DATE,
  schedule_status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔧 MIGRAÇÃO DO BANCO

Para criar a tabela no Supabase, execute:

```bash
# Se estiver usando Supabase CLI
supabase db push

# Ou execute manualmente o arquivo:
# supabase/migrations/20241205_create_tasks_table.sql
```

---

## 📝 NOTAS IMPORTANTES

1. **Cálculo Automático**: A "Situação do Cronograma" é calculada automaticamente ao criar/editar
2. **Última Atualização**: Atualizada automaticamente via trigger do banco
3. **Validação**: O status só aceita os 4 valores predefinidos
4. **Campos Opcionais**: Responsável, Prazo e Cronograma podem ficar vazios (mostram "—")

---

## 🎨 CORES DOS STATUS

- **Em andamento**: Azul (`bg-blue-500`)
- **Feito**: Verde (`bg-green-500`)
- **Parado**: Vermelho (`bg-red-500`)
- **Não iniciado**: Cinza (`bg-gray-500`)

---

## 📱 ACESSO

Acesse a aba "Tarefas" no menu lateral do sistema para gerenciar suas tarefas.

**URL**: `http://localhost:8080/tasks`

# 🔧 Solução para o Erro do useAuth

## ❌ Problema
```
Error fetching profile: TypeError: supabase.from(...).select(...).eq is not a function
```

## 🔍 Causa
O sistema está usando um **mock client** do Supabase que não implementa todos os métodos corretamente. Isso acontece quando `VITE_USE_LOCAL_DB=true`.

## ✅ Solução

### Opção 1: Desabilitar Modo Mock (Recomendado)

1. **Crie o arquivo `.env.local`** na raiz do projeto:
```bash
# my-task-vision/.env.local
VITE_USE_LOCAL_DB=false
```

2. **Adicione suas credenciais do Supabase** (se ainda não tiver):
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-aqui
```

3. **Reinicie o servidor de desenvolvimento**:
```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

### Opção 2: Corrigir o Mock Client

Se você precisa usar o modo local, edite o arquivo:
`src/integrations/supabase/mock.ts`

Adicione os métodos faltantes ao mock.

## 📝 Arquivos Atualizados

### ✅ `src/hooks/useAuth.tsx`
- Adicionadas verificações de segurança
- Tratamento de erros melhorado
- Validação se métodos do Supabase existem

### 🔧 Como Verificar se Funcionou

Após aplicar a solução, você deve ver no console:
- ✅ Sem erros de "eq is not a function"
- ✅ Profile carregado corretamente
- ✅ Autenticação funcionando

## 🚀 Comandos Rápidos

```bash
# 1. Criar .env.local
echo "VITE_USE_LOCAL_DB=false" > .env.local

# 2. Adicionar credenciais (substitua pelos seus valores)
echo "VITE_SUPABASE_URL=https://seu-projeto.supabase.co" >> .env.local
echo "VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave" >> .env.local

# 3. Reiniciar servidor
# Pressione Ctrl+C e depois:
npm run dev
```

## 📋 Checklist

- [ ] Criar arquivo `.env.local`
- [ ] Adicionar `VITE_USE_LOCAL_DB=false`
- [ ] Adicionar credenciais do Supabase
- [ ] Reiniciar servidor de desenvolvimento
- [ ] Verificar se erros sumiram
- [ ] Testar login/autenticação

## 💡 Dica

Se você não tem as credenciais do Supabase:
1. Acesse https://supabase.com
2. Faça login no seu projeto
3. Vá em Settings → API
4. Copie a URL e a anon/public key

---

**Nota**: O arquivo `.env.local` está no `.gitignore` e não será commitado (segurança).

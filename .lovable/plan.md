# Análise e Plano de Melhorias — Health Coach

## Estado Atual da Aplicação

O Health Coach é uma aplicação robusta de acompanhamento de saúde com autenticação segura, criptografia AES-GCM dos dados, avaliação por IA, dashboard com gráficos e painel administrativo. A análise do código revela pontos de excelência e oportunidades concretas de melhoria.

---

## O que já está bem implementado

- Criptografia AES-GCM dos dados de bioimpedância nas Edge Functions
- Fluxo de senha padrão + troca obrigatória + reset via e-mail bem implementado
- TanStack Query já integrado no Dashboard para cache e revalidação
- Hook `useAvatarUpload` centralizado e reutilizado em `Dashboard` e `Profile`
- Interface `HealthRecord` centralizada em `src/types/health.ts`
- Animações com `framer-motion` nos cards e seções colapsáveis
- Rate limiting na função `reset-password`
- Alerta de inatividade (> 30 dias sem registro) no Dashboard
- Barra de força de senha já implementada no `ChangePassword`
- Indicador de progresso de metas no Dashboard

---

## Melhorias Identificadas e Priorizadas

### PRIORIDADE ALTA — Bugs e Problemas Funcionais

#### 1. Erro recorrente no salvamento de registros (o problema atual)

O `HealthRecordForm.tsx` mistura duas estratégias de validação de duplicatas: faz uma consulta prévia via `supabase.from("health_records")` **E** ainda mantém o código para lidar com erro 409 da Edge Function. O problema raiz é que o `supabase.functions.invoke` lança uma exceção para qualquer resposta não-2xx, consumindo o corpo da resposta antes que o código de tratamento possa lê-lo.

**Solução recomendada**: Manter apenas a pré-validação no cliente (que já funciona) e remover completamente a dependência do tratamento do erro 409, ou migrar completamente para `fetch` nativo com controle total da resposta.

#### 2. AdminPanel usa `useEffect` + `useState` ao invés de TanStack Query

`fetchUsers()` em `AdminPanel.tsx` é chamado manualmente via `useEffect`. O restante do app já usa `useQuery`. Isso gera inconsistência e falta de cache/loading states padronizados.

**Solução**: Migrar `fetchUsers` para `useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers })` e `fetchUsers` como `queryClient.invalidateQueries`.

---

### PRIORIDADE MÉDIA — UX e Funcionalidades

#### 5. Busca de texto no AdminPanel também funciona por nome, mas o placeholder diz apenas "e-mail"

O código já filtra por nome e por e-mail (`u.email... || u.name...`), mas o `placeholder` do input diz apenas "Buscar por e-mail...". Pequena inconsistência de UX.

**Solução**: Atualizar placeholder para "Buscar por nome ou e-mail...".

#### 6. Métricas de administrador incompletas

O card "Total com registros" em `AdminPanel.tsx` tem um comentário `// placeholder — real count would need a join query` e usa `users.length` como valor incorreto. O dado que está sendo mostrado é o total de usuários, não o total com registros.

**Solução**: Remover o card enganoso ou implementar a query correta que conta usuários com pelo menos 1 registro via a Edge Function ou uma query direta ao banco.

---

### PRIORIDADE BAIXA — Segurança e Manutenibilidade

#### 7. CORS wildcard (`*`) em todas as Edge Functions

Todas as 8 Edge Functions retornam `Access-Control-Allow-Origin: *`. Para um ambiente de produção, funções sensíveis como `create-user`, `delete-user` e `health-records-write` deveriam restringir ao domínio da aplicação.

**Solução**: Usar `Deno.env.get("APP_URL")` como valor do header `Access-Control-Allow-Origin` nas funções administrativas.

#### 8. Índice ausente na tabela `password_reset_tokens`

A coluna `token` em `password_reset_tokens` é pesquisada com `WHERE token = ?` sem índice declarado. Com volume alto, isso pode ser lento.

**Solução**: `CREATE INDEX ON password_reset_tokens(token)` via migration.

#### 9. `encrypt` / `decrypt` duplicados entre `health-records-write` e `health-records-read`

As funções `getKey`, `encrypt` e `decrypt` estão copiadas em dois arquivos de Edge Function. Se a lógica de criptografia precisar mudar, exige atualização em dois lugares.

**Solução**: Extrair para um módulo compartilhado em `supabase/functions/_shared/crypto.ts`.

---

## Resumo das Melhorias por Esforço

```text
ESFORÇO BAIXO (1 arquivo, < 20 linhas)
├── 5. Corrigir placeholder do campo de busca no AdminPanel
├── 6. Remover/corrigir card "Total com registros" enganoso
└── 8. Adicionar índice em password_reset_tokens.token

ESFORÇO MÉDIO (2-3 arquivos)
├── 1. Resolver definitivamente o erro de salvamento de registro duplicado
├── 2. Migrar AdminPanel para TanStack Query
├── 4. Persistir estado de seções colapsáveis no localStorage
└── 9. Extrair crypto helpers para módulo compartilhado

ESFORÇO ALTO (novo componente + Edge Function)
├── 3. Admin visualizar registros de saúde do usuário selecionado
└── 7. Restringir CORS ao domínio de produção
```

---

## Qual melhoria você quer implementar?

As melhorias mais impactantes para implementar agora seriam:

**Opção A — Corrigir o bug recorrente de salvamento** (item 1): resolver de vez o conflito entre pré-validação no cliente e tratamento de erro 409 na Edge Function.

**Opção B — Admin ver registros do usuário** (item 3): funcionalidade de alto valor para um coach de saúde que precisa acompanhar seus clientes.

**Opção C — Múltiplas melhorias pequenas** (itens 2, 4, 5, 6): várias melhorias de baixo/médio esforço que juntas melhoram significativamente a qualidade da aplicação.
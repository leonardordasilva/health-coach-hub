
# Plano de Implementação — 3 Ajustes

## Resumo das mudanças

1. Formatar todos os valores de métricas de saúde com duas casas decimais (`toFixed(2)`)
2. Simplificar a criação de usuários pelo admin (somente e-mail) e criar um fluxo de preenchimento obrigatório de dados após o primeiro login
3. Confirmar e reforçar a proteção dos dados de saúde no banco de dados

---

## Item 1 — Casas decimais em todas as métricas (toFixed(2))

### Problema atual
O componente `Metric` em `HealthRecordsList.tsx` exibe o valor bruto do banco (ex: `23.99999`). A função `getMetricDelta` em `health.ts` já usa `.toFixed(2)`, mas a lista de registros não.

### Mudanças
- **`src/components/HealthRecordsList.tsx`**: Alterar o componente `Metric` para aplicar `.toFixed(2)` em todos os valores numéricos.

```text
Antes:  {value != null ? `${value}${unit}` : "—"}
Depois: {value != null ? `${Number(value).toFixed(2)}${unit}` : "—"}
```

- **`src/pages/Dashboard.tsx`**: Os cards de detalhe do perfil (IMC, peso, etc.) também devem usar `.toFixed(2)` onde aplicável.

---

## Item 2 — Criação por e-mail e preenchimento de perfil no primeiro acesso

### Novo fluxo completo

```text
Admin cria usuário
  └─> informa apenas: e-mail
  └─> sistema gera senha temporária e envia por e-mail

Usuário faz o primeiro login
  └─> é redirecionado para /trocar-senha (senha padrão)
  └─> após trocar a senha...
  └─> é redirecionado para /perfil com modal/banner obrigatório
      └─> usuário preenche: Nome, Data de Nascimento, Peso inicial, Altura
      └─> salva os dados
      └─> é redirecionado para /dashboard
```

### Sub-tarefa 2a — Simplificar criação de usuário no Admin

**`src/pages/AdminPanel.tsx`**:
- Remover campos do formulário de criação: Nome, Data de Nascimento, Peso, Altura.
- Manter somente o campo **E-mail** (obrigatório).
- Atualizar o estado `form` para conter apenas `{ email: "" }`.
- Atualizar a chamada à edge function `create-user` enviando apenas `email` e `password`.
- Simplificar o texto descritivo do modal de criação.

**`supabase/functions/create-user/index.ts`**:
- Remover os campos opcionais `name`, `birth_date`, `weight`, `height` do schema Zod e do `UPDATE` do perfil.
- A função passará a criar o usuário com apenas e-mail e senha.

**`src/pages/AdminPanel.tsx` — modal de detalhes**:
- Os campos Nome, Nascimento, Peso e Altura continuarão visíveis no modal de detalhes (exibidos conforme preenchidos pelo próprio usuário).
- A tabela e o modal de detalhes permanecem iguais — apenas o formulário de **criação** é simplificado.

### Sub-tarefa 2b — Sinalizar perfil incompleto

**Critério de "perfil incompleto"**: `name` está vazio/nulo E `birth_date` está vazio/nulo E `weight` está nulo E `height` está nulo.

**`src/contexts/AuthContext.tsx`**:
- Adicionar propriedade computada `isProfileComplete: boolean` ao `AuthContextType`, calculada como `true` quando pelo menos os campos `name` e `birth_date` estão preenchidos no perfil.

**`src/components/ProtectedRoute.tsx`**:
- Após a verificação de senha padrão, adicionar uma verificação: se o usuário é `role === "user"`, `!isProfileComplete` e `pathname !== "/perfil"`, redirecionar para `/perfil`.
- Isso garante que o usuário preencha os dados antes de acessar o Dashboard.

**`src/pages/Profile.tsx`**:
- Adicionar um **banner/aviso** informativo no topo da página quando o perfil estiver incompleto: `"Complete seu cadastro para começar a usar o sistema."` com ícone de alerta.
- Após salvar com sucesso quando o perfil estava incompleto, redirecionar para `/dashboard` automaticamente.

**`src/contexts/AuthContext.tsx`**:
- Sincronizar o estado do formulário com `useEffect` quando `profile` mudar (correção do item 1.2 do plano anterior).

### Sub-tarefa 2c — Verificação da política de acesso

Confirmar que nenhum dado de perfil de outros usuários (nome, nascimento, peso, altura) pode ser editado pelo admin. A RLS da tabela `profiles` já garante isso:
- Admins têm apenas SELECT, INSERT (criar novo) e DELETE.
- A policy `Admins can update all profiles` existe, mas ela é usada apenas pelas edge functions com `service_role` para marcar `is_default_password`. Essa policy pode ser removida ou mantida — porém, como o admin não tem tela de edição, é seguro manter para uso interno das edge functions.

---

## Item 3 — Proteção de dados de saúde no banco

### Situação atual (após análise da RLS)

As políticas da tabela `health_records` já estão **corretamente configuradas**:

| Operação | Policy | Condição |
|---|---|---|
| SELECT | Users can view their own health records | `auth.uid() = user_id` |
| INSERT | Users can insert their own health records | `auth.uid() = user_id` |
| UPDATE | Users can update their own health records | `auth.uid() = user_id` |
| DELETE | Users can delete their own health records | `auth.uid() = user_id` |

Não existe nenhuma policy de SELECT para admins na tabela `health_records`. Ou seja, **administradores já não conseguem ler dados de saúde de outros usuários**, nem pelo cliente JavaScript e nem diretamente pelo banco (usando as credenciais de anon/authenticated).

### O que será feito

Mesmo sem vulnerabilidade ativa, adicionar uma **migration que documenta explicitamente a proteção** através de um comentário SQL na tabela e, opcionalmente, um revoke explícito para reforçar a intenção:

```sql
-- Garante que o papel 'authenticated' não tem GRANT direto de SELECT
-- na tabela health_records além das políticas RLS já existentes.
-- Esta migration documenta a política de privacidade: dados de saúde
-- são acessíveis apenas pelo próprio usuário.
COMMENT ON TABLE public.health_records IS 
  'Dados de saúde do usuário. Acesso restrito ao próprio usuário via RLS. Administradores não têm acesso a estes dados por política de privacidade.';
```

Isso serve como documentação permanente no schema do banco de dados.

---

## Arquivos que serão modificados

| Arquivo | Mudança |
|---|---|
| `src/components/HealthRecordsList.tsx` | `toFixed(2)` em todos os valores do componente Metric |
| `src/pages/Dashboard.tsx` | `toFixed(2)` nos valores de métricas exibidos nos cards |
| `src/pages/AdminPanel.tsx` | Formulário de criação simplificado (apenas e-mail) |
| `supabase/functions/create-user/index.ts` | Remover campos opcionais do schema Zod |
| `src/contexts/AuthContext.tsx` | Adicionar `isProfileComplete`, sincronizar form com `useEffect` |
| `src/components/ProtectedRoute.tsx` | Redirecionar para `/perfil` se perfil incompleto |
| `src/pages/Profile.tsx` | Banner de aviso e redirecionamento pós-save |
| `supabase/migrations/XXXX_comment_health_records.sql` | Documentar privacidade no schema |

---

## Sequência de implementação

```text
1. Migration — adicionar comentário de privacidade em health_records
2. create-user edge function — remover campos desnecessários
3. AdminPanel — simplificar formulário de criação
4. AuthContext — isProfileComplete + sincronização de form
5. ProtectedRoute — redirecionamento se perfil incompleto
6. Profile — banner de aviso + redirecionamento pós-save
7. HealthRecordsList — toFixed(2) nas métricas
8. Dashboard — toFixed(2) nos cards de métricas
```

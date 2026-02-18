# Análise e Sugestões de Melhoria — Health Coach

## Visão Geral da Aplicação

O Health Coach é um sistema de acompanhamento de saúde com:

- Autenticação com senhas temporárias, troca obrigatória e reset via e-mail
- Dashboard pessoal com gráficos de evolução, painel analítico e avaliação por IA
- Registros de saúde mensais com dados de bioimpedância (peso, gordura, músculo, etc.)
- Painel administrativo para gerenciar usuários
- Dados sensíveis criptografados (AES-GCM) na persistência

---

## Melhorias Identificadas

### 1. Experiência do Usuário (UX)

**A. Indicador de força de senha na tela de troca**  
A tela `ChangePassword.tsx` só valida o mínimo de 8 caracteres. Não há feedback visual de segurança. Uma barra de força (fraca/média/forte) com critérios visuais (maiúscula, número, símbolo) reduz rejeições e orienta o usuário sem mensagens de erro.

**C. Contador de registros na seção de Registros de Saúde**
O cabeçalho da seção não informa quantos registros existem. Adicionar `(N)` ou um badge ao lado do título dá contexto imediato.

**D. Animação de fade-in nos cards de registros**
Os cards já têm `animationDelay`, mas com `AnimatePresence` e `motion.div` individualmente poderiam ter entrada mais fluida ao filtrar por ano.

**E. Toast de confirmação ao excluir registro**
Já existe, mas não há opção de desfazer. Pequena melhoria de UX.

---

### 2. Funcionalidades Faltantes

**B. Dashboard admin com métricas agregadas**  
Além dos 3 cards (total, senha padrão, este mês), seria útil ter um gráfico de crescimento de usuários ao longo do tempo ou indicador de usuários com mais de N registros.

**D. Notificação de novo registro sugerido**
Se o usuário não adiciona registro há mais de 30 dias, um aviso no dashboard ("Seu último registro foi em X — que tal atualizar?") encoraja o uso contínuo.

**E. Meta de peso/gordura no perfil**
Permitir ao usuário definir uma meta (ex: peso alvo) e exibir no dashboard o progresso atual em relação a ela — com percentual de avanço.

---

### 3. Qualidade de Código e Manutenibilidade

**A. Interface `HealthRecord` duplicada em 4 arquivos**
`Dashboard.tsx`, `HealthRecordForm.tsx`, `HealthRecordsList.tsx` e `HealthAssessment.tsx` definem localmente a mesma interface `HealthRecord`. Mover para `src/types/health.ts` e importar de lá elimina inconsistências futuras.

**B. Lógica de avatar duplicada**
O upload de avatar existe tanto em `Dashboard.tsx` quanto em `Profile.tsx` com código idêntico. Extrair para um hook `useAvatarUpload()` ou componente `AvatarUpload` centraliza a lógica.

**C. Chamadas fetch brutas para Edge Functions**
`Dashboard.tsx` e `HealthAssessment.tsx` fazem `fetch` manual com construção de URL via `import.meta.env.VITE_SUPABASE_PROJECT_ID`. O SDK já tem `supabase.functions.invoke()` que é mais seguro, lida com headers automaticamente e não expõe a URL diretamente no bundle.

**D. `generatePassword()` definida em 3 lugares**
Em `src/lib/health.ts`, `supabase/functions/create-user/index.ts` e `supabase/functions/confirm-password-reset/index.ts`. No frontend é desnecessária (nunca deve gerar senha no cliente). Nas Edge Functions, extrair para um módulo compartilhado.

**E. `AdminPanel.tsx` gera senha no cliente**
Em `handleCreate`, chama `generatePassword()` no frontend e envia ao Edge Function. A senha deveria ser gerada apenas no servidor (já acontece no `create-user`, mas o cliente também gera uma e envia). O Edge Function deve ignorar o parâmetro `password` e sempre gerar internamente — como o `self-register` faz corretamente.

---

### 4. Segurança

**A. CORS com wildcard `*` em todas as Edge Functions**
Todas as funções retornam `Access-Control-Allow-Origin: *`. Para produção, restringir ao domínio real da aplicação (`APP_URL`) reduz a superfície de ataque. Funções como `create-user` e `delete-user` são especialmente sensíveis.

**B. `APP_URL` hardcoded no `reset-password**`
A URL de fallback `https://id-preview--...lovable.app` está hardcoded no código (linha 97). Se o domínio mudar, o link nos e-mails quebra silenciosamente. Usar exclusivamente a variável de ambiente `APP_URL`.

**C. Ausência de rate-limit no `self-register` e `reset-password**`
Qualquer pessoa pode chamar esses endpoints ilimitadamente, causando spam de e-mails ou enumeração de usuários (apesar da resposta neutra). Implementar throttle por IP ou por e-mail com tabela de cooldown no banco.

**D. Token de reset sem índice no banco**
A tabela `password_reset_tokens` faz buscas por `token` (coluna `text` sem índice declarado). Com volume alto, isso pode ser lento. Adicionar `CREATE INDEX ON password_reset_tokens(token)`.

---

### 5. Performance

**A. Busca de registros via fetch manual sem cache**
`fetchRecords()` é chamado diretamente e não usa TanStack Query (que já está instalado). Migrar para `useQuery` daria cache automático, revalidação em foco, loading states padronizados e evita chamadas duplicadas.

**B. `useMemo` desnecessário em `chartData` por não memoizar corretamente**
`chartData` depende de `records` e `selectedChartMetric`, mas `records` é um array re-criado a cada render. Com TanStack Query isso seria natural, mas sem ele convém garantir referências estáveis.

**C. Avatar sem lazy loading**
A imagem do avatar não tem `loading="lazy"`. Irrelevante com uma imagem, mas boa prática.

---

## Priorização Sugerida

```text
ALTA PRIORIDADE (impacto direto na qualidade e segurança)
├── 3A - Centralizar interface HealthRecord em src/types/health.ts
├── 3B - Extrair lógica de avatar para hook/componente reutilizável
├── 3E - Remover geração de senha no AdminPanel (cliente)
├── 4B - Remover APP_URL hardcoded no reset-password
└── 5A - Migrar fetch de registros para TanStack Query (useQuery)

MÉDIA PRIORIDADE (melhoria de UX e funcionalidade)
├── 1A - Indicador de força de senha
├── 1B - Persistir estado de colapso no localStorage
├── 1C - Contador de registros no cabeçalho da seção
├── 2A - Admin: visualizar registros do usuário selecionado
└── 2D - Aviso de registro desatualizado (>30 dias)

BAIXA PRIORIDADE (nice-to-have)
├── 2C - Exportação em JSON
├── 2E - Meta de peso/gordura no perfil
├── 4A - Restringir CORS ao domínio de produção
├── 4C - Rate-limit nos endpoints públicos
└── 4D - Índice na tabela password_reset_tokens
```

---

## O que NÃO está errado

- Fluxo de autenticação com senha padrão + troca obrigatória: bem implementado
- Criptografia AES-GCM dos dados de saúde: arquitetura correta
- Cache da avaliação IA no banco com snapshot de dados: elegante
- Animações framer-motion nos collapses: funcionam bem
- RLS nas tabelas sensíveis: adequado
- Separação de responsabilidades entre Edge Functions: boa

---

Qual dessas melhorias você gostaria de implementar primeiro?
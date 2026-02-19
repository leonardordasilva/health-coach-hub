# Análise e Plano de Melhorias — Health Coach (Ciclo 2)

## Estado Atual Verificado

Após revisão completa do código, o estado atual da aplicação está:

- `AdminPanel.tsx`: Migrado para TanStack Query, placeholder de busca corrigido, card enganoso removido
- `Dashboard.tsx`: Seções colapsáveis com persistência em `localStorage`, progresso de metas integrado no card de perfil
- `_shared/crypto.ts`: Módulo compartilhado em uso pelas duas Edge Functions
- `AppLayout.tsx`: Menu renomeado para "Bioimpedância" com ícone `ScanLine`

---

## Melhorias Identificadas Neste Ciclo

### PRIORIDADE ALTA

#### 1. Título da página "Dashboard Pessoal" desatualizado

O `h1` da página `Dashboard.tsx` ainda exibe **"Dashboard Pessoal"** e o subtítulo **"Acompanhe sua evolução de saúde"** — inconsistente com o novo nome do menu "Bioimpedância".

**Arquivo**: `src/pages/Dashboard.tsx` (linha 174)
**Mudança**: Atualizar título para **"Bioimpedância"** e subtítulo para **"Acompanhe sua composição corporal"**.

---

#### 3. Número de decimais excessivo nas métricas dos cards de registro

Em `HealthRecordsList.tsx`, a função `Metric` exibe os valores com `toFixed(2)` (ex: `70.00 kg`, `25.50%`). Isso ocupa espaço desnecessário e prejudica a legibilidade visual. O ideal para exibição em cards compactos seria 1 decimal (ex: `70.0 kg`, `25.5%`).

**Arquivo**: `src/components/HealthRecordsList.tsx` (linha 128)
**Mudança**: Alterar `toFixed(2)` para `toFixed(1)`.

---

### PRIORIDADE MÉDIA

#### 4. `HealthRecordDetail` redefine a interface `HealthRecord` localmente

O componente `src/components/HealthRecordDetail.tsx` declara sua própria interface `HealthRecord` (linhas 7–18) em vez de importar o tipo compartilhado de `src/types/health.ts`. Isso gera duplicação e risco de inconsistência futura.

**Arquivo**: `src/components/HealthRecordDetail.tsx`
**Mudança**: Remover a interface local e importar `import type { HealthRecord } from "@/types/health"`.

---

#### 5. `HealthRecordsList` deleta registros diretamente pelo cliente (sem Edge Function)

Em `HealthRecordsList.tsx` (linha 25), a exclusão de registros é feita diretamente via `supabase.from("health_records").delete()`. Isso é consistente com o RLS que permite ao usuário deletar seus próprios registros. Porém, ao contrário das operações de escrita e leitura que passam pela Edge Function (com decriptação/criptografia), esta ação não garante limpeza de cache no TanStack Query de forma coordenada.

O código atual chama `onDelete()` que invoca `queryClient.invalidateQueries()` — então o comportamento está correto. Este item é uma **observação de consistência**, não um bug.

---

#### 6. Admin: card "Senha padrão" sem link de ação rápida

O card de estatísticas exibe "Senha padrão: N", mas clicar nesse número não faz nada. Uma melhoria de UX seria filtrar automaticamente a tabela ao clicar no card, mostrando apenas usuários com senha padrão.

**Arquivo**: `src/pages/AdminPanel.tsx`
**Mudança**: Tornar o card de "Senha padrão" clicável — ao clicar, aplica um filtro adicional na tabela mostrando apenas `is_default_password === true`.

---

### PRIORIDADE BAIXA

#### 7. Título da aba do navegador (`<title>`) não é atualizado por rota

O `index.html` tem `<title>Health Coach</title>` fixo. Não há uso de `document.title` ou um componente de gestão de título nas páginas. Em aplicações SPA, o ideal é refletir a rota atual no título da aba para melhor usabilidade.

**Solução**: Usar um hook simples `useDocumentTitle("Bioimpedância | Health Coach")` em cada página, ou um componente utilitário leve que faz `document.title = title` via `useEffect`.

---

#### 8. Métricas no `HealthRecordDetail` sem formatação de 1 decimal

Similar ao item 3, o modal de detalhes (`HealthRecordDetail.tsx`, linha 90) exibe os valores com `{m.value}` sem formatação. Valores como `25.5000000001%` podem aparecer dependendo do dado armazenado. Aplicar `toFixed(1)` garante consistência visual.

**Arquivo**: `src/components/HealthRecordDetail.tsx` (linha 90)
**Mudança**: `{m.value != null ? \`{Number(m.value).toFixed(1)}{m.unit} : "—"}`.

---

## Resumo por Esforço

```text
ESFORÇO BAIXO (1 arquivo, < 5 linhas)
├── 1. Atualizar título/subtítulo da página de Bioimpedância
├── 3. Corrigir decimais nas métricas dos cards (toFixed(2) → toFixed(1))
├── 4. Remover interface HealthRecord duplicada em HealthRecordDetail
└── 8. Formatar decimais no modal de detalhe do registro

ESFORÇO MÉDIO (2-3 arquivos)
├── 6. Card "Senha padrão" com filtro rápido no AdminPanel
└── 7. Atualizar título da aba do navegador por rota

ESFORÇO ALTO (nova Edge Function + UI)
└── 2. Admin visualizar registros de bioimpedância de um usuário
```

---

## Implementação Proposta

Todos os itens acima serão implementados de uma vez, agrupados por arquivo:

`**src/pages/Dashboard.tsx**`

- Corrigir título e subtítulo (item 1)

`**src/components/HealthRecordsList.tsx**`

- `toFixed(2)` → `toFixed(1)` (item 3)

`**src/components/HealthRecordDetail.tsx**`

- Remover interface local, importar tipo compartilhado (item 4)
- Aplicar `toFixed(1)` nos valores exibidos (item 8)

`**src/pages/AdminPanel.tsx**`

- Card "Senha padrão" filtrável (item 6)

**Título da aba por rota** (item 7)

- Hook `useDocumentTitle` em cada página principal
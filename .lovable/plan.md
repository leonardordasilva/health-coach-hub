
# Plano de Implementação — 4 Melhorias da Aplicação

## Itens a implementar

1. Gráficos de evolução temporal
2. Campo de nome do usuário
4. Página de perfil editável
5. Exportação de dados em CSV

Item 3 (Admin ver dados de saúde) foi explicitamente descartado por questões de privacidade — correto.

---

## Item 2 — Campo de Nome do Usuário

Esta é a base para os outros itens, pois afeta banco de dados e interface.

### Banco de dados
- Adicionar coluna `name text nullable` na tabela `profiles` via migration SQL.
- Atualizar a edge function `create-user` para aceitar e salvar o campo `name` (adicionar ao schema Zod e ao `UPDATE` do perfil).

### Interface
- `AdminPanel.tsx`: adicionar campo "Nome" no formulário de criação de usuário; exibir nome na tabela e no modal de detalhes.
- `Dashboard.tsx`: exibir o nome (quando disponível) como título principal do card de perfil, em vez do e-mail.
- `AppLayout.tsx`: exibir o nome no rodapé do sidebar em vez de só o e-mail.
- `AuthContext.tsx`: adicionar campo `name` à interface `Profile`.

---

## Item 4 — Página de Perfil Editável

Nova página `/perfil` acessível apenas por usuários comuns.

### Arquivos novos/modificados
- **`src/pages/Profile.tsx`** (novo): formulário com campos Nome, Data de Nascimento, Peso inicial e Altura. Reutilizar a lógica de upload de avatar já existente no Dashboard (mover o upload para cá e remover do Dashboard, ou manter em ambos).
- **`src/App.tsx`**: adicionar rota `/perfil` protegida por `requiredRole="user"`.
- **`src/components/AppLayout.tsx`**: adicionar link "Perfil" no menu lateral (apenas para usuários) com ícone `UserCog`.

### RLS
A tabela `profiles` já possui a policy `Users can update their own profile`, portanto nenhuma migration adicional é necessária para o perfil.

---

## Item 1 — Gráficos de Evolução Temporal

Nova seção no Dashboard entre o Painel Analítico e os Registros de Saúde.

### Implementação
- **`src/pages/Dashboard.tsx`**: adicionar seção "Evolução" com um `LineChart` do `recharts` (já instalado).
- Seletor de métrica: Peso, Gordura Corporal, Músculo, Água, Proteína.
- Os dados usarão `filteredRecords` (já filtrado pelo ano selecionado), ordenados cronologicamente.
- Eixo X: mês/ano. Eixo Y: valor da métrica.
- O gráfico é responsivo usando `ResponsiveContainer` já disponível via `recharts`.

---

## Item 5 — Exportação CSV

Botão na seção "Registros de Saúde" do Dashboard.

### Implementação
- **`src/pages/Dashboard.tsx`**: adicionar botão "Exportar CSV" (ícone `Download`) ao lado do botão "Novo Registro".
- Função `exportToCSV()` que:
  1. Pega `filteredRecords` (registros do ano selecionado)
  2. Monta cabeçalho e linhas em formato CSV
  3. Cria um `Blob` com `text/csv;charset=utf-8`
  4. Gera URL temporária e aciona download automático
  5. Revoga a URL após o download
- Colunas exportadas: Data, Peso (kg), Gordura Corporal (%), Água (%), Músculo (kg), Proteína (%), Gordura Visceral, Metabolismo Basal (kcal), Massa Óssea (kg).

---

## Sequência de implementação

```text
1. Migration SQL — adiciona coluna `name` em `profiles`
2. Edge function `create-user` — aceita `name` no body
3. AuthContext — adiciona `name` à interface Profile
4. AppLayout — exibe nome no sidebar
5. Dashboard — exibe nome no card de perfil + gráfico + botão CSV
6. AdminPanel — campo nome no formulário e exibição nos detalhes
7. Profile page (nova) + rota em App.tsx
```

---

## Arquivos que serão criados ou modificados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/XXXX_add_name_to_profiles.sql` | Novo — adiciona coluna `name` |
| `supabase/functions/create-user/index.ts` | Editar — aceita `name` |
| `src/contexts/AuthContext.tsx` | Editar — `name` na interface |
| `src/components/AppLayout.tsx` | Editar — exibe nome + link Perfil |
| `src/pages/Dashboard.tsx` | Editar — nome, gráfico, CSV |
| `src/pages/AdminPanel.tsx` | Editar — campo nome no form e detalhes |
| `src/pages/Profile.tsx` | Novo — página de perfil editável |
| `src/App.tsx` | Editar — rota `/perfil` |

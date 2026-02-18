
## Remover Exportação CSV

### O que será removido

Apenas a funcionalidade de exportação CSV. O filtro de ano e a lista de registros permanecem intactos.

### Alterações em `src/pages/Dashboard.tsx`

**1. Import de ícones (linha 8)**
- Remover `Download` da lista de imports de `lucide-react`

**2. Função `exportToCSV` (linhas 188–217)**
- Remover completamente a função e o comentário `// CSV Export`

**3. Botão "Exportar CSV" no JSX (linhas 438–446)**
- Remover o `<Button>` com o ícone `Download` e o texto "Exportar CSV"

### Sem alterações no banco de dados
Nenhuma tabela ou migração é afetada.

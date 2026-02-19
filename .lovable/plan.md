

# Internacionalizar a aplicacao Health Coach

## Objetivo

Adicionar suporte a 3 idiomas (Portugues BR, Ingles, Espanhol) em toda a aplicacao, com portugues como padrao. O usuario podera trocar o idioma a qualquer momento atraves de um seletor visual.

## Abordagem tecnica

Criar um sistema de internacionalizacao (i18n) leve e sem dependencias externas, usando React Context + arquivos de traducao JSON.

### Estrutura de arquivos

```text
src/
  i18n/
    locales/
      pt.ts    -- todas as strings em portugues (padrao)
      en.ts    -- todas as strings em ingles
      es.ts    -- todas as strings em espanhol
    index.ts   -- LanguageContext, useLanguage hook, t() function
```

### Componentes do sistema

1. **LanguageContext** (`src/i18n/index.ts`)
   - Context React com estado do idioma atual
   - Hook `useLanguage()` retorna `{ language, setLanguage, t }`
   - Funcao `t(key)` busca a string traduzida pela chave
   - Idioma salvo em `localStorage` (chave `hc_language`) para persistir entre sessoes
   - Padrao: `pt`

2. **Seletor de idioma** (`src/components/LanguageSelector.tsx`)
   - Dropdown compacto com bandeiras/siglas: PT | EN | ES
   - Posicionado no header da landing page e no sidebar/header do AppLayout
   - Aparecera tambem nas telas de login, esqueci-senha, trocar-senha e confirmar-reset

3. **Arquivos de traducao** -- conterao todas as strings da aplicacao organizadas por area:
   - `common` -- botoes genericos (Salvar, Cancelar, Voltar, Sair, etc.)
   - `landing` -- hero, features, steps, CTA, footer
   - `login` -- formulario de login, registro, email existente, sucesso
   - `forgotPassword` -- recuperacao de senha
   - `confirmReset` -- status de confirmacao de reset
   - `changePassword` -- troca obrigatoria de senha, criterios de forca
   - `profile` -- formulario de perfil, dados pessoais, metas
   - `dashboard` -- bioimpedancia, painel analitico, graficos, registros
   - `admin` -- painel de usuarios, modais, tabela
   - `healthForm` -- formulario de registro de saude
   - `healthRecords` -- lista de registros
   - `healthDetail` -- detalhes do registro
   - `healthAssessment` -- avaliacao por IA
   - `notFound` -- pagina 404
   - `appLayout` -- sidebar, menu mobile
   - `auth` -- spinner de carregamento

## Arquivos a criar

| Arquivo | Descricao |
|---|---|
| `src/i18n/locales/pt.ts` | Todas as strings em portugues |
| `src/i18n/locales/en.ts` | Todas as strings em ingles |
| `src/i18n/locales/es.ts` | Todas as strings em espanhol |
| `src/i18n/index.ts` | Context, Provider, hook e funcao t() |
| `src/components/LanguageSelector.tsx` | Componente seletor de idioma |

## Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Envolver com `LanguageProvider` |
| `src/pages/Landing.tsx` | Substituir strings hardcoded por `t()` |
| `src/pages/Login.tsx` | Substituir strings por `t()` |
| `src/pages/ForgotPassword.tsx` | Substituir strings por `t()` |
| `src/pages/ConfirmReset.tsx` | Substituir strings por `t()` |
| `src/pages/ChangePassword.tsx` | Substituir strings por `t()` |
| `src/pages/Profile.tsx` | Substituir strings por `t()` |
| `src/pages/Dashboard.tsx` | Substituir strings por `t()` |
| `src/pages/AdminPanel.tsx` | Substituir strings por `t()` |
| `src/pages/NotFound.tsx` | Substituir strings por `t()` |
| `src/components/AppLayout.tsx` | Substituir strings por `t()`, adicionar seletor de idioma |
| `src/components/HealthRecordForm.tsx` | Substituir strings por `t()` |
| `src/components/HealthRecordsList.tsx` | Substituir strings por `t()` |
| `src/components/HealthRecordDetail.tsx` | Substituir strings por `t()` |
| `src/components/HealthAssessment.tsx` | Substituir strings por `t()` |
| `src/lib/health.ts` | Funcoes `calculateBMI` e `calculateBodyType` receberao idioma para classificacoes traduzidas, e funcoes de formatacao de data usarao locale dinamico |

## Detalhes de implementacao

### LanguageContext

```typescript
type Language = "pt" | "en" | "es";

// t("login.title") retorna a string traduzida
// Suporta interpolacao simples: t("dashboard.daysAgo", { days: 30 })
```

### Seletor de idioma

- Componente com 3 botoes compactos (PT / EN / ES) ou dropdown
- Estilizado com os mesmos padroes visuais da aplicacao
- Sem bandeiras (mais simples e sem dependencias de imagem)

### Locale de datas

As funcoes `formatDate`, `formatDateTime`, `formatMonthYear` em `health.ts` e os toLocaleDateString no Dashboard passarao a receber o locale:
- `pt` -> `pt-BR`
- `en` -> `en-US`
- `es` -> `es-ES`

### Classificacoes do IMC e tipo de corpo

As funcoes `calculateBMI` e `calculateBodyType` retornam classificacoes em portugues. Serao ajustadas para aceitar um parametro de idioma ou as classificacoes serao mapeadas via arquivo de traducao.

### Strings com interpolacao

Alguns textos possuem valores dinamicos (ex: "Faltam 3.5 kg"). O sistema t() suportara substituicao simples com placeholders: `t("dashboard.remaining", { value: "3.5", unit: "kg" })`.

### Toast messages

Mensagens de toast (sonner) tambem serao traduzidas usando `t()`.

## Sem novas dependencias

O sistema sera 100% custom, sem bibliotecas como react-i18next ou similar, mantendo o bundle leve.

## Volume estimado de strings

Aproximadamente 250-300 strings a traduzir nos 3 idiomas.


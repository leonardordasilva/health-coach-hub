<h1 align="center">
  <br>
  💚 Health Coach
  <br>
</h1>

<p align="center">
  Plataforma de acompanhamento de composição corporal com avaliação de saúde por inteligência artificial
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</p>

---

## 📖 Sobre o projeto

O **Health Coach** é uma aplicação web voltada para profissionais de saúde e nutrição que precisam acompanhar a composição corporal de seus alunos/pacientes ao longo do tempo.

A plataforma permite o registro e visualização de dados de **bioimpedância** (peso, gordura corporal, músculo, água, proteína, gordura visceral, metabolismo basal e massa óssea), com cálculos automáticos de IMC, tipo de corpo e idade corporal, além de **avaliação de saúde gerada por IA** com base nos dados registrados.

O sistema possui dois perfis de acesso: **administrador** (profissional de saúde) e **aluno** (paciente/cliente).

---

## ✨ Funcionalidades

### 👤 Aluno

| Funcionalidade | Descrição |
|---|---|
| **Login seguro** | Autenticação por e-mail e senha |
| **Primeiro acesso** | Troca de senha obrigatória e preenchimento do perfil |
| **Perfil completo** | Nome, data de nascimento, peso, altura, sexo biológico e foto de avatar |
| **Metas pessoais** | Metas de peso e percentual de gordura com barras de progresso |
| **Registros de bioimpedância** | Peso, gordura corporal, água, músculo, proteína, gordura visceral, metabolismo basal e massa óssea |
| **Cálculos automáticos** | IMC, tipo de corpo e idade corporal calculados automaticamente |
| **Gráficos de evolução** | Visualização por métrica com filtro por ano |
| **Painel analítico** | Evolução total e evolução nos últimos 30 dias |
| **Avaliação por IA** | Análise do registro atual ou do histórico completo via Gemini 2.5 Flash |
| **Alerta de inatividade** | Notificação quando há mais de 30 dias sem novo registro |

### 🛠️ Administrador

| Funcionalidade | Descrição |
|---|---|
| **Painel de usuários** | Listagem completa de todos os alunos cadastrados |
| **Criação de usuário** | Cadastro com envio automático de senha temporária por e-mail |
| **Reset de senha** | Redefinição de senha de qualquer usuário |
| **Exclusão de usuário** | Remoção de usuário do sistema |
| **Gráfico de crescimento** | Evolução mensal de novos cadastros (últimos 6 meses) |
| **Filtros e busca** | Filtro por status de senha padrão e busca por nome ou e-mail |

---

## 🧰 Stack tecnológica

### Frontend

| Tecnologia | Uso |
|---|---|
| [React 18](https://react.dev/) | Framework principal |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Vite](https://vitejs.dev/) | Build tool e dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização utilitária |
| [shadcn/ui](https://ui.shadcn.com/) | Componentes de interface |
| [Framer Motion](https://www.framer.com/motion/) | Animações |
| [Recharts](https://recharts.org/) | Gráficos e visualizações |
| [TanStack Query](https://tanstack.com/query) | Gerenciamento de estado assíncrono |
| [React Router DOM](https://reactrouter.com/) | Roteamento SPA |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Formulários e validação |

### Backend

| Tecnologia | Uso |
|---|---|
| [PostgreSQL](https://www.postgresql.org/) (via Supabase) | Banco de dados relacional |
| [Supabase Auth](https://supabase.com/docs/guides/auth) | Autenticação de usuários |
| [Supabase Storage](https://supabase.com/docs/guides/storage) | Armazenamento de avatares |
| [Deno Edge Functions](https://supabase.com/docs/guides/functions) | Lógica de backend serverless |
| [Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) | IA para avaliação de saúde |
| [Brevo](https://www.brevo.com/) | Envio de e-mails transacionais |

---

## 🏗️ Arquitetura — Edge Functions

O backend é composto por funções serverless em Deno, cada uma responsável por uma operação específica:

| Função | Descrição |
|---|---|
| `create-user` | Cria um novo usuário (admin), gera senha temporária e envia por e-mail via Brevo |
| `self-register` | Permite auto-cadastro do aluno com fluxo de senha temporária |
| `reset-password` | Inicia o fluxo de redefinição de senha (gera token e envia e-mail) |
| `confirm-password-reset` | Valida o token e aplica a nova senha |
| `health-records-read` | Leitura dos registros de bioimpedância do usuário |
| `health-records-write` | Criação, edição e exclusão de registros de bioimpedância |
| `health-assessment` | Avaliação de saúde via IA com sistema de cache no banco de dados |
| `delete-user` | Exclusão completa de um usuário (admin) |

---

## 📁 Estrutura de pastas

```
health-coach/
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   └── ui/             # Componentes base (shadcn/ui)
│   ├── contexts/           # Contextos React (AuthContext)
│   ├── hooks/              # Hooks customizados
│   ├── integrations/       # Cliente e tipos do Supabase
│   ├── lib/                # Utilitários e cálculos de saúde
│   ├── pages/              # Páginas da aplicação
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Profile.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── ChangePassword.tsx
│   │   └── ...
│   └── types/              # Tipos TypeScript compartilhados
├── supabase/
│   └── functions/          # Edge Functions (Deno)
│       ├── create-user/
│       ├── health-assessment/
│       ├── health-records-read/
│       ├── health-records-write/
│       └── ...
└── public/
```

---

## 🚀 Como executar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/) ou [bun](https://bun.sh/)

### Passos

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITÓRIO>
cd health-coach

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente (veja a seção abaixo)
cp .env.example .env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`.

---

## 🔐 Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Supabase (Lovable Cloud)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon
VITE_SUPABASE_PROJECT_ID=seu-project-id
```

As seguintes variáveis devem ser configuradas como **secrets nas Edge Functions**:

```
SUPABASE_SERVICE_ROLE_KEY   # Chave de serviço do Supabase
BREVO_API_KEY               # Chave da API do Brevo (e-mails)
LOVABLE_API_KEY             # Chave da API do Lovable (IA)
```

---

## 🗄️ Banco de dados

O esquema principal é composto pelas seguintes tabelas:

| Tabela | Descrição |
|---|---|
| `profiles` | Dados do perfil do usuário (nome, altura, peso, metas, avatar) |
| `user_roles` | Papel do usuário no sistema (`admin` ou `user`) |
| `health_records` | Registros de bioimpedância |
| `health_assessment_cache` | Cache das avaliações de saúde geradas por IA |
| `password_reset_tokens` | Tokens para redefinição de senha |

Todas as tabelas possuem **Row Level Security (RLS)** habilitado para garantir isolamento e segurança dos dados por usuário.

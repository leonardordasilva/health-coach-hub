
# Criar README.md para o GitHub

## Objetivo

Substituir o README genérico atual por um documento profissional que apresente a aplicação Health Coach de forma clara e atrativa para o GitHub.

## Conteúdo do novo README

Com base na análise completa do código, o README cobrirá:

### Seções planejadas

1. **Badge de tecnologias** — React, TypeScript, Tailwind, Vite
2. **Sobre o projeto** — descrição clara da aplicação: plataforma de acompanhamento de composição corporal (bioimpedância) com avaliação de saúde por IA
3. **Funcionalidades principais** divididas por perfil:
   - Aluno: dashboard de bioimpedância, histórico de registros, avaliação de saúde com IA, metas de peso e gordura corporal, perfil com foto
   - Admin: painel de usuários, cadastro/exclusão/reset de senha, gráfico de crescimento de usuários
4. **Stack tecnológica** — frontend e backend
5. **Arquitetura** — descrição das funções backend (create-user, self-register, reset-password, confirm-password-reset, health-records-read/write, health-assessment)
6. **Como executar localmente** — clone, install, dev
7. **Variáveis de ambiente** — quais são necessárias
8. **Estrutura de pastas** — overview do projeto
9. **Capturas de tela** — placeholder visual descritivo
10. **Licença**

## Arquivo a modificar

- `README.md` — substituição completa do conteúdo atual (que é o template padrão do Lovable)

## Detalhes do conteúdo a incluir

### Funcionalidades mapeadas no código

**Aluno (role: user)**
- Login com e-mail e senha
- Cadastro por auto-registro (senha temporária por e-mail via Brevo)
- Troca de senha obrigatória no primeiro acesso
- Perfil: nome, data de nascimento, peso, altura, sexo biológico, foto de avatar
- Metas de peso e percentual de gordura com barras de progresso
- Registros de bioimpedância: peso, gordura corporal, água, músculo, proteína, gordura visceral, metabolismo basal, massa óssea
- Cálculos automáticos: IMC, tipo de corpo, idade corporal
- Gráficos de evolução com seleção de métrica e filtro por ano
- Painel analítico: evolução total e evolução recente
- Avaliação de saúde por IA (Gemini 2.5 Flash) — registro atual ou histórico geral
- Cache de avaliações por usuário no banco
- Alerta de inatividade (> 30 dias sem registro)

**Admin (role: admin)**
- Painel de gerenciamento de usuários
- Criação de usuário com envio de senha temporária por e-mail
- Reset de senha
- Exclusão de usuário
- Gráfico de crescimento mensal (últimos 6 meses)
- Filtro por status de senha padrão
- Busca por nome ou e-mail

### Stack tecnológica

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, TanStack Query, React Router DOM, React Hook Form + Zod

**Backend (Lovable Cloud / Supabase)**: PostgreSQL, Supabase Auth, Storage (avatares), Edge Functions (Deno), IA via Lovable AI Gateway (Gemini 2.5 Flash), e-mail via Brevo

## Estilo

- README em português do Brasil (idioma da aplicação)
- Badges no topo com shields.io
- Seções bem organizadas com emojis e tabelas
- Tom profissional mas acessível

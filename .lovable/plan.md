
# Landing Page para o Health Coach

## Objetivo

Criar uma nova rota `/landing` como pagina inicial publica da aplicacao, apresentando os recursos do Health Coach com visual atrativo e botoes para login/criar conta.

## Estrutura da pagina

A landing page tera as seguintes secoes:

1. **Hero** — titulo principal, subtitulo descritivo e dois botoes (Entrar / Criar conta) com o logo do Health Coach
2. **Recursos principais** — grid com cards apresentando as funcionalidades:
   - Registro de bioimpedancia (peso, gordura, musculo, agua, etc.)
   - Calculos automaticos (IMC, tipo de corpo, idade corporal)
   - Graficos de evolucao com filtros por metrica e ano
   - Avaliacao de saude por IA (Gemini)
   - Metas de peso e gordura corporal com progresso visual
   - Perfil completo com foto e dados pessoais
3. **Como funciona** — 3 passos simples (Crie sua conta, Registre seus dados, Acompanhe sua evolucao)
4. **CTA final** — chamada para acao com botao de criar conta

## Navegacao

- A rota `/` (AuthRedirect) sera mantida como esta — redireciona usuarios autenticados
- A landing page sera acessivel em `/landing`
- O login tera um link "Saiba mais" apontando para `/landing`
- A landing page tera botoes que direcionam para `/login` (com view de login ou registro)

## Arquivos a criar/modificar

### Criar
- `src/pages/Landing.tsx` — componente completo da landing page

### Modificar
- `src/App.tsx` — adicionar rota `/landing` (publica, sem ProtectedRoute)
- `src/pages/Login.tsx` — adicionar link discreto "Saiba mais sobre o Health Coach" apontando para `/landing`

## Detalhes tecnicos

- Usara os mesmos utilitarios CSS existentes (`gradient-hero`, `text-gradient`, `shadow-health`)
- Icones do Lucide ja instalado (Heart, Activity, Target, TrendingUp, Brain, User, etc.)
- Framer Motion para animacoes sutis de entrada nas secoes
- Componentes shadcn/ui existentes (Button, Card)
- Layout totalmente responsivo (mobile-first)
- Sem necessidade de autenticacao ou banco de dados
- Sem novas dependencias

## Visual

- Fundo com decoracoes circulares (mesmo padrao da tela de login)
- Cards com `gradient-card` e `shadow-health`
- Botoes primarios com `gradient-hero`
- Paleta emerald/sky blue existente
- Header fixo com logo e botao de login

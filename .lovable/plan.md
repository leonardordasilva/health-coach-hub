

# Redirecionar rota raiz para a Landing Page

## Problema

Atualmente, ao acessar a URL publicada (`/`), o componente `AuthRedirect` verifica se o usuario esta autenticado. Se nao estiver, redireciona para `/login`. Isso faz com que visitantes nunca vejam a landing page.

## Solucao

Alterar o `AuthRedirect` para que, quando o usuario nao estiver autenticado, redirecione para `/landing` em vez de `/login`.

Usuarios autenticados continuarao sendo redirecionados normalmente (admin para `/admin`, user para `/dashboard`, senha padrao para `/trocar-senha`).

## Arquivo a modificar

- `src/App.tsx` -- linha 37: trocar `Navigate to="/login"` por `Navigate to="/landing"`

## Mudanca

```typescript
// Antes
if (!user) return <Navigate to="/login" replace />;

// Depois
if (!user) return <Navigate to="/landing" replace />;
```

## Fluxo resultante

- Visitante acessa `/` --> ve a landing page
- Na landing page, clica em "Entrar" ou "Criar conta" --> vai para `/login`
- Usuario autenticado acessa `/` --> redirecionado para `/dashboard` ou `/admin`


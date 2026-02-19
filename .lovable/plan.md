

# Encerrar sessão ao fechar o navegador

## Problema

Atualmente, a sessão do usuário persiste em `localStorage`, fazendo com que o login permaneça ativo mesmo após fechar o navegador.

## Solução

Como o arquivo do cliente Supabase é gerado automaticamente e não pode ser editado, a abordagem será usar `sessionStorage` como indicador de sessão ativa do navegador.

- `sessionStorage` é automaticamente limpo quando o navegador fecha
- `localStorage` persiste entre sessões

### Lógica

1. Ao inicializar o `AuthContext`, verificar se existe um flag `hc_session_active` no `sessionStorage`
2. Se **não existir** (navegador acabou de abrir), fazer `signOut()` para limpar qualquer sessão antiga do `localStorage`, e só depois inicializar normalmente
3. Após o login bem-sucedido ou após detectar sessão válida, setar o flag no `sessionStorage`

### Fluxo resultante

```text
Usuário fecha o navegador
  -> sessionStorage é limpo automaticamente
  -> Ao reabrir, flag não existe
  -> App faz signOut() na inicialização
  -> Usuário vê a landing page
  -> Precisa fazer login novamente
```

## Arquivo a modificar

- `src/contexts/AuthContext.tsx` — ajustar a função `initializeAuth` para verificar o flag de sessão e fazer signOut quando necessário

## Detalhe técnico

Na função `initializeAuth` dentro do `useEffect`:

1. Antes de chamar `getSession()`, verificar `sessionStorage.getItem("hc_session_active")`
2. Se não existir, chamar `supabase.auth.signOut()` para invalidar a sessão persistida
3. Após verificação, setar `sessionStorage.setItem("hc_session_active", "true")`
4. Continuar o fluxo normal de `getSession()` e `fetchProfile()`

Isso garante que:
- Fechar o navegador = sessão encerrada
- Recarregar a página (F5) = sessão mantida (sessionStorage sobrevive a refresh)
- Fechar apenas uma aba = sessão mantida (sessionStorage persiste enquanto houver abas do mesmo domínio)


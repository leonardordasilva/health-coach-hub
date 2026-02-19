
# Traduzir mensagens de erro do Supabase para pt-BR

## Problema identificado

Na tela `/trocar-senha`, quando o Supabase rejeita uma senha por ser considerada fraca ou comum, ele retorna a mensagem em inglês:

> "Password is known to be weak and easy to guess, please choose a different one."

O código atual (linha 77) exibe o `err.message` diretamente, sem tradução:
```typescript
const message = err instanceof Error ? err.message : "Erro ao alterar senha.";
toast.error(message);
```

## Solução

Criar um mapeamento de erros conhecidos do Supabase Auth para suas equivalentes em pt-BR. A função de tradução verifica se a mensagem contém termos-chave e retorna a tradução adequada, com fallback genérico em português.

### Mapeamento de erros a cobrir

| Mensagem original (Supabase) | Tradução pt-BR |
|---|---|
| "Password is known to be weak and easy to guess..." | "A senha escolhida é muito comum ou fraca. Por favor, escolha uma senha diferente." |
| "Password should be at least..." | "A senha deve ter pelo menos 8 caracteres." |
| "New password should be different from the old password." | "A nova senha deve ser diferente da senha atual." |
| Qualquer outro erro | "Erro ao alterar senha. Tente novamente." |

## Arquivo a modificar

- `src/pages/ChangePassword.tsx` — apenas o bloco `catch` (linha 76-79), adicionando uma função auxiliar `translateAuthError()` antes do componente.

## Mudança técnica

```typescript
// Função auxiliar para traduzir erros do Supabase Auth
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("weak") || lower.includes("easy to guess") || lower.includes("known to be")) {
    return "A senha escolhida é muito comum ou fraca. Por favor, escolha uma senha diferente.";
  }
  if (lower.includes("at least")) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (lower.includes("different from the old password")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  return "Erro ao alterar senha. Tente novamente.";
}

// No catch:
} catch (err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  toast.error(translateAuthError(raw));
}
```

## O que não muda

- Layout e visual da tela
- Lógica de força de senha
- Navegação pós-sucesso
- Toda a integração com o backend

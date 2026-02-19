
# Migração de SendGrid para Brevo

## O que precisa ser feito

O sistema atual usa o SendGrid para envio de e-mails em 4 funções de backend. A migração para o Brevo requer:

1. **Configurar a chave de API do Brevo** como segredo no backend (a chave `SENDGRID_API_KEY` existente será substituída por `BREVO_API_KEY`)
2. **Atualizar as 4 funções de backend** que fazem chamadas de e-mail

---

## Diferenças entre a API do SendGrid e do Brevo

| Aspecto | SendGrid | Brevo |
|---|---|---|
| Endpoint | `https://api.sendgrid.com/v3/mail/send` | `https://api.brevo.com/v3/smtp/email` |
| Autenticação | Header: `Authorization: Bearer KEY` | Header: `api-key: KEY` |
| Remetente | `from: { email, name }` | `sender: { email, name }` |
| Destinatário | `to: [{ email }]` | `to: [{ email }]` (igual) |
| Corpo HTML | `content: [{ type: "text/html", value: "..." }]` | `htmlContent: "..."` |
| Assunto | `subject: "..."` | `subject: "..."` (igual) |

---

## Funções de backend a atualizar

### 1. `supabase/functions/create-user/index.ts`
- E-mail de boas-vindas para novo usuário criado pelo admin
- Substitui bloco `sendgridKey` → `brevoKey`
- Adapta payload para formato Brevo

### 2. `supabase/functions/self-register/index.ts`
- E-mail de boas-vindas para auto-cadastro
- Mesmo ajuste de payload

### 3. `supabase/functions/reset-password/index.ts`
- E-mail com link de confirmação de reset de senha
- Mesmo ajuste de payload

### 4. `supabase/functions/confirm-password-reset/index.ts`
- E-mail com nova senha temporária gerada após confirmação
- Mesmo ajuste de payload

---

## Configuração de segredo necessária

Antes de atualizar o código, será solicitado ao usuário que insira sua **Brevo API Key** (gerada em `app.brevo.com → Settings → API Keys`). O segredo será armazenado como `BREVO_API_KEY`.

O segredo `SENDGRID_API_KEY` pode ser mantido inativo (não será removido automaticamente) — o código simplesmente deixará de referenciá-lo.

---

## Detalhes técnicos

### Formato do payload Brevo (exemplo)
```json
{
  "sender": { "email": "lrodriguesdasilva@gmail.com", "name": "Health Coach" },
  "to": [{ "email": "usuario@exemplo.com" }],
  "subject": "Bem-vindo ao Health Coach!",
  "htmlContent": "<div>...</div>"
}
```

### Helper compartilhado
Como as 4 funções têm lógica de envio idêntica, cada uma terá uma função auxiliar `sendEmail()` interna para evitar duplicação de código.

---

## Arquivos a modificar

- `supabase/functions/create-user/index.ts`
- `supabase/functions/self-register/index.ts`
- `supabase/functions/reset-password/index.ts`
- `supabase/functions/confirm-password-reset/index.ts`

## O que não muda

- Conteúdo HTML dos e-mails
- Endereço remetente (`lrodriguesdasilva@gmail.com`)
- Lógica de geração de senha e tokens
- Toda a lógica de autenticação e autorização
- Rate limiting
- Políticas de segurança do banco de dados

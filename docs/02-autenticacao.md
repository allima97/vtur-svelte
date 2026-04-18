# 02 — Autenticação, Perfil e Onboarding

> Status: ✅ **Completo**  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Páginas implementadas

| Rota | Arquivo | Status |
|---|---|---|
| `/auth/login` | `src/routes/auth/login/+page.svelte` | ✅ |
| `/auth/register` | `src/routes/auth/register/+page.svelte` | ✅ |
| `/auth/recuperar-senha` | `src/routes/auth/recuperar-senha/+page.svelte` | ✅ |
| `/auth/nova-senha` | `src/routes/auth/nova-senha/+page.svelte` | ✅ |
| `/auth/mfa` | `src/routes/auth/mfa/+page.svelte` | ✅ |
| `/auth/convite` | `src/routes/auth/convite/+page.svelte` | ✅ |
| `/auth/logout` | `src/routes/auth/logout/+server.ts` | ✅ |
| `/perfil` | `src/routes/(app)/perfil/+page.svelte` | ✅ |
| `/perfil/onboarding` | `src/routes/(app)/perfil/onboarding/+page.svelte` | ✅ |
| `/perfil/mfa` | `src/routes/(app)/perfil/mfa/+page.svelte` | ✅ |
| `/perfil/escala` | `src/routes/(app)/perfil/escala/+page.svelte` | ✅ |
| `/perfil/personalizar` | `src/routes/(app)/perfil/personalizar/+page.svelte` | ✅ |

---

## 2. APIs de suporte implementadas

| Endpoint | Método | Função |
|---|---|---|
| `/api/v1/convites/send` | POST | Enviar convite corporativo (sem e-mail Supabase) |
| `/api/v1/convites/accept` | POST | Aceitar convite com token |
| `/api/v1/user/profile` | GET/POST | Dados do perfil do usuário |
| `/api/v1/user/context` | GET | Contexto de sessão (tipo, empresa, módulos) |
| `/api/v1/admin/auth/mfa-status` | GET | Status MFA por usuário |
| `/api/v1/admin/auth/reset-mfa` | POST | Resetar MFA de usuário |
| `/api/v1/admin/auth/set-password` | POST | Definir senha (admin) |
| `/api/v1/welcome-email` | POST | E-mail de boas-vindas |

---

## 3. Fluxo de convite corporativo

O vtur-app usa convites sem e-mail do Supabase (para evitar e-mails automáticos indesejados):

```
1. Admin/gestor chama POST /api/v1/convites/send
2. Backend gera token manual → salva em tabela (users + token)
3. Sistema envia e-mail via nodemailer com link /auth/convite?token=XXX
4. Usuário acessa link → página /auth/convite valida token
5. Usuário define senha → conta ativada
```

**Regra:** nunca usar `supabase.auth.admin.inviteUserByEmail()` diretamente — usa `generateLink` + e-mail do sistema.

---

## 4. MFA TOTP

```
1. Login normal com senha
2. Se empresa tem mfa_obrigatorio=true → redireciona /auth/mfa
3. Usuário insere código TOTP
4. Backend valida via supabase.auth.mfa.verify()
5. Se válido → sessão completa + redirect para dashboard
```

**Verificação de obrigatoriedade:** tabela `companies.mfa_obrigatorio` + `companies.mfa_obrigatorio_tipos` (array de tipos de usuário).

---

## 5. Onboarding obrigatório

Campos obrigatórios no primeiro acesso:
- `nome_completo` — nome completo do usuário
- `telefone` — telefone de contato
- `cidade` — cidade de trabalho
- `estado` — UF
- `uso_individual` — flag se é uso individual (vendedor autônomo)

**Regra:** se `users.onboarding_completo = false` → `hooks.server.ts` redireciona para `/perfil/onboarding`.

---

## 6. `must_change_password`

Se `users.must_change_password = true` → após login, redireciona para `/perfil?force_password=1`.

---

## 7. `hooks.server.ts` — middleware de sessão

```typescript
// src/hooks.server.ts — lógica principal
export const handle = sequence(
  setupSupabase,    // cria supabase client em locals
  setupSession,     // valida sessão, popula locals.session
  redirectGuard,    // redireciona não-autenticados para /auth/login
  onboardingGuard,  // redireciona para onboarding se incompleto
  mfaGuard,         // redireciona para MFA se obrigatório
);
```

---

## 8. Gaps / Pendências

Nenhum gap crítico. Módulo considerado completo.

**Observações:**
- Página `/auth/mfa 2` do vtur-app (variante de setup de MFA) está consolidada na `/perfil/mfa` do svelte — verificar paridade de fluxo de ativação inicial vs verificação de login.
- Verificar se `must_change_password` está sendo checado em `hooks.server.ts` ou apenas na página de perfil.

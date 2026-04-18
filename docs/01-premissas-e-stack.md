# 01 — Premissas e Stack

> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Premissas não-negociáveis

| # | Regra |
|---|---|
| 1 | **Banco é único.** Mesmo Supabase, mesmas tabelas, mesmas RPCs, mesma RLS. Nenhuma migration nova sem já existir no vtur-app. |
| 2 | **Nomenclatura é sagrada.** Tabela, coluna, parâmetro RPC, módulo (`modulo_acesso.modulo`), papel (`user_types.name`), chave de cache, endpoint (`/api/v1/...`), cookie — copiados, nunca reinventados. |
| 3 | **`vtur-app` é read-only.** Zero edições, zero commits, zero alterações de arquivo. Fonte de verdade de referência apenas. |
| 4 | **Contratos de API congelados.** Todo endpoint `/api/v1/*` aceita os mesmos payloads e devolve os mesmos campos que o vtur-app. |
| 5 | **Regras de negócio verificadas.** Toda regra rastreada até o arquivo original antes de implementar. |
| 6 | **Melhorias não quebram regra.** Todo ganho de UX/performance passa por checklist de QA. |

---

## 2. Stack técnica

### Framework e UI
```
vtur-app  → Astro 6.0.5 (SSR) + React 18 + PrimeReact 10 + PrimeFlex + Tailwind
vtur-svelte → SvelteKit + Svelte 5 (runes) + Flowbite-Svelte + Tailwind
```

### BFF (Backend-for-Frontend)
```
vtur-app  → Hono 4 montado em src/api/apiApp.ts → /api/v1/*
vtur-svelte → SvelteKit +server.ts nativos em src/routes/api/v1/**
```
> Não há mais Hono no vtur-svelte — cada rota é um `+server.ts` com handlers `GET`/`POST` diretos.

### Autenticação
```
vtur-app  → @supabase/ssr em middleware Astro
vtur-svelte → @supabase/ssr em hooks.server.ts do SvelteKit
```

### Deploy
```
Ambos → Cloudflare Workers via adapter-cloudflare
KV: SESSION (mesmos IDs de namespace)
Cron: 0 3 * * * UTC (mesmo wrangler.toml)
```

---

## 3. Padrões de código no vtur-svelte

### Autenticação em +server.ts
```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = locals.session;
  if (!session?.user) throw error(401, 'Não autenticado');
  // ...
  return json(data);
};
```

### Acesso ao Supabase
```typescript
// Cliente com sessão do usuário (RLS ativo)
const supabase = locals.supabase;

// Cliente admin (service role, bypassar RLS)
import { createSupabaseAdminClient } from '$lib/server/supabase/admin';
const admin = createSupabaseAdminClient(platform.env);
```

### Verificação de permissão de módulo
```typescript
import { checkModuloAccess } from '$lib/server/auth/permissoes';
const podeVer = await checkModuloAccess(supabase, user.id, 'dashboard', 'view');
if (!podeVer) throw error(403, 'Sem acesso');
```

### Componentes Svelte 5 (runes)
```svelte
<script lang="ts">
  let { data } = $props();
  const items = $derived(data.items ?? []);
  let loading = $state(false);
</script>
```

---

## 4. Tabelas críticas e seus módulos

| Tabela | Módulo principal | Status |
|---|---|---|
| `vendas` | Vendas | ✅ |
| `vendas_recibos` | Vendas / Conciliação | ✅ |
| `vendas_pagamentos` | Vendas / Financeiro | ✅ |
| `clientes` | Clientes | ✅ |
| `cliente_acompanhantes` | Clientes / Operação | ✅ |
| `quote` / `quote_item` | Orçamentos | ✅ |
| `tipo_produtos` / `produtos` | Cadastros / Vendas | ✅ |
| `fornecedores` | Cadastros | ✅ |
| `viagens` | Operação | ✅ |
| `viagem_acompanhantes` | Operação | ✅ |
| `conciliacao_recibos` | Conciliação | ✅ |
| `conciliacao_recibo_changes` | Conciliação | ✅ |
| `modulo_acesso` | Auth / Permissões | ✅ |
| `user_types` | Admin | ✅ |
| `companies` | Admin / Master | ✅ |
| `master_empresas` | Master | ✅ |
| `gestor_vendedor` | Gestor | ✅ |
| `metas_vendedor` | Metas | ✅ |
| `commission_rule` | Comissões | ✅ |
| `parametros_comissao` | Parâmetros | ✅ |
| `agenda_itens` | Agenda | ✅ |
| `consultorias_online` | Consultoria | ❌ |
| `system_documentation` | Documentação | ❌ |

---

## 5. RPCs usadas (nunca renomear)

```sql
-- Auth / Usuários
gestor_equipe_vendedor_ids(uid uuid)
clientes_resolve_import(...)
rpc_vendas_kpis(...)
rpc_dashboard_consultorias(...)

-- Comissão
calcular_comissao_venda(...)

-- Conciliação
-- (processamento client-side, sem RPCs dedicadas)
```

---

## 6. Nomes de módulos em `modulo_acesso` (sagrados)

```
dashboard
vendas
clientes
conciliacao  (também: "Conciliação")
operacao     (também: "Operação")
consultoria_online
financeiro
relatorios   (também: "Relatórios")
admin
master
```

---

## 7. Papéis de usuário em `user_types.name` (sagrados)

```
ADMIN
MASTER
GESTOR
VENDEDOR
FINANCEIRO
```
> `uso_individual = true` → sempre tratado como VENDEDOR, independente do tipo.

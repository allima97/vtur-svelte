# Plano de Migração — vtur-app → vtur-svelte

> **Versão:** 2026-04-18  
> **Status geral:** ~92% concluído  
> **Fonte de verdade:** sempre `vtur-app` (read-only)

---

## Objetivo

Recriar o `vtur-app` (Astro 6 + React 18 + PrimeReact + Hono + Supabase) no `vtur-svelte` (SvelteKit + Svelte 5 + Flowbite-Svelte + Supabase) **preservando 100% da regra de negócio**, usando o mesmo banco de dados Supabase compartilhado.

---

## Stack — de / para

| Camada | vtur-app (legado) | vtur-svelte (alvo) |
|---|---|---|
| Framework | Astro 6 SSR | SvelteKit + Svelte 5 (runes) |
| UI | PrimeReact 10 + PrimeFlex | Flowbite-Svelte + Tailwind |
| Ícones | PrimeIcons + lucide-react | lucide-svelte |
| BFF | Hono 4 em `src/api/apiApp.ts` | SvelteKit `+server.ts` nativos |
| Auth SSR | `@supabase/ssr` middleware Astro | `@supabase/ssr` em `hooks.server.ts` |
| Deploy | Cloudflare Workers | Cloudflare Workers |

---

## Inventário atual

| Item | vtur-app | vtur-svelte | Cobertura |
|---|---|---|---|
| APIs (`+server.ts`) | 172 | 196 | ~114% — svelte tem mais |
| Páginas | 105 | 114 | ~109% — svelte tem mais |
| Tabelas Supabase | 135 | 135 (mesmo banco) | 100% |

---

## Status por módulo

| Módulo | Status | Arquivo de detalhe |
|---|---|---|
| Auth + Perfil | ✅ Completo | [02-autenticacao.md](./02-autenticacao.md) |
| Dashboard por papel | ⚠️ Gap — sem rota `/dashboard/*` | [03-dashboard.md](./03-dashboard.md) |
| Vendas | ✅ Completo | [04-vendas-e-conciliacao.md](./04-vendas-e-conciliacao.md) |
| Conciliação | ✅ Completo (falta `update-valores`) | [04-vendas-e-conciliacao.md](./04-vendas-e-conciliacao.md) |
| Clientes | ✅ Completo | [05-clientes-e-orcamentos.md](./05-clientes-e-orcamentos.md) |
| Orçamentos | ✅ Completo | [05-clientes-e-orcamentos.md](./05-clientes-e-orcamentos.md) |
| Roteiros | ⚠️ Gap — APIs faltando | [05-clientes-e-orcamentos.md](./05-clientes-e-orcamentos.md) |
| Operação / Viagens | ✅ Completo | [06-operacao-e-viagens.md](./06-operacao-e-viagens.md) |
| Financeiro | ✅ Completo | [07-financeiro-e-relatorios.md](./07-financeiro-e-relatorios.md) |
| Relatórios | ✅ Completo | [07-financeiro-e-relatorios.md](./07-financeiro-e-relatorios.md) |
| Admin | ✅ Completo (falta Documentação) | [08-admin-e-master.md](./08-admin-e-master.md) |
| Master | ✅ Completo | [08-admin-e-master.md](./08-admin-e-master.md) |
| Cadastros Base | ✅ Completo | [08-admin-e-master.md](./08-admin-e-master.md) |
| Chat | ❌ Não implementado | [09-extras-e-rollout.md](./09-extras-e-rollout.md) |
| Consultoria Online | ❌ Não implementado | [09-extras-e-rollout.md](./09-extras-e-rollout.md) |
| Documentação | ❌ Gap — sem admin/documentacao | [09-extras-e-rollout.md](./09-extras-e-rollout.md) |

---

## Gaps críticos (prioridade alta)

1. **Dashboard por papel** — vtur-app tem `/dashboard/geral`, `/vendedor`, `/gestor`, `/financeiro`, `/admin`, `/master`, `/logs`, `/permissoes`; vtur-svelte tem apenas o dashboard root (`/`)
2. **Roteiros** — 7 APIs ausentes (`/api/v1/roteiros/*`)
3. **Conciliação `update-valores`** — endpoint POST faltando
4. **`/api/v1/financeiro/ajustes-vendas/save`** — faltando (list existe)
5. **Documentação admin** — 4 rotas faltando (`admin/documentacao/*`)
6. **`/api/v1/reference-data`** — endpoint de referência global faltando
7. **Chat** — módulo completo ausente
8. **Consultoria Online** — módulo completo ausente

---

## Regras obrigatórias (nunca violar)

1. `vtur-app` é read-only — nunca modificar
2. Mesmo banco Supabase — nunca criar migrations novas sem verificar no legado
3. Nomenclatura sagrada — tabelas, colunas, RPCs, módulos idênticos ao legado
4. Contratos de API congelados — mesmos payloads e shapes de resposta
5. Regras de negócio verificadas — toda lógica rastreada até o arquivo original

---

## Documentos deste plano

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | [00-plano-geral.md](./00-plano-geral.md) | Este arquivo — visão geral e índice |
| 01 | [01-premissas-e-stack.md](./01-premissas-e-stack.md) | Premissas, stack, padrões de código |
| 02 | [02-autenticacao.md](./02-autenticacao.md) | Auth, MFA, convites, onboarding, perfil |
| 03 | [03-dashboard.md](./03-dashboard.md) | Dashboard por papel, widgets, KPIs |
| 04 | [04-vendas-e-conciliacao.md](./04-vendas-e-conciliacao.md) | Vendas, recibos, conciliação, importação |
| 05 | [05-clientes-e-orcamentos.md](./05-clientes-e-orcamentos.md) | Clientes, orçamentos, roteiros |
| 06 | [06-operacao-e-viagens.md](./06-operacao-e-viagens.md) | Viagens, dossies, vouchers, documentos |
| 07 | [07-financeiro-e-relatorios.md](./07-financeiro-e-relatorios.md) | Financeiro, comissões, relatórios |
| 08 | [08-admin-e-master.md](./08-admin-e-master.md) | Admin, master, cadastros, permissões |
| 09 | [09-extras-e-rollout.md](./09-extras-e-rollout.md) | Chat, consultoria, documentação, QA, rollout |
| 10 | [10-paridade-fiel-vtur-app.md](./10-paridade-fiel-vtur-app.md) | Releitura fiel por módulo, com foco em regra de negócio e amarrações cruzadas |

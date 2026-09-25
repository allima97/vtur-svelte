# Progresso da modernização do vturapp

> Arquivo de retomada. Atualizado a cada etapa, junto com o documento `fase2-hono-execucao.md` do projeto no Claude.
> Regra de ouro: **nenhuma mudança de regra de negócio**. Toda etapa é provada com teste de paridade ou contrato antes de ir para a pasta.

_Última atualização: 24/09/2026, 21:40_

## Onde paramos
- **Fase 2.5 concluída e gravada:** dashboard, relatórios, clientes e financeiro agora rodam no Hono (47 rotas).
- **Próximo passo:** Fase 2.6, migrar os domínios restantes da API (ver lista abaixo), começando por `admin`, `orcamentos`, `parametros`, `roteiros` e `viagens`.

## Pendências do usuário
1. Apagar `src/lib/vendasRateio.ts` (Fase 2.3).
2. Rodar `npm test` (253 testes) e `npm run api:inventory`.
3. Fazer commit/push das Fases 2.2 (conciliação), 2.3, 2.4 e 2.5.
4. Em produção, conferir as telas:
   - Vendas: nova, editar, mesclar, importar contrato.
   - Conciliação.
   - Dashboard.
   - Relatórios, inclusive os links antigos `vendas-por-*` e `ranking-vendas`.
   - Clientes.
   - Financeiro: caixa, comissões, ajustes, formas de pagamento.
5. Pendências antigas:
   - Rodar `supabase/manual/2026-09-24_read_model_cleanup.sql` depois do deploy (pedir aprovação).
   - Confirmar o build do Cloudflare com `npm run cf:build` e os secrets `CRON_SECRET`/`WORKER_BASE_URL`.

## Fases
| Fase | Status | Resumo |
|---|---|---|
| 0: read model v4 | ✅ commit | Triggers de dirty em produção, rebuild v4, correções. |
| 1: paridade | ✅ commit | Inventário de APIs, testes de caracterização, auditoria em `logs` (Vendas). |
| 2.1: Hono base | ✅ commit | App Hono em `/api/v1`, `x-request-id`, `server-timing`, catch-all. |
| 2.2: vendas + conciliação | ✅ vendas com commit · ⏳ conciliação sem commit | 40 rotas, corpo idêntico, testes de roteamento. |
| 2.3: regras únicas | ⏳ sem commit | `isFormaNaoComissionavel` e carregador de termos únicos; rateio duplicado removido. |
| 2.4: formulário de venda | ⏳ sem commit | 24 funções de nova/editar em `lib/features/vendas/form.ts`, com teste de paridade congelado. |
| 2.5: dashboard, relatórios, clientes, financeiro | ⏳ sem commit | 47 rotas no Hono. |
| 2.6: demais domínios | ⬜ próximo | Ver lista abaixo. |
| 3: telas/UX (Flowbite) | ⬜ | Inclui "Atualizado há X min" (`rebuiltAt` faltando no dashboard/summary). |

## API no Hono
**Migrados:**
- `health`
- `vendas` (22)
- `conciliacao` (18)
- `dashboard` (11)
- `relatorios` (13; `_legacyForward.ts` continua em `routes/`)
- `clientes` (13)
- `financeiro` (10)

**Ficaram no SvelteKit** porque não dá para copiar do computador arquivos com mais de 7 níveis de pasta. Funcionam normalmente, já que o SvelteKit prefere a rota específica:
- `clientes/[id]/acompanhantes/[acompanhanteId]`
- `financeiro/comissoes/regras/[id]`
- `admin/tipos-usuario/[id]/permissoes`

**Restantes:**
- 15 rotas: `admin`
- 14 rotas: `orcamentos`
- 12 rotas: `parametros`
- 10 rotas: `roteiros`
- 9 rotas: `viagens`
- 8 rotas: `preferencias`
- 5 rotas cada: `agenda`, `documentos-viagens`, `operacao`, `produtos`
- 4 rotas cada: `cards`, `mural`, `todo`, `vouchers`
- 3 rotas cada: `fornecedores`, `pagamentos`, `tarefas`
- 2 rotas cada: `cidades`, `circuitos`, `consultorias`, `convites`, `crm`, `cron`, `debug`, `push`, `user`
- 1 rota cada: `client-error`, `debug-comissao`, `documentacao`, `enderecos`, `equipe`, `importar-vendas`, `menu`, `paises`, `profile`, `qr`, `read-model`, `subdivisoes`, `tipo-produtos`, `users`, `voucher-assets`, `welcome-email`
- Fora de `/api/v1`: `src/routes/api/auth`

**Como migrar:** ver `scripts/migracao-hono/README.md`.

## Problemas conhecidos (não corrigidos, fora do escopo atual)
- `svelte-check`: 2 erros pré-existentes (`roteiroAereoImport.ts:1008`, `dashboard/summary` sem `rebuiltAt`).
- Tabela `push_subscriptions` não existe no banco.
- Auditoria em `logs` só cobre Vendas. Faltam login, Clientes, Cadastros, Parâmetros, Escalas, Admin e perfil.

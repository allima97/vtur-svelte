# Progresso da modernização do vturapp

> Arquivo de retomada. Atualizado a cada etapa, junto com o documento `fase2-hono-execucao.md` do projeto no Claude.
> Regra de ouro: **nenhuma mudança de regra de negócio**. Toda etapa é provada com teste de paridade ou contrato antes de ir para a pasta.

_Última atualização: 24/09/2026, 23:55. Trabalho feito no Mac (`~/Documents/GitHub/vturapp`)._

## Onde paramos
- **Fase 2 concluída para `/api/v1`:** as 252 rotas de `/api/v1` rodam no Hono (`docs/api-inventory.md`: 252 de 261 endpoints). Os 9 restantes são o catch-all e `src/routes/api/auth`.
- **Fase 2.6, lote 3, gravado no Mac e sem commit:** 34 rotas dos domínios pequenos, mais as 3 rotas profundas que tinham ficado no SvelteKit.
- **Decisão do usuário (24/09/2026):** as rotas de login e autenticação em `src/routes/api/auth` (login, convite, set-session, turnstile e passkeys) **não serão migradas**. Elas continuam no SvelteKit, sem alteração.
- **Fase 3.1 gravada no Mac, sem commit:**
  - o "Dados atualizados há X" do dashboard passou a funcionar;
  - o `svelte-check` agora não tem nenhum erro.
- **Próximo passo:** Fase 3.2, com acessibilidade e consistência no kit de componentes `$lib/components/ui` (ver plano da Fase 3 abaixo).

## Pendências do usuário
1. No Mac: `npm test` (605 testes), depois commit/push do lote 3 e da Fase 3.1. O `docs/api-inventory.*` já foi atualizado.
2. Em produção, conferir:
   - Lote 3: cadastros de cidades, países, subdivisões, tipos de produto e circuitos; consultorias (inclusive o .ics); convites (enviar e aceitar); CRM (biblioteca e assinatura); perfil e assinatura; menu; CEP; equipe; QR; vouchers (assets); e-mail de boas-vindas; aniversariantes.
   - As 3 rotas profundas: permissões por tipo de usuário, regra de comissão por id e acompanhante de cliente.
   - Cron: nos logs do Worker, confirmar que o `scheduled` continua chamando `/api/v1/read-model/rebuild` com sucesso (200). `cron/alerta-comissao` e `cron/lembretes-consultoria` continuam exigindo o segredo.
3. Pendências antigas:
   - Rodar `supabase/manual/2026-09-24_read_model_cleanup.sql` depois do deploy (pedir aprovação).
   - Confirmar o build do Cloudflare com `npm run cf:build` e os secrets `CRON_SECRET`/`WORKER_BASE_URL`.

## Fases
| Fase | Status | Resumo |
|---|---|---|
| 0: read model v4 | ✅ commit | Triggers de dirty em produção, rebuild v4, correções. |
| 1: paridade | ✅ commit | Inventário de APIs, testes de caracterização, auditoria em `logs` (Vendas). |
| 2.1: Hono base | ✅ commit | App Hono em `/api/v1`, `x-request-id`, `server-timing`, catch-all. |
| 2.2: vendas + conciliação | ✅ commit | 40 rotas. |
| 2.3: regras únicas | ✅ commit | `isFormaNaoComissionavel` e carregador de termos únicos; rateio duplicado removido. |
| 2.4: formulário de venda | ✅ commit | 24 funções de nova/editar em `lib/features/vendas/form.ts`. |
| 2.5: dashboard, relatórios, clientes, financeiro | ✅ commit | 47 rotas. |
| 2.6: demais domínios | ✅ lotes 1 e 2 com commit ("fase4", "fase5") · ⏳ lote 3 sem commit | 71 + 55 + 37 rotas. |
| 2.7: `api/auth` | 🚫 não migrar (decisão do usuário) | Login, convite, sessão, turnstile e passkeys continuam no SvelteKit. |
| 3.1: indicação de atualização + `svelte-check` sem erros | ⏳ sem commit | Ver seção Fase 3. |
| 3.2 a 3.5: telas/UX | ⬜ | Ver plano abaixo. |

## API no Hono
Todas as rotas de `src/routes/api/v1/**` são pontes (`apiHandler`), com os routers em `src/lib/server/api/routes/<dominio>/index.ts` e o registro em `src/lib/server/api/app.ts`.

**Detalhes que precisam ser lembrados:**
- **Arquivos-apelido** (`export { GET } from '../outra/+server'`): o gerador não os migra. É preciso registrar o mesmo handler no caminho do apelido, antes das rotas `/:param`, e trocar o arquivo por uma ponte. Se isso não for feito, a ponte responde 404. Apelidos tratados: `orcamentos/interaction` → `interacao`, `viagens/list` → raiz, `documentos-viagens/list` → `operacao/documentos-viagens`.
- **`cards`:** os módulos de `aniversario.svg`, `render.png` e `render.svg` usam `-` no nome do arquivo, para o Vite não tratá-los como asset. As URLs não mudam.
- **Helpers que continuam em `routes/`:** `conciliacao/_legacy.ts`, `conciliacao/_types.ts`, `relatorios/_legacyForward.ts`, `preferencias/_shared.ts`, `mural/_shared.ts` e `cards/_render.ts`. Os módulos importam esses helpers por caminho relativo.
- **`RequestHandler` usado em outro ponto** (ex.: `Parameters<RequestHandler>[0]` em `documentacao`): o import de `./$types` vira o de `@sveltejs/kit`. É só tipo, e o comportamento não muda.
- **405 preservado:** a ponte só exporta os métodos da rota original, então o SvelteKit responde 405 antes de chegar ao Hono. Os testes de "método inexistente" evitam métodos que, chamados direto no Hono, cairiam numa rota `/:id` do mesmo nível.
- **Rotas profundas:** passam de 7 níveis de pasta e não dá para copiá-las pelas ferramentas de arquivo. São lidas e gravadas pelo shell do Mac, com conferência de hash antes de gravar.
- **Cron:** `scripts/patch-worker-scheduled.js` chama `GET /api/v1/read-model/rebuild` com `x-cron-secret`. No teste local, sem o segredo ou com o segredo errado a resposta é 401, e com o segredo certo a chamada chega ao handler.

**Como migrar:** ver `scripts/migracao-hono/README.md`.

**Ambiente:** o shell remoto do Mac roda em Linux e não consegue usar a `node_modules` do Mac (os binários são de macOS). Os testes rodam na cópia de trabalho do Claude, e antes de gravar ele confere, arquivo por arquivo, que o `src/` do Mac é idêntico a ela. Pelo shell remoto, usar só `git --no-optional-locks status/log`, nunca comandos que gravam no `.git`.

## Fase 3: telas, navegação, acessibilidade e velocidade (sem mudar regra de negócio)

**Situação encontrada:**
- 126 páginas em `src/routes/(app)`.
- Nenhuma página importa `flowbite-svelte` diretamente: todas usam o kit próprio `$lib/components/ui` (Button, Card, Dialog, DataTable, Tabs, Dropdown, campos de formulário etc.), e 19 desses componentes usam Flowbite por baixo.
- **Consequência:** a melhoria de layout e acessibilidade é feita no kit, e vale para todas as telas de uma vez, sem reescrever página por página.

**3.1 (feito):**
- **"Dados atualizados há X" no dashboard:** nunca aparecia, porque a RPC `dashboard_vendas_summary_from_read_model` não devolve `rebuilt_at`. Agora a data vem de `ranking_read_model_status` (modelo v4), consultada em paralelo com a RPC. Mostra a reconstrução mais antiga entre os meses e empresas exibidos, em min, h ou dias, com a data completa ao passar o mouse. Se a consulta falhar, o dashboard continua funcionando, só sem a indicação. Nenhuma mudança no banco.
- **`svelte-check`:**
  - a propriedade `rebuiltAt` entrou no tipo `VendasKpiDashboardSummary`;
  - em `roteiroAereoImport.ts`, o `numero_voo` ficou fora do tipo intermediário. É só tipo: esse campo nunca era lido e a saída já usa `''`.
- **Verificação:** 605 testes, build OK e `svelte-check` com 0 erros.

**Plano (próximas etapas):**
- **3.2 Kit `ui`:** acessibilidade e consistência:
  - rótulos e `aria-*` em campos, Dialog, Dropdown, Tabs e DataTable;
  - foco visível e navegação por teclado;
  - contraste no modo escuro;
  - estados de carregando, vazio e erro padronizados.
  - Validação: testes de componente e revisão visual.
- **3.3 Navegação:** menu lateral, breadcrumbs, voltar e atalhos. Os itens e as permissões do menu não mudam.
- **3.4 Velocidade:** com o header `server-timing`, medir a API de cada tela e atacar as mais lentas (cache, chamadas em paralelo), sem mudar os resultados. Prova com testes de contrato.
- **3.5 Telas gigantes:** dividir em componentes, sem mudar o comportamento. As maiores são `financeiro/conciliacao` (3113 linhas), `orcamentos/roteiros/[id]` (2764), `operacao/vouchers/novo` (1605) e `vendas/[id]/editar` (1388).

## Problemas conhecidos (não corrigidos, fora do escopo atual)
- Tabela `push_subscriptions` não existe no banco (`push/subscribe` e `push/unsubscribe`).
- Auditoria em `logs` só cobre Vendas. Faltam login, Clientes, Cadastros, Parâmetros, Escalas, Admin e perfil.
- `importar-vendas` responde 410 (descontinuado) desde antes da migração.

# Progresso da modernização do vturapp

> Arquivo de retomada. Atualizado a cada etapa, junto com o documento `fase2-hono-execucao.md` do projeto no Claude.
> Regra de ouro: **nenhuma mudança de regra de negócio**. Toda etapa é provada com teste de paridade ou contrato antes de ir para a pasta.

_Última atualização: 24/09/2026, 23:59. Trabalho feito no Mac (`~/Documents/GitHub/vturapp`)._

## Onde paramos
- **Fase 2 concluída para `/api/v1`:** as 252 rotas de `/api/v1` rodam no Hono (`docs/api-inventory.md`: 252 de 261 endpoints). Os 9 restantes são o catch-all e `src/routes/api/auth`.
- **Fase 2.6, lote 3, gravado no Mac e sem commit:** 34 rotas dos domínios pequenos, mais as 3 rotas profundas que tinham ficado no SvelteKit.
- **Decisão do usuário (24/09/2026):** as rotas de login e autenticação em `src/routes/api/auth` (login, convite, set-session, turnstile e passkeys) **não serão migradas**. Elas continuam no SvelteKit, sem alteração.
- **Fase 3.1:** com commit ("fase7"). O "Dados atualizados há X" do dashboard funciona, e o `svelte-check` está sem erros.
- **Fase 3.2:** com commit ("telas_botoes").
- **Fase 3.3 gravada no Mac, sem commit:** navegação e acessibilidade no layout: menu lateral, menu do celular, breadcrumbs e títulos.
- **Próximo passo:** Fase 3.4, velocidade das APIs.

## Pendências do usuário
1. No Mac: `npm test` (623 testes), depois commit/push da Fase 3.3.
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
| 3.1: indicação de atualização + `svelte-check` sem erros | ✅ commit | Ver seção Fase 3. |
| 3.2: acessibilidade do kit `ui` | ✅ commit | Ver seção Fase 3. |
| 3.3: navegação (menu, trilha, títulos) | ⏳ sem commit | Ver seção Fase 3. |
| 3.4 e 3.5 | ⬜ | Ver plano abaixo. |

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

**3.2 (feito):** só atributos `aria-*`, `tabindex` e foco. Nenhuma regra de negócio muda, e o visual continua o mesmo.
- **Campos** (`FieldInput`, com e sem máscara, `FieldSelect`, `FieldTextarea`, `FieldCheckbox`, `FieldToggle`):
  - a mensagem de erro ou de ajuda ganhou `id` e passa a ser anunciada junto com o campo (`aria-describedby`);
  - com erro, o campo recebe `aria-invalid="true"`;
  - o `*` de obrigatório fica `aria-hidden`, e o campo continua `required`.
- **`FieldRadioGroup`:** o rótulo apontava (`for`) para um id que não existia. Agora o grupo tem `role="radiogroup"` e é nomeado pelo rótulo, com `aria-required`, `aria-invalid` e `aria-describedby`.
- **`Tabs`:** tabindex móvel (só a aba ativa entra no Tab); setas esquerda e direita, Home e End navegam e ativam a aba, pulando as desabilitadas. A lógica fica em `tabsKeyboard.ts`, com teste. O clique continua igual.
- **`Button`:** `aria-busy` enquanto carrega e prop opcional `tabindex`.
- **`DataTable`:**
  - `aria-sort` nas colunas ordenáveis;
  - linhas clicáveis (`onRowClick`) passam a ser focáveis e abrem com Enter ou Espaço. Isso só vale quando o foco está na própria linha, então botões e campos dentro dela continuam com o comportamento de sempre.
- **`ToastContainer`:** sucesso e informação usam `role="status"` (educado, não interrompe a leitura); erro e alerta continuam `role="alert"`. O botão de fechar ganhou nome ("Fechar aviso").
- **`OverlayModal`:** ao abrir, o foco vai para a janela, então Esc funciona de imediato; ao fechar, o foco volta para onde estava.
- **`AlertMessage`:** o ícone de fechar ficou `aria-hidden`.
- **Verificação:**
  - `src/lib/components/ui/a11y.test.ts` renderiza os componentes no servidor (`svelte/server`, sem dependência nova) e confere os atributos, com 13 testes;
  - total de 618 testes passando;
  - `svelte-check` com 0 erros e 0 avisos;
  - build OK.

**3.3 (feito):** os itens do menu, a ordem e as permissões (`canSeeItem`) continuam exatamente iguais.
- **Pular para o conteúdo:** o primeiro Tab da página mostra o link "Pular para o conteúdo", que leva o foco para o `<main id="conteudo-principal">`. Foi criada a classe `.vtur-skip-link` em `app.css`.
- **Menu lateral (`Sidebar.svelte`):**
  - O estado de cada seção recolhida passou a ser guardado **pelo nome da seção**. Antes era pela posição na lista, e quando as permissões terminavam de carregar a seção recolhida podia trocar.
  - Menu expandido/recolhido e seções recolhidas ficam lembrados neste navegador (`localStorage`, chaves `vtur:sidebar-expanded` e `vtur:sidebar-secoes-recolhidas`). As funções estão em `layout/sidebarPrefs.ts`, com teste. Qualquer falha volta ao padrão.
  - Os botões de seção e o de expandir ganharam `aria-expanded` e `aria-controls`.
- **Menu no celular:**
  - o botão Menu ganhou `aria-expanded` e o rótulo passou a alternar entre Abrir e Fechar;
  - ao abrir, o foco vai para o primeiro link;
  - **Esc fecha** o menu e devolve o foco ao botão;
  - o menu fecha sozinho em qualquer navegação, inclusive no voltar do navegador (`afterNavigate`);
  - o fundo escuro deixou de ser um botão falso com foco;
  - o item da página atual ganhou `aria-current`.
- **Breadcrumbs (`PageHeader`):**
  - `<nav aria-label="Trilha de navegação">`;
  - o ícone de início ganhou o nome "Início";
  - as setas ficaram `aria-hidden`;
  - o último item recebe `aria-current="page"`;
  - o foco agora fica visível.
- **`Button`:** nova prop `ariaControls`.
- **Títulos da aba do navegador:** foram adicionados em Consultoria Online, Análise de Desempenho e Correção de recibos. As outras telas já tinham título, direto ou pelo componente que usam, e 4 são só redirecionamentos.
- **Topbar:** o rótulo do logo agora é "VTUR, página inicial".
- **Verificação:**
  - 623 testes passando, com 5 novos: `sidebarPrefs` e trilha/ariaControls em `a11y.test.ts`;
  - `svelte-check` com 0 erros e 0 avisos;
  - build OK.
- **Observações:**
  - `layout/Header.svelte` não é usado por nenhuma tela. Fica como está e pode ser apagado depois, se você quiser.
  - Atalhos globais de teclado ficaram de fora de propósito, para não conflitar com a digitação nos formulários.
  - A cópia de build da nuvem estava sem 8 arquivos de rotas profundas (os editar de cadastros e as passkeys). Foi completada, e agora é idêntica ao Mac.

**Plano (próximas etapas):**
- ~~3.2 Kit `ui`~~ (feito). Pendentes do kit, para depois:
  - o `Dialog` (Flowbite `Modal`) não liga o título ao `role="dialog"`, porque o Flowbite não repassa atributos para esse elemento;
  - contraste no modo escuro;
  - padronizar os estados de carregando, vazio e erro.
- ~~3.3 Navegação~~ (feito, ver acima).
- **3.4 Velocidade:** com o header `server-timing`, medir a API de cada tela e atacar as mais lentas (cache, chamadas em paralelo), sem mudar os resultados. Prova com testes de contrato.
- **3.5 Telas gigantes:** dividir em componentes, sem mudar o comportamento. As maiores são `financeiro/conciliacao` (3113 linhas), `orcamentos/roteiros/[id]` (2764), `operacao/vouchers/novo` (1605) e `vendas/[id]/editar` (1388).

## Problemas conhecidos (não corrigidos, fora do escopo atual)
- Tabela `push_subscriptions` não existe no banco (`push/subscribe` e `push/unsubscribe`).
- Auditoria em `logs` só cobre Vendas. Faltam login, Clientes, Cadastros, Parâmetros, Escalas, Admin e perfil.
- `importar-vendas` responde 410 (descontinuado) desde antes da migração.

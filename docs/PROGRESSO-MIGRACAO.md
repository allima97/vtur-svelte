# Progresso da modernização do vturapp

> Arquivo de retomada. Atualizado a cada etapa, junto com o documento `fase2-hono-execucao.md` do projeto no Claude.
> Regra de ouro: **nenhuma mudança de regra de negócio**. Toda etapa é provada com teste de paridade ou contrato antes de ir para a pasta.

_Última atualização: 25/09/2026, 08:30._

## Onde paramos
- **Fase 2 concluída para `/api/v1`:** as 252 rotas de `/api/v1` rodam no Hono (`docs/api-inventory.md`: 252 de 261 endpoints). Os 9 restantes são o catch-all e `src/routes/api/auth`.
- **Fase 2.6, lote 3, gravado no Mac e sem commit:** 34 rotas dos domínios pequenos, mais as 3 rotas profundas que tinham ficado no SvelteKit.
- **Decisão do usuário (24/09/2026):** as rotas de login e autenticação em `src/routes/api/auth` (login, convite, set-session, turnstile e passkeys) **não serão migradas**. Elas continuam no SvelteKit, sem alteração.
- **Fase 3.1:** com commit ("fase7"). O "Dados atualizados há X" do dashboard funciona, e o `svelte-check` está sem erros.
- **Fase 3.2:** com commit ("telas_botoes").
- **Fase 3.3:** com commit ("breacrumbs").
- **Correção do dashboard em meses anteriores (25/09):** com commit ("dashboard"). Ver a seção "Dashboard: meses anteriores" abaixo.
- **Fase 3.5, 1ª rodada:** com commit ("correções_dashboard").
- **Fase 3.5, 2ª rodada (abas e janelas da conciliação e do roteiro):** gravada no Mac, sem commit. Ver a seção 3.5.
- **Fase 3.4:** com commit ("consultas"). Resumo:
  - o `wrangler.toml` roda o Worker ao lado do banco (`[placement] region = "aws:us-west-2"`);
  - o detalhe da viagem busca os dados em paralelo.
- **Próximo passo:**
  - publicar a 3.4 e medir o resultado;
  - depois, Fase 3.5 (dividir telas gigantes).

## Pendências do usuário
1. No Mac: `npm test` (629 testes), depois commit/push da Fase 3.4.
2. Publicar com `npm run cf:deploy`. Depois, conferir no DevTools (aba Rede, qualquer chamada `/api/v1/...`):
   - o header `cf-placement` deve mostrar algo como `remote-PDX` ou `remote-SEA`;
   - o `server-timing` deve cair.
   Para desfazer: remover o bloco `[placement]` e publicar de novo.
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
| 3.3: navegação (menu, trilha, títulos) | ✅ commit | Ver seção Fase 3. |
| 3.4: velocidade (placement + viagem em paralelo) | ⏳ sem commit | Ver seção Fase 3. |
| 3.5: telas gigantes | ⏳ sem commit (editar venda já com commit) | Ver seção 3.5. |

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

**3.4 (feito): diagnóstico medido, sem mudar o banco (só consultas de leitura).**
- **As estatísticas do Postgres enganam.** O `pg_stat_statements` conta desde 12/2025. A lista de cidades aparecia com 1,3 s de média, mas era do tempo em que a tabela tinha cerca de 160 mil linhas. Medida hoje (`EXPLAIN ANALYZE`, como usuário `authenticated`), leva **3 ms**. A RLS não pesa.
- **Logs dos últimos dias (tempo de resposta do PostgREST):** até consultas triviais levam cerca de **200 a 500 ms**. Exemplo: `quote`, com média de 210 ms.
- **Causa:** o banco fica em **us-west-2 (Oregon)** e o Worker roda perto do usuário, em São Paulo (`colo GRU`). Cada consulta atravessa o continente. Toda API também chama o Supabase Auth (`getUser`), que fica na mesma região.
- **Correção 1 (`wrangler.toml`):** `[placement] region = "aws:us-west-2"`.
  - O Worker passa a rodar ao lado do banco. O usuário paga uma ida até Oregon por requisição, e as consultas ficam em poucos ms.
  - Os arquivos estáticos continuam saindo do ponto mais próximo do usuário.
  - O wrangler 4.87 aceita a opção, e o `wrangler deploy --dry-run` passou.
  - Estimativa para uma API com 5 idas ao banco: de ~1 s para ~250 ms.
  - Documentação: https://developers.cloudflare.com/workers/configuration/placement/
- **Correção 2 (`viagens/id.ts`, GET):**
  - Antes, depois do controle de acesso, todas as leituras rodavam em fila: status, cliente, venda → recibos → produtos, recibo, vouchers e passageiros.
  - Agora essas leituras rodam em paralelo, e o caminho mais longo fica em 3 idas.
  - O controle de acesso ficou **igual**, de propósito.
  - **Prova:** `id.contract.test.ts`, com o banco falso `$lib/server/testing/fakeSupabase.ts`. São 5 cenários (admin completo, vendedor com acesso pela venda, vendedor sem acesso → 403, 404, e viagem sem venda nem cliente).
  - Os snapshots foram gerados com o código **antigo** e passam iguais com o novo: mesmo status, mesmo corpo e o mesmo conjunto de consultas.
  - Um teste extra confirma 1 consulta aberta por vez antes e 6 ao mesmo tempo agora.
- **Verificado e não precisa mexer:** estes já buscam em paralelo e com cache:
  - detalhe de venda, orçamento e voucher;
  - base do cadastro de venda;
  - listas de viagens e orçamentos;
  - resumo admin;
  - `user/context`.
  O front também guarda os GETs por 15 s, e o servidor manda `private, max-age=30`.
- **Opcional (banco, precisa da sua aprovação):** a tabela `cidades` tem 102 kB de dados em 17 MB de disco, mais 22 MB de índices, sobra das cerca de 160 mil cidades antigas. Um `VACUUM FULL public.cidades` recuperaria esse espaço. O ganho hoje é pequeno (poucos ms), por isso não fiz.
- **Verificação:** 629 testes passando, `svelte-check` com 0 erros e 0 avisos, build OK.

**Dashboard: meses anteriores ficavam só no esqueleto (25/09).** O diagnóstico foi feito só com consultas de leitura no banco.
- **Causa 1:** fev a mai/2026, na empresa 104037a0, estavam em `status='error'`. O erro era sempre o mesmo: `violates foreign key constraint ranking_recibo_contribuicoes_recibo_id_fkey`.
  - Recibo que existe só na conciliação, sem recibo de venda, usa o id da conciliação como `reciboId` (`buildConcRecibo`: `linked_recibo_id || item.id`).
  - O resumo do mês nunca era gravado. A cada abertura, o dashboard tentava reconstruir (cálculo do mês inteiro, que falhava) e depois **calculava tudo de novo**. Isso estourava o tempo.
  - Afeta **todo mês com conciliação importada**. Os meses sem conciliação (dez, jan, jun, ago, set) estavam ok.
- **Causa 2:** jul/2026 estava `ready` com **0 linhas**. Foi montado em 01/07 às 09:46, com o mês ainda vazio, e nunca mais foi marcado para refazer. Os gatilhos de "dirty" da Fase 0 **não estão aplicados** no banco (conferido em `information_schema.triggers`), e a aplicação só marca o mês atual e o anterior.
- **Correção 1: `readModelRowGuard.ts`** (novo), usado nos **dois** pontos de gravação (`reciboContribuicoesReadModel.ts` do dashboard e `readModelRebuild.ts` do cron).
  - Antes de apagar o mês, confere em `vendas_recibos` quais `recibo_id` existem. Os inexistentes são gravados como `null`, igual ao que já se fazia com `venda_id`. O cálculo não muda.
  - **Trava:** as contagens de recibos usam o `recibo_id` na chave: painel e RPCs usam `venda|recibo ou número|data`, produtos usa `recibo || venda|número|data`, ranking usa `venda::recibo ou número`, destinos e clientes usam `venda || recibo || …`.
    - Só grava se a troca for **um-para-um** em todas essas chaves. Linhas do mesmo recibo, como no rateio, continuam iguais, e recibos diferentes continuam diferentes. Assim nenhuma contagem muda em nenhum filtro.
    - Se não for, o mês não é gravado e fica como antes. O `last_error` informa qual chave bateria.
  - Consulta nos dados reais: dos 392 recibos da conciliação sem recibo de venda, **0** colidem na chave do painel.
- **Correção 2: rodada noturna.** O `wrangler.toml` ganhou o cron `"7 6 * * *"` (03:07 de Brasília).
  - `scripts/patch-worker-scheduled.js` passa a enviar o header `x-cron-schedule`. O endpoint só considera esse header depois de validar o `x-cron-secret`.
  - `markNightlyReadModelMonthsDirty` marca como `dirty`, para as empresas ativas e os últimos 12 meses mais o atual:
    - o mês atual e os 2 anteriores, sempre;
    - meses que nunca foram montados;
    - meses `ready` montados **antes de o mês terminar**, como julho.
  - O cron de 5 min reconstrói durante a madrugada, até 50 meses por rodada. Hoje são 3 empresas, então no máximo 39 meses. De manhã, o dashboard só lê.
  - A regra está em `selectNightlyDirtyMonths`, uma função pura com teste.
- **Correção 3:** o cron tenta de novo mês em `error` só **1 vez por hora**, e não a cada 5 min. Antes, um mês com falha recalculava o mês inteiro 12 vezes por hora à toa.
- **Testes novos:**
  - `readModelRowGuard.test.ts`: 7 testes, incluindo os 2 casos em que a trava impede a gravação;
  - `readModelNightly.test.ts`: 6 testes.
  - O `fakeSupabase` ganhou `upsert`.
- **Verificação:**
  - 642 testes passando;
  - `svelte-check` com 0 erros e 0 avisos;
  - build OK;
  - `wrangler deploy --dry-run` OK com os 2 crons.
- **Depois do deploy:**
  - fev a mai: o cron tenta de novo em até 1 hora, e o dashboard, na próxima abertura;
  - julho: corrigido na primeira rodada noturna.
  - Para corrigir julho na hora, precisa de aprovação:
    ```sql
    update ranking_read_model_status set status='dirty', dirty_at=now(), updated_at=now()
    where modelo='recibo_contribuicoes_v4' and company_id='104037a0-e143-4cb7-ae81-fc31da188ae4' and mes='2026-07-01';
    ```
- **Recomendado:** aplicar a migration dos gatilhos da Fase 0 (`20260924200100_read_model_v4_dirty_triggers.sql`). Com ela, qualquer alteração em mês antigo marca o mês na hora, sem esperar a noite. Precisa de aprovação.

**3.5 (25/09): dividir as telas gigantes, sem mudar o comportamento.** Começou com outro agente e foi revisada e concluída aqui.

| Tela | Antes | Depois | O que saiu |
|---|---|---|---|
| `vendas/[id]/editar` | 1388 | 1065 | 5 componentes das etapas (`EtapasNavegacao`, `EtapaDadosVenda`, `EtapaRecibos`, `EtapaPagamentos`, `EtapaResumo`) e `types.ts` (feito pelo outro agente) |
| `operacao/vouchers/novo` | 1605 | 1442 | `SelecaoFornecedor`, `WizardEtapas`, `ImportacaoVoucher`, `formatters.ts` e `types.ts` |
| `orcamentos/roteiros/[id]` | 2764 | 2477 | tipos e funções de lista (`tipos.ts`), importação de dias (`importacao-dias.ts`) e `formatadores.ts` |
| `financeiro/conciliacao` | 3113 | 2809 | 14 tipos (`types.ts`) e 18 formatadores (`formatters.ts`) |

- **Como foi provado que nada mudou:**
  - **HTML:** com cada componente expandido de volta no lugar da tag, a tela fica **idêntica** à original, linha a linha, nas 4 telas. No `SelecaoFornecedor` só houve renomeação de variável (`provider` → `providerOption`, `form.provider` → prop `provider`).
  - **Script:** cada função ou tipo foi removido da página **só se o texto for igual** ao do módulo. A comparação foi automática, uma por uma: 18 + 14 na conciliação, 19 + 7 no roteiro, mais `formatDateBR` e `WizardForm`.
  - **Reatividade:** os dados editados nos componentes filhos usam `bind:` (`recibos`, `pagamentos`, `venda`, os textos colados na importação de voucher). As funções continuam na página e são passadas como props.
- **Correções no que o outro agente deixou:**
  - Em `importacao-dias.ts`, a expressão que remove acentos estava gravada com caracteres invisíveis literais. Voltou para `/[\u0300-\u036f]/`, como no original. O efeito era o mesmo, mas a forma literal é frágil.
  - Em `conciliacao/_components/types.ts`, havia 2 tipos que **não existiam** na tela (`ImportDiferenca`, `VisaoGeralRow`). Foram removidos.
  - Os componentes de voucher e roteiro e os formatadores da conciliação estavam criados, mas não eram usados pelas telas. Agora são.
- **Testes novos:**
  - `conciliacao/_components/formatters.test.ts` (6);
  - `roteiros/[id]/_components/importacao-dias.test.ts` (5).
- **Verificação:**
  - 653 testes passando;
  - `svelte-check` com 0 erros e 0 avisos;
  - build OK.
- **2ª rodada (25/09): abas e janelas.**

| Tela | Antes | Depois | Componentes novos |
|---|---|---|---|
| `financeiro/conciliacao` | 2809 | 2526 | `AbaRegistros`, `AbaAlteracoes`, `AbaExecucoes` (tabelas só de leitura) e `JanelaAuditoriaVinculos` (só `bind:open`) |
| `orcamentos/roteiros/[id]` | 2477 | 1550 | `AbaItinerario`, `AbaHoteis`, `AbaPasseios`, `AbaTransporte`, `AbaInvestimento`, `AbaPagamento` |

  - **O roteiro usa runas do Svelte 5.** As abas recebem as listas e as variáveis que alteram como `$bindable()`, e a página liga com `bind:`. Um script detectou quais variáveis cada aba altera, e o `svelte-check` validou os tipos.
  - **Prova do HTML:** expandindo as tags, as duas telas ficam idênticas às originais. No script, só entraram os imports.
  - **Prova de execução**, feita com `jsdom` instalado só na cópia da nuvem, sem mudar o `package.json`: montei a aba dentro de uma página de teste com `bind:`, cliquei nos botões e digitei nos campos.
    - Adicionar, editar, trocar a opção, mover e remover alteram a lista da página.
    - As variáveis simples também voltam para a página, por exemplo `showDiasImport` e as mensagens.
    - **Contraprova:** sem o `bind:` o teste falha, então ele detecta o erro.
  - **Deixados de propósito na página da conciliação:**
    - a janela de **diferenças na importação**: os botões mudam duas variáveis e na mesma linha chamam `importPreviewRows()`, que lê uma delas. Separar arriscaria a ordem, numa tela de dinheiro;
    - a janela de **detalhes**, com 18 `bind:` de valores financeiros;
    - a aba **Visão geral**, com 8 filtros com `bind:`;
    - a aba **Importação**.
  - **Verificação:** 653 testes passando, `svelte-check` com 0 erros e 0 avisos, build OK.
- **Resultado da 3.5:**

| Tela | Original | Agora |
|---|---|---|
| `financeiro/conciliacao` | 3113 | 2526 |
| `orcamentos/roteiros/[id]` | 2764 | 1550 |
| `operacao/vouchers/novo` | 1605 | 1442 |
| `vendas/[id]/editar` | 1388 | 1065 |

**Plano (próximas etapas):**
- ~~3.2 Kit `ui`~~ (feito). Pendentes do kit, para depois:
  - o `Dialog` (Flowbite `Modal`) não liga o título ao `role="dialog"`, porque o Flowbite não repassa atributos para esse elemento;
  - contraste no modo escuro;
  - padronizar os estados de carregando, vazio e erro.
- ~~3.3 Navegação~~ (feito, ver acima).
- ~~3.4 Velocidade~~ (feito, ver acima). Plano original: com o header `server-timing`, medir a API de cada tela e atacar as mais lentas (cache, chamadas em paralelo), sem mudar os resultados. Prova com testes de contrato.
- ~~3.5 Telas gigantes~~ (1ª rodada feita, ver acima). Plano original: dividir em componentes, sem mudar o comportamento. As maiores são `financeiro/conciliacao` (3113 linhas), `orcamentos/roteiros/[id]` (2764), `operacao/vouchers/novo` (1605) e `vendas/[id]/editar` (1388).

## Problemas conhecidos (não corrigidos, fora do escopo atual)
- Tabela `push_subscriptions` não existe no banco (`push/subscribe` e `push/unsubscribe`).
- Auditoria em `logs` só cobre Vendas. Faltam login, Clientes, Cadastros, Parâmetros, Escalas, Admin e perfil.
- `importar-vendas` responde 410 (descontinuado) desde antes da migração.

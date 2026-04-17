# Modulo Agenda / Tarefas / Acompanhamento — Status de Migracao (`vtur-app` -> `vtur-svelte`)

## Objetivo do modulo
- Espelhar o fluxo administrativo-operacional de Agenda, Tarefas e Acompanhamento do `vtur-app`.
- Preservar as regras de negocio e o padrao de UX aprovado no `vtur-svelte`:
- Sem botoes de acao por linha nas listagens.
- Clique na linha/card abre o registro quando fizer sentido.

## Fonte de verdade utilizada
- `vtur-app/src/components/islands/AgendaCalendar.tsx`
- `vtur-app/src/components/islands/TodoBoard.tsx`
- `vtur-app/src/pages/api/v1/agenda/range.ts`
- `vtur-app/src/pages/api/v1/agenda/create.ts`
- `vtur-app/src/pages/api/v1/agenda/update.ts`
- `vtur-app/src/pages/api/v1/agenda/delete.ts`
- `vtur-app/src/pages/api/v1/todo/board.ts`
- `vtur-app/src/pages/api/v1/todo/item.ts`
- `vtur-app/src/pages/api/v1/todo/batch.ts`
- `vtur-app/src/pages/api/v1/todo/category.ts`
- `vtur-app/src/pages/api/v1/dashboard/follow-ups.ts`
- Fluxo de follow-up no detalhe de `viagens`

## Status geral atual
- **PARCIALMENTE CONCLUIDO**
- Agenda e Tarefas foram realinhadas ao fluxo legado.
- Acompanhamento operacional foi trazido para um modulo proprio no `vtur-svelte`, consumindo os dados reais de `viagens`/`vendas`.

## Checklist de paridade

### 1) Agenda (`operacao/agenda`)
- [x] Calendario real com leitura por faixa (`inicio` / `fim`)
- [x] Eventos vindos de `agenda_itens` com `tipo = 'evento'`
- [x] Restricao por usuario logado, como no legado
- [x] Aniversarios por empresa adicionados como eventos read-only
- [x] Criacao real de evento
- [x] Edicao real de evento
- [x] Exclusao real de evento
- [x] Drag/drop e resize com persistencia
- [x] Modal de detalhe/edicao
- [x] Listagem auxiliar do periodo visivel sem acoes por linha
- [x] Clique em linha ou evento abre o registro
- [x] API de agenda com validacao de permissao por modulo

### 2) Tarefas (`operacao/tarefas`)
- [x] Trocado o CRUD simplificado por board `todo` fiel ao legado
- [x] Categorias por usuario (`todo_categorias`)
- [x] Tarefas vindas de `agenda_itens` com `tipo = 'todo'`
- [x] Status reais do board:
  - `novo`
  - `agendado`
  - `em_andamento`
  - `concluido`
- [x] Normalizacao visual em colunas:
  - A Fazer
  - Fazendo
  - Feito
- [x] Modo kanban
- [x] Modo lista
- [x] Arquivamento e restauracao
- [x] Criacao de tarefa
- [x] Edicao de tarefa
- [x] Exclusao de tarefa
- [x] Criacao/edicao/exclusao de categoria
- [x] Sem botoes por linha na listagem
- [x] Clique em linha/card abre o registro
- [x] API `todo/*` portada para o `vtur-svelte`

### 3) Acompanhamento (`operacao/acompanhamento`)
- [x] Nova tela consolidando o follow-up operacional real
- [x] Dados vindos de `viagens` + `vendas` + `clientes`
- [x] Escopo por perfil respeitado no backend
- [x] Filtro por periodo
- [x] Filtro por status (abertos / fechados / todos)
- [x] Busca por cliente, destino e texto
- [x] Clique na linha abre o detalhe
- [x] Edicao de `follow_up_text`
- [x] Edicao de `follow_up_fechado`
- [x] Vínculos operacionais no detalhe:
  - cliente
  - venda
  - viagem
  - WhatsApp

### 4) APIs revisadas
- [x] `GET /api/v1/agenda`
- [x] `GET /api/v1/agenda/range`
- [x] `POST /api/v1/agenda/create`
- [x] `PATCH|POST /api/v1/agenda/update`
- [x] `DELETE /api/v1/agenda/delete`
- [x] `GET /api/v1/todo/board`
- [x] `POST|PATCH|DELETE /api/v1/todo/item`
- [x] `GET /api/v1/todo/item/[id]`
- [x] `POST /api/v1/todo/batch`
- [x] `POST|DELETE /api/v1/todo/category`
- [x] `GET /api/v1/dashboard/follow-ups`
- [x] `GET /api/v1/tarefas` ajustado para nao manter leitura simplificada antiga

## Arquivos alterados/criados

### Frontend
- `src/routes/(app)/operacao/agenda/+page.svelte`
- `src/routes/(app)/operacao/tarefas/+page.svelte`
- `src/routes/(app)/operacao/acompanhamento/+page.svelte`
- `src/lib/components/layout/Sidebar.svelte`

### Backend / helpers
- `src/lib/server/agenda.ts`
- `src/routes/api/v1/agenda/+server.ts`
- `src/routes/api/v1/agenda/range/+server.ts`
- `src/routes/api/v1/agenda/create/+server.ts`
- `src/routes/api/v1/agenda/update/+server.ts`
- `src/routes/api/v1/agenda/delete/+server.ts`
- `src/routes/api/v1/todo/board/+server.ts`
- `src/routes/api/v1/todo/item/+server.ts`
- `src/routes/api/v1/todo/item/[id]/+server.ts`
- `src/routes/api/v1/todo/batch/+server.ts`
- `src/routes/api/v1/todo/category/+server.ts`
- `src/routes/api/v1/dashboard/follow-ups/+server.ts`
- `src/routes/api/v1/tarefas/+server.ts`

## Pendencias reais
- [ ] Expor na UI os filtros avancados de empresa/vendedor para follow-up em cenarios de admin/master/gestor
- [ ] Realtime e cache fino da agenda como no `AgendaCalendar` legado
- [ ] Substituir a view `list` nativa do legado por plugin equivalente ou manter definitivamente a lista auxiliar abaixo do calendario
- [ ] Validar se existe algum fluxo adicional de acompanhamento fora de `viagens.follow_up_*` em outras telas do `vtur-app`

## Observacoes
- O fluxo de tarefas foi adaptado ao padrao aprovado do `vtur-svelte`: nao ha botoes por linha; o detalhe concentra as acoes.
- O fluxo de acompanhamento continua ancorado em `viagens`, sem inventar entidade nova.
- Vouchers nao foram alterados.

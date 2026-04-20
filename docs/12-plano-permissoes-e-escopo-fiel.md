# Plano de Permissões e Escopo Fiel — `vtur-app` → `vtur-svelte`

> Atualizado em 2026-04-20.
> Fonte de verdade obrigatória: `vtur-app`.
> Este documento complementa o plano geral e o plano de execução total, com foco exclusivo em permissões, escopo por papel, menu, filtros, telas e endpoints.

---

## Objetivo

Eliminar divergências de acesso entre `vtur-app` e `vtur-svelte`, garantindo paridade em quatro camadas obrigatórias:

1. menu e navegação
2. visibilidade de tela, filtros, abas e ações
3. escopo de dados em endpoints e queries
4. comportamento final por papel do usuário

No `vtur-svelte`, um módulo só poderá ser considerado migrado quando essas quatro camadas estiverem batendo com o legado.

---

## Fonte de verdade no `vtur-app`

Arquivos obrigatórios para releitura antes de qualquer ajuste de permissão:

- `src/components/islands/MenuIsland.tsx`
- `src/components/islands/AdminPermissoesIsland.tsx`
- `src/components/islands/MasterPermissoesIsland.tsx`
- `src/components/islands/AdminUserTypesIsland.tsx`
- `src/lib/permissoesStore.ts`
- `src/lib/permissoesCache.ts`
- `src/lib/usePermissao.ts`

Arquivos centrais no `vtur-svelte` que precisam obedecer a essa mesma lógica:

- `src/lib/stores/permissoes.ts`
- `src/lib/server/v1.ts`
- `src/lib/server/admin.ts`
- `src/lib/components/layout/Sidebar.svelte`
- `src/routes/+layout.ts`
- rotas `src/routes/api/v1/**`
- páginas `src/routes/(app)/**`

---

## Princípios inegociáveis

1. Não basta o endpoint estar protegido; a tela também não pode induzir acesso fora do escopo.
2. Não basta esconder na UI; o backend também precisa ignorar ou rejeitar IDs fora do escopo permitido.
3. Permissão é dupla: acesso ao módulo e alcance dos dados.
4. O papel do usuário altera menu, rota, filtros, ações, escopo de busca e payload aceito.
5. `VENDEDOR`, `GESTOR`, `MASTER` e `ADMIN` não podem compartilhar a mesma tela “genérica” se o legado muda a experiência entre eles.
6. Se o `vtur-app` remove um filtro para determinado papel, o `vtur-svelte` também deve remover, e não apenas desabilitar visualmente.

---

## Matriz de papéis e escopo

### `VENDEDOR`

Escopo esperado:

- vê apenas seus próprios dados
- não deve navegar por empresa do grupo
- não deve escolher outros vendedores
- só acessa módulos liberados ao seu perfil

Regras obrigatórias:

- esconder filtro `empresa` quando o escopo for unicamente a empresa do usuário
- esconder filtro `vendedor` quando o escopo for somente ele mesmo
- dashboard deve refletir apenas produção própria
- relatórios, vendas, comissões, CRM e carteira devem ser próprios
- menu não pode exibir administração, parâmetros amplos, equipe, financeiro global ou telas de grupo

### `GESTOR`

Escopo esperado:

- vê sua equipe e sua empresa
- não vê empresas fora do vínculo
- não vê vendedores fora da equipe
- pode operar visões gerenciais restritas ao seu domínio

Regras obrigatórias:

- filtro `empresa` deve ficar restrito à empresa atual ou desaparecer se o legado assim fizer
- filtro `vendedor` deve listar apenas membros da equipe do gestor
- dashboard, ranking, relatórios e comissões devem agregar apenas equipe própria
- não pode acessar administração global, permissões globais, empresas do grupo inteiro ou usuários de outras empresas

### `MASTER`

Escopo esperado:

- vê empresas aprovadas no seu vínculo
- pode transitar em visão multiempresa, mas nunca fora das empresas aprovadas
- acessa módulos gerenciais mais amplos, inclusive permissões de seu domínio

Regras obrigatórias:

- filtro `empresa` deve listar apenas empresas aprovadas para o master
- filtro `vendedor` deve responder à empresa selecionada e nunca abrir universo total indevido
- dashboards, relatórios e financeiro devem respeitar somente empresas autorizadas

### `ADMIN`

Escopo esperado:

- acesso administrativo global, sujeito à matriz de módulo e ao comportamento do legado

Regras obrigatórias:

- pode ver e administrar globais quando o `vtur-app` permitir
- ainda assim, a experiência precisa seguir a mesma organização do legado em menu, páginas e permissões por módulo

### `OUTRO`

Escopo esperado:

- tratado como perfil restritivo
- nunca deve herdar experiência ampla por fallback

Regras obrigatórias:

- sem “acesso padrão” amplo por estar autenticado
- qualquer abertura fora da matriz precisa ser explicitamente concedida

---

## Quatro camadas obrigatórias de paridade

### 1. Menu

Validar:

- item aparece ou não aparece conforme papel
- agrupamento do item no menu correto
- rota não fica “pendurada” no mobile ou no drawer
- personalização de menu não reintroduz item proibido

### 2. Tela

Validar:

- cards, KPIs, abas, listas e ações conforme o papel
- filtros corretos por papel
- ausência de selects amplos quando o escopo é restrito
- botões `criar`, `editar`, `excluir`, `conciliar`, `salvar`, `aprovar` seguindo a matriz do legado

### 3. Endpoint

Validar:

- `resolveUserScope`
- `ensureModuloAccess`
- `resolveScopedCompanyIds`
- `resolveScopedVendedorIds`
- qualquer query manual por `company_id`, `empresa_id`, `vendedor_id`, `vendedor_ids` ou `user_id`

Regra obrigatória:

- se o usuário enviar um ID fora do escopo, o backend deve ignorar ou bloquear, nunca aceitar silenciosamente

### 4. Resultado final

Validar:

- números exibidos por papel
- registros listados por papel
- exportações e relatórios por papel
- dashboards, rankings, metas e CRM com o mesmo alcance do `vtur-app`

---

## Auditoria obrigatória por módulo

### 1. Dashboard

Validar por papel:

- quais widgets aparecem
- quais KPIs aparecem
- presença ou ausência de `empresa` e `vendedor`
- `Personalizar`
- `Calculadora`
- ranking, mural, agenda e atalhos conforme o papel

Critério de aceite:

- um vendedor não pode ver dashboard de time ou empresa inteira
- um gestor não pode ver grupo inteiro
- um master só vê empresas aprovadas

### 2. Vendas

Inclui:

- listagem
- criação manual
- importação
- edição
- consulta detalhada

Validar:

- vendedor só vê suas vendas
- gestor só vê equipe própria
- campos de empresa e vendedor apenas quando o legado permite
- criação/edição respeitando papel e módulo

### 3. Comissões

Validar:

- vendedor vê apenas suas comissões
- gestor vê equipe própria se o legado permitir
- campos de empresa/vendedor por papel
- cálculo e fechamento respeitando escopo permitido

Exemplo obrigatório:

- vendedor não pode abrir visão de comissão global da empresa

### 4. Conciliação

Validar:

- quem pode listar
- quem pode importar extrato
- quem pode executar conciliação
- escopo por empresa
- escopo por vendedor quando houver vinculação

### 5. Ajustes Vendas

Validar:

- quem pode buscar recibos
- até onde o escopo de recibos vai
- quem pode ratear
- reflexo do rateio sem abrir dados fora do papel

### 6. Relatórios

Inclui:

- vendas
- clientes
- destinos
- produtos
- ranking

Validar:

- filtros por papel
- exportação por papel
- totais por papel
- ausência de selects globais indevidos

### 7. Clientes / Carteira / CRM

Validar:

- carteira própria vs carteira da equipe
- CRM cliente separado do CRM admin
- ações disponíveis por papel
- histórico, disparo e templates dentro do escopo correto

### 8. Operação

Inclui:

- viagens
- vouchers
- documentos
- agenda
- tarefas
- mural de recados

Validar:

- o papel altera navegação, lista, owner dos itens e ações
- mural precisa seguir a mesma visibilidade do legado entre usuário, equipe e empresa

### 9. Parâmetros

Inclui:

- comissão
- metas
- tipo de produto
- tipo de pacote
- CRM
- avisos
- empresa
- equipe

Validar:

- quem pode apenas ver
- quem pode editar
- quem pode editar global
- quem pode editar apenas no próprio domínio

### 10. Admin / Master / Permissões

Validar:

- CRUD de usuários
- tipos de usuário
- permissões por módulo
- módulos do sistema
- empresas
- planos

Critério de aceite:

- não pode existir atalho de admin aparecendo para quem não o possui no legado

---

## Plano de execução recomendado

### Fase 1 — Congelar a matriz real do legado

Entregas:

- mapear papel por papel no `vtur-app`
- mapear menu por papel
- mapear filtros por tela
- mapear ações por tela
- mapear endpoints e parâmetros aceitos

Saída obrigatória:

- tabela mestre `papel x módulo x tela x filtro x ação x escopo`

### Fase 2 — Consolidar motor único de escopo no `vtur-svelte`

Base existente a endurecer:

- `resolveUserScope`
- `ensureModuloAccess`
- `resolveScopedCompanyIds`
- `resolveScopedVendedorIds`
- `fetchGestorEquipeIdsComGestor`

Objetivo:

- remover fallbacks permissivos demais
- impedir que autenticação simples vire acesso amplo
- usar a mesma resolução de escopo em todos os endpoints críticos

### Fase 3 — Alinhar menu e navegação

Itens obrigatórios:

- sidebar desktop
- drawer mobile
- bottom nav
- atalhos
- personalização de menu

Objetivo:

- o usuário não pode sequer navegar até o que o papel dele não enxerga no legado

### Fase 4 — Alinhar filtros e ações de cada página

Objetivo:

- remover filtros globais indevidos
- limitar selects por papel
- esconder ou bloquear ações fora da matriz

Prioridade:

1. dashboard
2. vendas
3. comissões
4. relatórios
5. conciliação
6. clientes/carteira/CRM

### Fase 5 — Validar backend contra bypass manual

Testes obrigatórios:

- enviar `empresa_id` fora do escopo
- enviar `vendedor_ids` fora do escopo
- abrir rotas de admin/master com papel inferior
- testar POST/PUT/DELETE com payload expandido manualmente

### Fase 6 — Regressão por papel

Perfis mínimos:

- vendedor
- gestor
- master
- admin

Checklist:

- menu
- dashboard
- vendas
- comissões
- relatórios
- conciliação
- clientes/CRM
- parâmetros
- admin/master

---

## Critérios de aceite obrigatórios

Uma tela só pode ser marcada como “fiel” quando:

1. o menu bate com o `vtur-app`
2. os filtros batem com o `vtur-app`
3. as ações batem com o `vtur-app`
4. os dados retornados batem com o `vtur-app`
5. o endpoint resiste a payload fora do escopo

Se qualquer um desses pontos falhar, a tela ainda não está migrada com fidelidade.

---

## Correções prioritárias já conhecidas

### Prioridade 1

- remover filtros de `empresa` e `vendedor` em telas de vendedor onde o legado não mostra isso
- limitar telas de gestor à equipe própria
- revisar menu mobile e desktop para esconder módulos indevidos
- revisar dashboard por papel antes de continuar expandindo widgets

### Prioridade 2

- revisar `financeiro/comissoes`, `relatorios/*`, `vendas/*` e `clientes/*` com foco em escopo
- revisar `CRM no cliente` para não herdar comportamento do admin
- revisar `master/permissoes`, que hoje redireciona para `/admin/permissoes` e precisa refletir a lógica correta do legado

### Prioridade 3

- revisar todos os componentes de filtro compartilhado para receber modo por papel
- revisar todos os loaders/client fetches para não montar parâmetros proibidos

---

## Próximo passo obrigatório

Antes de continuar qualquer migração de módulo isolado, executar a **Fase 1** deste documento e transformar a matriz real do legado em checklist operacional. Sem isso, o `vtur-svelte` continuará acertando endpoint em alguns pontos, mas errando menu, tela, filtro e experiência por papel.

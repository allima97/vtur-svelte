# Plano de Execução — Paridade Total `vtur-app` → `vtur-svelte`

> Atualizado em 2026-04-20.
> Fonte de verdade obrigatória: `vtur-app`.
> Regra central: nenhuma simplificação de regra de negócio é aceitável quando o legado já possui lógica consolidada.

---

## Objetivo

Fechar a migração com foco em **paridade funcional, visual e comportamental**, validando cada módulo em quatro camadas:

1. tela e UX
2. componentes/islands do `vtur-app`
3. endpoints e contratos de dados
4. impactos indiretos em dashboard, ranking, metas, relatórios, conciliação, CRM e permissões

---

## Princípios obrigatórios

1. `vtur-app` é a referência final para regra, nomenclatura e fluxo.
2. O `vtur-svelte` não pode “parecer pronto” com lógica resumida por baixo.
3. Cada módulo só é considerado migrado quando os efeitos cruzados estiverem batendo.
4. Sempre comparar:
   - página no `vtur-app`
   - island/componente principal
   - APIs consumidas
   - tabelas/colunas usadas
   - reflexos em outros módulos

---

## Inventário dos blocos críticos

### 1. Importar Vendas e venda manual

`vtur-app`:
- `src/components/islands/VendaContratoImportIsland.tsx`
- `src/components/islands/ImportarVendasIsland.tsx`
- fluxos de venda em edição/criação

`vtur-svelte`:
- `src/routes/(app)/vendas/importar/+page.svelte`
- `src/routes/(app)/vendas/nova/+page.svelte`
- `src/routes/(app)/vendas/[id]/editar/+page.svelte`
- `src/routes/api/v1/vendas/importar-contrato/+server.ts`
- `src/routes/api/v1/vendas/cadastro-save/+server.ts`

Validar fielmente:
- contrato CVC e reserva de cruzeiro
- parsing, warnings, duplicidade, edição e merge
- tipo de pacote, tipo de produto, recibo principal
- descontos, pagamentos, `paga_comissao`, `valor_nao_comissionado`
- impacto em metas, comissão, dashboard, relatórios e conciliação

Critério de aceite:
- mesma estrutura final salva no banco
- mesma validação bloqueante e mesmo fallback
- nenhuma divergência entre venda importada e venda manual

### 2. Regras de Comissionamento

`vtur-app`:
- `src/components/islands/FechamentoComissaoIsland.tsx`
- `src/components/islands/CommissionTemplatesIsland.tsx`
- `src/lib/pagamentoUtils.ts`
- `src/lib/conciliacao/business.ts`
- `src/lib/conciliacao/source.ts`
- `src/lib/relatorios/conciliacaoGrouped.ts`

`vtur-svelte`:
- `src/routes/(app)/financeiro/comissoes/+page.svelte`
- `src/routes/(app)/financeiro/comissoes/calculo/+page.svelte`
- `src/routes/(app)/financeiro/comissoes/regras/+page.svelte`
- `src/routes/api/v1/financeiro/comissoes/*`
- `src/lib/utils/comissao.ts`
- `src/lib/utils/conciliacao.ts`
- `src/lib/server/comissoes.ts`

Validar fielmente:
- meta não batida
- meta batida
- super meta
- pré / pós
- regra geral vs escalonável
- faixa por conciliação
- override por tipo de pacote / produto diferenciado
- exclusão de formas não comissionáveis
- conciliação como fonte principal quando parâmetro estiver ativo

Critério de aceite:
- o percentual final aplicado em cada venda deve bater com o legado
- fechamento, tela financeira, ranking e relatório devem mostrar o mesmo resultado

### 3. Conciliação de vendas

`vtur-app`:
- `src/lib/conciliacao/business.ts`
- `src/lib/conciliacao/source.ts`
- `src/lib/conciliacao/applyReciboOverrides.ts`
- `src/lib/conciliacao/mergeEffectiveRecibos.ts`
- telas/islands de conciliação e financeiro

`vtur-svelte`:
- `src/routes/(app)/financeiro/conciliacao/+page.svelte`
- `src/routes/api/v1/conciliacao/*`
- `src/routes/api/v1/dashboard/summary/+server.ts`
- `src/lib/utils/conciliacao.ts`

Validar fielmente:
- importação de extrato
- ranking/assign
- alterações e histórico
- confirmação BAIXA/OPFAX/ESTORNO
- `update-valores`
- overrides no recibo
- sintéticos sem duplicar recibo real
- reflexo em vendas, dashboard, comissionamento e relatórios

Critério de aceite:
- conciliação precisa mudar os mesmos números do `vtur-app` nos mesmos pontos

### 4. Ajustes Vendas

`vtur-app`:
- `src/components/islands/FinanceiroAjustesVendasIsland.tsx`
- `src/pages/api/v1/financeiro/ajustes-vendas/list.ts`
- `src/pages/api/v1/financeiro/ajustes-vendas/save.ts`

`vtur-svelte`:
- `src/routes/(app)/financeiro/ajustes-vendas/+page.svelte`
- `src/routes/api/v1/financeiro/ajustes-vendas/list/+server.ts`
- `src/routes/api/v1/financeiro/ajustes-vendas/save/+server.ts`

Validar fielmente:
- busca por recibo, vendedor e mês
- rateio entre vendedores
- manutenção do recibo único no sistema
- rastreabilidade de origem
- reflexo em ranking, metas, dashboard, relatórios e comissão

Critério de aceite:
- rateio não duplica valor
- ambos vendedores enxergam a participação correta
- cálculos downstream respeitam o rateio

### 5. Parâmetros

`vtur-app`:
- parâmetros de comissão
- tipos de produto
- tipos de pacote
- metas
- avisos / CRM

`vtur-svelte`:
- `src/routes/(app)/parametros/+page.svelte`
- `src/routes/(app)/parametros/tipo-produtos/+page.svelte`
- `src/routes/(app)/parametros/tipo-pacotes/+page.svelte`
- `src/routes/(app)/parametros/metas/+page.svelte`
- `src/routes/(app)/parametros/avisos/+page.svelte`
- `src/routes/(app)/parametros/crm/+page.svelte`

Validar fielmente:
- todos os campos persistidos
- defaults
- regras derivadas por parâmetro
- impacto indireto nas telas que consomem esses parâmetros

Critério de aceite:
- não existir parâmetro “salvo mas sem efeito”

### 6. Permissões

`vtur-app`:
- `AdminPermissoesIsland.tsx`
- `MasterPermissoesIsland.tsx`
- `AdminUserTypesIsland.tsx`
- `MenuIsland.tsx`
- `permissoesStore.ts` / `permissoesCache.ts`

`vtur-svelte`:
- `src/routes/(app)/admin/permissoes/+page.svelte`
- `src/routes/(app)/admin/permissoes/[id]/+page.svelte`
- `src/routes/(app)/master/permissoes/+page.svelte`
- `src/routes/api/v1/admin/permissoes/*`
- `src/lib/server/v1.ts`
- `src/lib/server/admin.ts`

Validar fielmente:
- menu
- ações visíveis
- nível view/create/edit/delete/admin
- permissões padrão por tipo de usuário
- escopo admin / master / gestor

Critério de aceite:
- o mesmo usuário não pode ganhar acesso extra no `vtur-svelte`
- nenhum endpoint pode ficar mais permissivo do que no legado
- menu, filtros, abas e botões também precisam respeitar o mesmo papel e o mesmo escopo do legado

Documento complementar obrigatório:
- `docs/12-plano-permissoes-e-escopo-fiel.md`

### 7. CRM no cliente

Problema atual:
- o CRM do cliente ainda está parcialmente herdando o fluxo do admin

`vtur-app`:
- `src/components/islands/ClientesIsland.tsx`
- `src/pages/parametros/crm.astro`
- biblioteca/assinatura CRM

`vtur-svelte`:
- `src/routes/(app)/clientes/[id]/+page.svelte`
- `src/routes/(app)/parametros/crm/+page.svelte`
- `src/routes/(app)/admin/crm/+page.svelte`
- `src/routes/api/v1/crm/*`
- `src/routes/api/v1/clientes/templates/*`

Validar fielmente:
- separação entre CRM do admin e CRM do cliente
- tema/template
- prévia
- assinatura
- disparo
- histórico do cliente

Critério de aceite:
- cliente usa sua própria lógica de CRM, não o CRUD do admin disfarçado

---

## Ordem de execução correta

### Fase A — Base de negócio de vendas

1. fechar venda manual e importada
2. validar `valor_total`, `valor_total_pago`, `valor_nao_comissionado`, recibos e pagamentos
3. congelar contrato de salvamento

Sem isso, comissão, conciliação e ajustes continuam quebrando em cascata.

### Fase B — Comissão real

1. portar fielmente a lógica de `FechamentoComissaoIsland`
2. centralizar cálculo compartilhado no `vtur-svelte`
3. substituir cálculos simplificados em:
   - financeiro/comissões
   - fechamento
   - ranking
   - relatórios
   - dashboard

### Fase C — Conciliação

1. alinhar UI e APIs com `/api/v1/conciliacao/*`
2. validar overrides
3. garantir reflexo nos módulos consumidores

### Fase D — Ajustes Vendas

1. fechar listagem + save
2. validar rateio
3. recalcular todos os agregados consumidores

### Fase E — Parâmetros e permissões

1. garantir que parâmetros realmente alterem o sistema
2. consolidar permissões de menu, tela e endpoint
3. validar escopo por papel em filtros, KPIs, listas e ações
4. revisar regressão completa por `VENDEDOR`, `GESTOR`, `MASTER` e `ADMIN`

### Fase F — CRM do cliente

1. separar CRM cliente do CRM admin
2. replicar tema/template/preview/disparo do legado

---

## Matriz de dependência cruzada

### Importar / venda manual impacta
- comissão
- conciliação
- dashboard
- ranking
- relatórios
- metas

### Comissão impacta
- financeiro/comissões
- fechamento
- ranking
- relatório de vendas
- dashboard

### Conciliação impacta
- valor efetivo dos recibos
- base de meta
- base comissionável
- relatórios
- dashboard
- ajustes vendas

### Ajustes Vendas impacta
- vendedor origem/destino
- ranking
- metas
- comissão
- relatório detalhado
- dashboard

### Parâmetros impactam
- comissão
- importação
- venda manual
- dashboard
- CRM

### Permissões impactam
- menu
- acesso de rota
- botões/ações
- write endpoints

### CRM impacta
- parâmetros
- clientes
- admin
- assinatura/template
- histórico/disparo

---

## Critério de aceite por entrega

Cada entrega só fecha quando passar nestes 5 pontos:

1. fluxo visual equivalente ao `vtur-app`
2. payload equivalente
3. persistência equivalente
4. impacto cruzado equivalente
5. validação manual com cenário real comparado entre os dois projetos

---

## Entregas práticas sugeridas

### Sprint 1
- fechar cálculo de comissão fiel ao legado
- alinhar fechamento, ranking, dashboard e relatórios à mesma engine

### Sprint 2
- reimplementar conciliação fiel ao `vtur-app`
- validar override de recibos e reflexos

### Sprint 3
- consolidar ajustes vendas com rateio correto ponta a ponta

### Sprint 4
- revisar parâmetros de comissão, tipo de produto e tipo de pacote
- validar metas e produto diferenciado

### Sprint 5
- revisar permissões de admin/master/tipos de usuário
- alinhar menu, página e endpoint
- alinhar filtros por papel e remover selects indevidos para vendedor/gestor

### Sprint 6
- separar CRM do cliente do CRM do admin
- validar tema/template/preview/disparo/histórico

### Sprint 7
- regressão completa por papel:
  - vendedor
  - gestor
  - financeiro
  - admin
  - master

---

## Próximo passo recomendado

Começar por **Comissionamento fiel ao legado**, porque hoje ele é o principal ponto onde as regras amarradas do `vtur-app` ainda não foram portadas por completo, e ele contamina ranking, dashboard, relatórios, fechamento e ajustes vendas.

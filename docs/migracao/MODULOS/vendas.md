# Módulo Vendas — Status de Migração (vtur-app -> vtur-svelte)

## Objetivo do módulo
- Espelhar o fluxo de Vendas do `vtur-app` no `vtur-svelte`, preservando regras de negócio e compatibilidade com Supabase.
- Preservar os mesmos campos, ações, fluxos auxiliares e regras operacionais do legado.
- A troca permitida é apenas de tecnologia e componentes; não de comportamento.

## Fonte de verdade utilizada
- `vtur-app/src/components/islands/VendasCadastroIsland.tsx`
- `vtur-app/src/components/islands/VendasConsultaIsland.tsx`
- `vtur-app/src/pages/vendas/cadastro.astro`
- `vtur-app/src/pages/api/v1/vendas/cadastro-save.ts`

## Status geral atual
- Em progresso avançado.
- Fluxo estrutural de Vendas (nova + edição + listagem + patch completo) foi ampliado para paridade funcional.
- Guardas de permissão, paginação server-side, filtros MASTER/GESTOR e auto-open por `?id=` foram implementados.
- Ainda há pendências relevantes de paridade com o módulo original (itens detalhados abaixo).

## Checklist de paridade

### 1) `vendas/[id]` (edição)
- [x] Estrutura em 3 etapas (Dados da venda, Recibos, Forma de pagamento).
- [x] Carrega venda por ID.
- [x] Carrega e preenche recibos vinculados.
- [x] Carrega e preenche pagamentos vinculados.
- [x] Permite editar venda, recibos e pagamentos no mesmo fluxo.
- [x] Validação de campos obrigatórios por etapa.
- [x] Regra de recibo principal aplicada no front.
- [x] Suporte a múltiplos recibos.
- [x] Suporte a múltiplos pagamentos.
- [x] Campos de contrato (`contrato_url`, `contrato_path`) presentes.
- [x] DU/RAV presentes e persistidos.
- [x] Desconto comercial e totais mantidos no payload.

### 2) API `PATCH /api/v1/vendas/[id]`
- [x] Aceita payload estruturado `{ venda, recibos, pagamentos }`.
- [x] Atualiza tabela principal de vendas com campos completos.
- [x] Regrava vínculos de pagamentos.
- [x] Regrava vínculos de recibos.
- [x] Mantém validação de vendedor por escopo/perfil (gestor/master/admin).
- [x] Valida UUIDs críticos (`vendedor_id`, `cliente_id`, `destino_id`).
- [x] Exige pelo menos um recibo válido.

### 3) `vendas/nova`
- [x] Reestruturado para wizard em 3 etapas.
- [x] Bloco de dados da venda com campos principais.
- [x] Bloco de recibos com múltiplos itens e recibo principal.
- [x] Bloco de pagamentos com múltiplos itens.
- [x] Suporte a parcelas (`parcelas_qtd`, `parcelas_valor`, `parcelas[]`).
- [x] Cálculo base de totais para envio do payload.
- [x] Envio de payload completo para `POST /api/v1/vendas/create`.
- [x] Campos de contrato, DU e RAV presentes.

### 4) `vendas/+page` (consulta)
- [x] Clique na linha abre registro.
- [x] Filtros de período aplicados (todos, mês atual, mês anterior, mês específico, intervalo de dia).
- [x] Filtros de status e tipo no backend.
- [x] Filtro de vendedor por escopo (quando aplicável).
- [x] KPIs carregados da API (total vendas, taxas, líquido, seguro).
- [x] Colunas ampliadas: cliente, vendedor, destino/cidade, produto, embarque, valor, taxas, conciliação, status.
- [x] Permissões granulares na UI (`can()` para criar/editar/cancelar/excluir recibos).
- [x] Paginação server-side (page/pageSize).
- [x] Filtro de empresa para perfil MASTER (`/api/v1/admin/empresas`).
- [x] Filtro de equipe real para perfil GESTOR (`/api/v1/vendas/gestor-equipe`).
- [x] Auto-open de modal via querystring `?id=`.
- [x] Modal de detalhe com colunas Reserva, link Contrato, datas Lançada em / Embarque.
- [ ] Paridade visual e funcional completa com a consulta do `VendasConsultaIsland.tsx`.

### 5) API `GET /api/v1/vendas/list`
- [x] Enriquecida para retornar:
- `destino_cidade`, `data_final`, `valor_total_bruto`, `valor_taxas`, `produtos`, `conciliado`.
- [x] Busca considera produto/recibos/cidade/destino.
- [x] Filtros de `status` e `tipo`.
- [x] KPIs calculados em cima da lista filtrada.
- [x] Paginação server-side suportada (page/pageSize).
- [x] Filtro de empresa para MASTER.

### 6) Ações avançadas de consulta
- [x] Merge de vendas com modal e busca de candidates.
- [x] Cancelamento de venda com confirmação.
- [x] Recibos complementares (vincular/desvincular).
- [x] Definir recibo principal.
- [x] Excluir recibo.
- [ ] `registrarLog` de auditoria em todas as mutações (ainda ausente).

## Pendências reais (não concluído)
- [ ] Paridade completa da consulta do `VendasConsultaIsland.tsx` (alguns detalhes visuais e overrides de conciliação).
- [ ] `registrarLog` em mutações de vendas.
- [ ] Fluxo de conversão de orçamento em venda (quando aplicável no app legado).
- [ ] Validações avançadas de duplicidade/número de reserva e regras complementares específicas do app legado.
- [ ] Importar Contratos (`vendas/importar`) — ainda é mock; requer porte completo do `VendaContratoImportIsland.tsx` (~2.000 linhas) incluindo OCR, parse de PDF CVC/cruzeiros, autocomplete de cidade, cálculo de DU, duplicidade e captura de contato.
- [ ] Refino de a11y dos formulários (há warnings de associação label/input no projeto).
- [ ] Remover simplificações de UX introduzidas no `vtur-svelte` que não existam no `vtur-app`.

## Observações técnicas
- O projeto possui erros TypeScript preexistentes fora de Vendas; por isso o `npm run check` global não zera em verde no momento.
- As alterações desta etapa focam paridade funcional de fluxo e payload sem alterar Vouchers.
- Novas APIs criadas: `GET /api/v1/vendas/gestor-equipe`.
- Novos utilitários criados: `src/lib/services/api.ts` (wrapper de fetch com tratamento 401/403).

## Próximo passo recomendado
- Decidir se prioriza o porte completo de **Importar Contratos** (alto esforço) ou avançar para **Clientes** e **Financeiro** (módulos críticos de regra de negócio).

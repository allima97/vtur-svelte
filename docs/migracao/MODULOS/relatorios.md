# Relatórios / Dashboards / Indicadores

## Status
- Parcialmente espelhado com ganho funcional relevante.
- Dashboard principal e hub de relatórios agora usam dados reais.
- Ranking de vendas deixou de usar métricas fake.
- Drill-down básico entre relatórios e registros de origem foi restaurado.

## Validado
- Dashboard principal em [`src/routes/(app)/+page.svelte`](/Users/allima97/Documents/GitHub/vtur-svelte/src/routes/(app)/+page.svelte) consumindo [`src/routes/api/v1/dashboard/summary/+server.ts`](/Users/allima97/Documents/GitHub/vtur-svelte/src/routes/api/v1/dashboard/summary/+server.ts).
- Hub de relatórios em [`src/routes/(app)/relatorios/+page.svelte`](/Users/allima97/Documents/GitHub/vtur-svelte/src/routes/(app)/relatorios/+page.svelte) com KPIs e gráficos reais.
- Base de filtros compartilhada em [`src/routes/api/v1/relatorios/base/+server.ts`](/Users/allima97/Documents/GitHub/vtur-svelte/src/routes/api/v1/relatorios/base/+server.ts).
- Relatórios de vendas, produtos, destinos, clientes e ranking com filtros de período e escopo.
- Navegação por clique na linha sem botões de ação por linha.

## Corrigido
- Dashboard:
  - filtros por data, empresa e vendedor;
  - tabela de orçamentos recentes sem coluna de ações;
  - clique na linha abrindo o orçamento.
- Hub de relatórios:
  - removidos KPIs e gráficos estáticos;
  - cards dos relatórios passaram a refletir métricas reais do período;
  - atalho com repasse de filtros para relatórios filhos.
- Relatório de vendas:
  - suporte a drill-down por cliente, destino, produto, tipo de produto e vendedor;
  - exportação CSV real;
  - clique na linha abrindo a venda.
- Ranking:
  - cálculo real de receita, comissão, ticket médio, orçamentos, conversão, meta, atingimento e tendência;
  - filtros por empresa, vendedor e período;
  - clique na linha abrindo o detalhamento de vendas do responsável.
- Relatórios agrupados:
  - produtos, destinos e clientes passaram a aceitar escopo por empresa/vendedor;
  - exportação CSV real;
  - drill-down restaurado.

## Pendências reais
- Portar preferências persistidas de widgets e personalização do dashboard como no `vtur-app`.
- Validar/exportar formatos adicionais do legado quando houver equivalentes reais além de CSV.
- Revisar dashboards específicos por papel do `vtur-app` (`admin`, `master`, `gestor`, `financeiro`, `logs`) para decidir se ficam como rotas próprias ou como variações do dashboard principal.
- Aprofundar filtros analíticos avançados do legado em vendas agrupadas.
- Revisar se existem relatórios adicionais no `vtur-app` fora deste eixo principal que ainda não ganharam rota equivalente no Svelte.

## Checklist
- [x] Dashboard com dados reais
- [x] KPIs reais
- [x] Gráficos reais
- [x] Filtros por período
- [x] Filtros por escopo
- [x] Ranking sem métricas fake
- [x] Drill-down básico
- [x] Clique na linha em tabelas analíticas
- [x] Documentação atualizada
- [ ] Widgets persistidos
- [ ] Dashboards específicos por papel
- [ ] Paridade completa de exportações do legado

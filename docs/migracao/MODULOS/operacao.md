# Modulo Operação / Viagens — Status de Migracao (`vtur-app` -> `vtur-svelte`)

## Objetivo do modulo
- Espelhar o fluxo operacional de Viagens do `vtur-app` no `vtur-svelte`.
- Preservar regras de negocio, compatibilidade com Supabase e o padrao UX aprovado:
- Sem botoes de acao por linha na listagem.
- Clique na linha abre o registro.

## Fonte de verdade utilizada
- `vtur-app` fluxo de operação/viagens
- Schema do Supabase: tabelas `viagens`, `viagem_passageiros`, `vendas`, `vendas_recibos`, `vouchers`

## Status geral atual
- **CONCLUÍDO** - O modulo de Operação / Viagens foi revisado e corrigido.

## Checklist de paridade

### 1) `operacao/viagens/+page.svelte` (Listagem)
- [x] Mantido padrao sem acoes por linha.
- [x] Clique na linha abre o detalhe da viagem.
- [x] Colunas da tabela:
  - Código
  - Cliente (com destino em sublinha)
  - Período (com duração e alertas)
  - Viajantes
  - Valor Total
  - Status (com badges coloridos)
  - Responsável
- [x] KPIs adicionados:
  - Total
  - Programadas
  - Em Andamento
  - Concluídas
  - Viajantes
  - Valor Total
- [x] Filtros operacionais:
  - Status (todos, programada, em_andamento, concluida, cancelada)
  - Período (hoje, esta semana, este mês, próximos 30 dias)
- [x] Busca funcional por:
  - Cliente
  - Código
  - Destino
  - Responsável
- [x] Exportação para CSV
- [x] Cálculo automático de dias de viagem
- [x] Alertas de proximidade na data

### 2) `operacao/viagens/[id]` (Detalhe)
- [x] Header com breadcrumbs e ações
- [x] Status banner com última atualização
- [x] KPIs principais:
  - Data de Saída
  - Data de Retorno
  - Duração
  - Viajantes
- [x] Layout em duas colunas (conteúdo + sidebar)
- [x] Dados do Cliente com:
  - Nome e link para ficha
  - Email
  - Telefone
  - WhatsApp
- [x] Informações da Viagem com:
  - Origem
  - Destino
  - Período completo
- [x] Recibos da Viagem:
  - Lista detalhada com produto
  - Números de recibo e reserva
  - Datas
  - Valores e taxas
  - Total geral
- [x] Vouchers vinculados:
  - Tipo, fornecedor, status
  - Valor
  - Link para adicionar novo
- [x] Passageiros:
  - Nome e documento
  - Grid responsivo
- [x] Observações e Follow Up
- [x] Resumo Financeiro (sidebar):
  - Valor total
  - Valor pago
  - Saldo devedor
- [x] Histórico de mudanças (sidebar)
- [x] Ações rápidas (sidebar):
  - Mudar Status
  - Novo Voucher
  - Excluir Viagem
- [x] Modal de edição completo
- [x] Modal de mudança de status
- [x] Dialog de confirmação de exclusão

### 3) APIs de Viagens
- [x] `GET /api/v1/viagens` - Listagem com:
  - Filtros de status e período
  - Join com clientes
  - Join com responsáveis (usuários)
  - Contagem de passageiros
  - Valores das vendas
  - Detecção automática de tipo (nacional/internacional)
- [x] `GET /api/v1/viagens/[id]` - Detalhe com:
  - Dados completos da viagem
  - Cliente completo
  - Venda com recibos
  - Produtos dos recibos
  - Vouchers com fornecedores
  - Passageiros
- [x] `PATCH /api/v1/viagens/[id]` - Atualização com:
  - Validação de permissões
  - Campos permitidos
  - Verificação de escopo
- [x] `DELETE /api/v1/viagens/[id]` - Exclusão com:
  - Validação de permissões
  - Verificação de escopo
- [x] Todas as APIs com autenticação via `requireAuthenticatedUser`
- [x] Todas as APIs com verificação de escopo/permissões
- [x] Uso de `getAdminClient()` para acesso ao Supabase

### 4) Status Operacionais
- [x] Status: planejada, confirmada, em_viagem, concluida, cancelada
- [x] Cores consistentes para cada status
- [x] Mudança de status via modal dedicado
- [x] Histórico de mudanças de status

### 5) Vínculos Operacionais
- [x] Vínculo com Venda (link para visualizar)
- [x] Vínculo com Recibos (detalhes completos)
- [x] Vínculo com Vouchers (listagem + criação)
- [x] Vínculo com Passageiros
- [x] Vínculo com Cliente (ficha completa)

### 6) Regras de Negócio
- [x] Escopo por perfil (admin, master, gestor, vendedor)
- [x] Permissões de acesso (view, edit, delete)
- [x] Cálculo automático de dias de viagem
- [x] Validação de campos obrigatórios
- [x] Controle de follow up (aberto/fechado)

## Arquivos Alterados/Criados

### Frontend
- `src/routes/(app)/operacao/viagens/+page.svelte` - Reescrita da listagem
- `src/routes/(app)/operacao/viagens/[id]/+page.svelte` - Reescrita do detalhe

### Backend
- `src/routes/api/v1/viagens/+server.ts` - Melhorado com filtros de período
- `src/routes/api/v1/viagens/[id]/+server.ts` - Mantido (já estava funcional)

### Documentação
- `docs/migracao/MODULOS/operacao.md` - **NOVO** - Documentação completa

## Pendências
- [ ] Criação de nova viagem (fluxo separado de vendas)
- [ ] Timeline detalhada de eventos operacionais
- [ ] Notificações automáticas de status
- [ ] Checklist operacional por etapa
- [ ] Integração com fornecedores externos
- [ ] Emissão automática de vouchers

## Observações Técnicas
- O modulo segue o padrão estabelecido no `vtur-svelte` para Vendas e Orçamentos
- Uso consistente de componentes UI (PageHeader, Card, Button, KPICard, DataTable, Badge, Dialog)
- Integração com sistema de permissões via `ensureModuloAccess`
- Escopo por perfil respeitado em todas as APIs
- Não foram alterados módulos de Vouchers (conforme solicitado)

## Próximo Passo Recomendado
- Implementar fluxo de criação de viagem independente
- Adicionar timeline operacional mais detalhada
- Integrar com módulo de fornecedores

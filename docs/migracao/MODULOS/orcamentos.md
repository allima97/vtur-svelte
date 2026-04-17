# Modulo Orçamentos — Status de Migracao (`vtur-app` -> `vtur-svelte`)

## Objetivo do modulo
- Espelhar o fluxo operacional de Orçamentos do `vtur-app` no `vtur-svelte`.
- Preservar regras de negocio, compatibilidade com Supabase e o padrao UX aprovado:
- Sem botoes de acao por linha na listagem.
- Clique na linha abre o registro.

## Fonte de verdade utilizada
- `vtur-app` fluxo de orçamentos (listagem, criação, edição, detalhe)
- Schema do Supabase: tabelas `quote`, `quote_item`, `interacoes_quotes`

## Status geral atual
- **CONCLUÍDO** - O modulo de Orçamentos foi revisado e corrigido para espelhar o vtur-app.

## Checklist de paridade

### 1) `orcamentos/+page.svelte` (Listagem)
- [x] Mantido padrao sem acoes por linha.
- [x] Clique na linha abre o detalhe do orcamento.
- [x] Colunas da tabela:
  - Código
  - Cliente (com destino em sublinha)
  - Data de Criação
  - Data de Validade (com alerta de proximidade)
  - Valor Total
  - Status (com badges coloridos)
  - Responsável/Vendedor
- [x] KPIs adicionados:
  - Total
  - Novos
  - Pendentes
  - Enviados
  - Aprovados
  - Valor do Pipeline (com subtotal de aprovados)
- [x] Filtros operacionais:
  - Status (todos, novo, pendente, enviado, aprovado, rejeitado, expirado)
  - Período (hoje, esta semana, este mês, mês passado)
- [x] Busca funcional por:
  - Cliente
  - Código
  - Destino
  - Responsável
- [x] Exportação para CSV

### 2) `orcamentos/novo` (Criação)
- [x] Seleção de cliente com busca dinâmica
- [x] Data de validade com atalhos (7, 15, 30 dias)
- [x] Seleção de moeda (BRL, USD, EUR)
- [x] Adição de múltiplos itens com:
  - Descrição
  - Tipo (serviço, pacote, hotel, passagem, passeio, transfer, seguro, outro)
  - Destino/Cidade
  - Quantidade
  - Valor unitário
  - Total (calculado automaticamente)
- [x] Cálculo automático de totais
- [x] Observações/condições
- [x] Ações: Salvar Rascunho, Salvar e Enviar
- [x] Validações de campos obrigatórios

### 3) `orcamentos/[id]/editar` (Edição) - **NOVO**
- [x] Página de edição criada
- [x] Carrega dados existentes do orçamento
- [x] Permite alterar:
  - Cliente
  - Status
  - Data de validade
  - Moeda
  - Itens (adicionar/remover/alterar)
  - Observações
- [x] Calcula totais automaticamente
- [x] Salva alterações via PATCH
- [x] Ações: Salvar Alterações, Salvar e Enviar

### 4) `orcamentos/[id]` (Detalhe)
- [x] Carrega dados completos do orçamento
- [x] Exibe status com banner colorido
- [x] Exibe alerta de expiração
- [x] KPIs do orçamento:
  - Valor Total
  - Quantidade de Itens
  - Validade
  - Moeda
- [x] Dados do cliente (nome, email, telefone)
- [x] Tabela de itens completa
- [x] Observações
- [x] Histórico de interações (timeline)
- [x] Ações operacionais:
  - Enviar ao Cliente
  - Aprovar
  - Rejeitar
  - Criar Venda (quando aprovado)
  - Registrar Interação
  - Editar
  - Imprimir
  - Excluir
- [x] Integração com modal de interação
- [x] Botão de voltar para listagem

### 5) APIs de Orçamentos
- [x] `GET /api/v1/orcamentos/list` - Listagem com filtros e escopo
- [x] `POST /api/v1/orcamentos/create` - Criação de orçamento
- [x] `GET /api/v1/orcamentos/[id]` - Detalhe do orçamento
- [x] `PATCH /api/v1/orcamentos/[id]` - Atualização completa (inclui itens)
- [x] `DELETE /api/v1/orcamentos/[id]` - Exclusão com cascata
- [x] `GET /api/v1/orcamentos/interacao` - Listar interações
- [x] `POST /api/v1/orcamentos/interacao` - Criar interação
- [x] `PATCH /api/v1/orcamentos/status` - Atualizar status
- [x] Todas as APIs com autenticação via `requireAuthenticatedUser`
- [x] Todas as APIs com verificação de escopo/permissões
- [x] Uso de `getAdminClient()` para acesso ao Supabase

### 6) Modais e Interações
- [x] `ModalInteracaoQuote.svelte` - Modal de registro de interações
- [x] Tipos de interação: Ligação, WhatsApp, Email, Reunião, Outro
- [x] Seleção de status da negociação
- [x] Agendamento de próximo contato
- [x] Observações
- [x] Timeline de histórico
- [x] Atualização automática de status do orçamento

### 7) Integração com Vendas
- [x] Botão "Criar Venda" visível quando orçamento aprovado
- [x] Redirecionamento para `/vendas/nova?orcamento={id}`
- [x] Pré-carregamento de dados do orçamento na criação de venda:
  - Cliente
  - Observações (com referência ao orçamento)

### 8) Regras de Negócio
- [x] Escopo por perfil (admin, master, gestor, vendedor)
- [x] Permissões de acesso (view, create, edit, delete)
- [x] Status operacionais: novo, pendente, enviado, aprovado, rejeitado, expirado
- [x] Cálculo automático de totais
- [x] Validação de campos obrigatórios
- [x] Controle de validade

## Arquivos Alterados/Criados

### Frontend
- `src/routes/(app)/orcamentos/+page.svelte` - Reescrita da listagem
- `src/routes/(app)/orcamentos/novo/+page.svelte` - Ajustes na criação
- `src/routes/(app)/orcamentos/[id]/+page.svelte` - Reescrita do detalhe
- `src/routes/(app)/orcamentos/[id]/editar/+page.svelte` - **NOVO**
- `src/routes/(app)/vendas/nova/+page.svelte` - Adicionado pré-carregamento de orçamento
- `src/lib/components/modais/ModalInteracaoQuote.svelte` - Mantido (já existia)

### Backend
- `src/routes/api/v1/orcamentos/list/+server.ts` - Melhorado com filtros de período
- `src/routes/api/v1/orcamentos/create/+server.ts` - Mantido (já estava funcional)
- `src/routes/api/v1/orcamentos/[id]/+server.ts` - Reescrito com padrão do projeto
- `src/routes/api/v1/orcamentos/interacao/+server.ts` - Reescrito com padrão do projeto
- `src/routes/api/v1/orcamentos/status/+server.ts` - Reescrito com padrão do projeto

## Pendências
- [ ] Templates de email para envio de orçamento
- [ ] Geração de PDF do orçamento
- [ ] Notificações automáticas de follow-up
- [ ] Dashboard específico de orçamentos
- [ ] Regras avançadas de workflow automático

## Observações Técnicas
- O modulo segue o padrão estabelecido no `vtur-svelte` para Clientes e Vendas
- Uso consistente de componentes UI (PageHeader, Card, Button, KPICard, DataTable)
- Integração com sistema de permissões via `ensureModuloAccess`
- Escopo por perfil respeitado em todas as APIs
- Não foram alterados módulos de Vouchers (conforme solicitado)

## Próximo Passo Recomendado
- Revisar módulo de Vendas para completar integração com Orçamentos
- Implementar geração de PDF para orçamentos
- Adicionar templates de comunicação

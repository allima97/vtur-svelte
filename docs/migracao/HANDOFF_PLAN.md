# Plano de Handoff — Migração vtur-app → vtur-svelte

Data: 2026-04-16
Status: EM ANDAMENTO

## Objetivo
Completar a migração do vtur-app para vtur-svelte sem alterar o código do vtur-app.

## Regras Obrigatórias
- NÃO mexer no vtur-app
- Preservar todas as regras de negócio
- Espelhar APIs e funcionalidades existentes
- Commits frequentes para visibilidade

## Módulos - Status Atual

| Módulo | Status | Pendências |
|--------|--------|------------|
| Cadastros Base | ✅ Concluído | - |
| Clientes | 🔄 Avançado | CRM/Avisos, filtros master |
| Vendas | 🔄 Avançado | Importar Contratos, registrarLog |
| Orçamentos | ✅ Concluído | PDF, templates email |
| Operacao/Viagens | ✅ Concluído | Criação独立的viagem |
| Agenda/Tarefas | 🔄 Parcial | Filtros avançados, realtime |
| Relatórios | 🔄 Parcial | Widgets persistidos, dashboards por papel |
| Fornecedores | 🔄 Parcial | Verificar paridade |
| Permissões | 🔄 Parcial | Verificar paridade |

## APIs Pendentes de Migração

### Vendas
- [ ] `vendas/kpis` - endpoint já existe no vtur-svelte
- [ ] `vendas/cadastro-save` - endpoint já existe no vtur-svelte

### Orçamentos
- [ ] `orcamentos/cidades-busca`
- [ ] `orcamentos/cliente-create`
- [ ] `orcamentos/clientes`
- [ ] `orcamentos/delete`
- [ ] `orcamentos/interaction`
- [ ] `orcamentos/produtos`
- [ ] `orcamentos/save`
- [ ] `orcamentos/tipos`

### Viagens
- [ ] `viagens/cidades-busca`
- [ ] `viagens/clientes`
- [ ] `viagens/create`
- [ ] `viagens/delete`
- [ ] `viagens/dossie-batch`
- [ ] `viagens/list`

### Documentos de Viagens
- [ ] `documentos-viagens/create`
- [ ] `documentos-viagens/delete`
- [ ] `documentos-viagens/list`
- [ ] `documentos-viagens/save-template`
- [ ] `documentos-viagens/update`

## Tarefas de Handoff

### Fase 1: Sincronizar Migrations
- [ ] Identificar migrations do vtur-app ausentes no vtur-svelte
- [ ] Espelhar migrations pendentes

### Fase 2: APIs Pendentes
- [ ] Portar APIs listadas acima

### Fase 3: Páginas Pendentes
- [ ] Verificar todas as páginas do vtur-app
- [ ] Garantir que cada página tenha correspondente no vtur-svelte

### Fase 4: Validação
- [ ] Testar build do vtur-svelte
- [ ] Verificar erros TypeScript
- [ ] Commits atômicos por feature

## Progresso

### Commits Feitos

| Data | Commit | Descrição |
|------|--------|-----------|
| 2026-04-16 | `d52c11e2` | feat(migracao): adicionar plano de handoff e migrar APIs pendentes |
| 2026-04-16 | `d456316f` | feat(migracao): espelhar migrations pendentes do vtur-app |

### Migrações Espelhadas (2026-04-16)
- ✅ 20260402_vouchers_module.sql
- ✅ 20260402_voucher_assets_app_icons.sql
- ✅ 20260407_cidades_rls_modulo_write.sql
- ✅ 20260407_system_module_settings.sql
- ✅ 20260409_airline_iata_full_list.sql

### APIs Migradas/Verificadas (2026-04-16)
- ✅ orcamentos/cidades-busca (já existia)
- ✅ orcamentos/clientes (já existia)
- ✅ orcamentos/interacao (já existia)
- ✅ orcamentos/list (já existia)
- ✅ orcamentos/create (já existia)
- ✅ documentos-viagens/list (já existia)
- ✅ commission-rules (já existia)
- ✅ financeiro/ajustes-vendas/list (MIGRADO)
- ✅ cidadesSearch utilitario (MIGRADO)

### Páginas Verificadas (2026-04-16)
- ✅ vtur-svelte: 108 paginas
- ✅ vtur-app: 105 paginas
- Status: vtur-svelte tem mais paginas que vtur-app

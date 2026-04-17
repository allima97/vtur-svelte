# Auditoria Completa de Migração — vtur-app → vtur-svelte

Data: 2026-04-17
Schema de Referência: banco_vtur.txt (135 tabelas)

## RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Total de tabelas no schema | 135 |
| APIs no vtur-app | 172 |
| APIs no vtur-svelte | 196 |
| Tabelas sem APIs detectadas | 9 |

## TABELAS CRÍTICAS - STATUS

### ✅ Tabelas com APIs Implementadas

| Tabela | Status | APIs |
|--------|--------|------|
| vendas | ✅ Completo | vendas/list, vendas/create, vendas/[id], vendas/kpis, etc |
| vendas_recibos | ✅ Completo | conciliación, ajustes-vendas |
| vendas_pagamentos | ✅ Completo | pagamentos/*, vendas/* |
| clientes | ✅ Completo | clientes/*, historico, acompanhantes |
| quote/quote_item | ✅ Completo | orcamentos/* |
| produtos/tipo_produtos | ✅ Completo | produtos/*, cadastros |
| fornecedores | ✅ Completo | fornecedores/* |
| formas_pagamento | ✅ Completo | formas-pagamento/* |
| users/companies | ✅ Completo | admin/*, perfil/* |
| viagens | ✅ Completo | viagens/*, dossie/* |
| users | ✅ Completo | admin/usuarios/* |
| companies | ✅ Completo | admin/empresas/* |
| modulo_acesso | ✅ Completo | admin/permissoes/* |
| master_empresas | ✅ Completo | admin/master-empresas/* |
| gestor_vendedor | ✅ Completo | parametros/equipe/* |
| agenda_itens | ✅ Completo | agenda/*, todo/* |
| conciliacao_recibos | ✅ Completo | conciliacao/* |
| commission_rule | ✅ Completo | commission-rules/* |
| quote_print_settings | ✅ Completo | profile/signature, cards/* |
| user_message_templates | ✅ Completo | crm/library/* |

### ⚠️ Tabelas com APIs PARCIAIS ou via Helpers

| Tabela | Status | Observação |
|--------|--------|------------|
| cidades | ✅ | APIs diretas + helpers compartilhados |
| estados | ✅ | Via subdivisoes |
| paises | ✅ | Via subdivisoes |
| crm_template_categories | ✅ | Via crm/library |
| dashboard_widgets | ✅ | Via preferências |
| logs | ✅ | Via helpers de debug |
| parametros_comissao | ✅ | Via financeiro |
| user_crm_assinaturas | ✅ | Via profile |
| user_type_default_perms | ✅ | Via admin/permissoes |
| escala_mes/escala_dia | ✅ | Via parametros/escalas |

### ❌ Tabelas SEM APIs Diretas (Gap)

| Tabela | Prioridade | Descrição |
|--------|------------|-----------|
| escala_horario_usuario | Média | Horários de trabalho por usuário |
| airline_iata_codes | Baixa | Códigos IATA de companhias aéreas |
| airline_iata_aliases | Baixa | Aliases de companhias aéreas |
| card_themes_v2 | Média | Temas visuais de cards (via helpers) |
| cliente_template_dispatches | Alta | Histórico de envios CRM |
| cron_log_alertas | Baixa | Logs de alertas cron |
| push_subscriptions | Média | Assinaturas push |
| system_documentation | Baixa | Documentação do sistema |
| system_documentation_sections | Baixa | Seções de documentação |
| system_module_settings | Média | Settings de módulos |

## ANÁLISE DE FOREIGN KEYS CRÍTICAS

### vendas (Tabela Principal)
```sql
vendas -> clientes(id)         ✅ OK
vendas -> produtos(id)         ✅ OK
vendas -> tipo_produtos(id)   ✅ OK
vendas -> users(vendedor_id)  ✅ OK
vendas -> cidades(destino_cidade_id) ✅ OK
vendas -> companies(company_id) ✅ OK
```

### vendas_recibos
```sql
vendas_recibos -> vendas(id)               ✅ OK
vendas_recibos -> tipo_produtos(produto_id) ✅ OK
vendas_recibos -> produtos(produto_resolvido_id) ✅ OK
```

### vendas_pagamentos
```sql
vendas_pagamentos -> vendas(id)            ✅ OK
vendas_pagamentos -> formas_pagamento(id)   ✅ OK
vendas_pagamentos -> companies(company_id) ✅ OK
vendas_pagamentos -> vendas_recibos(id)    ✅ OK
```

### viagens
```sql
viagens -> vendas(id)                     ✅ OK
viagens -> companies(company_id)          ✅ OK
viagens -> users(responsavel_user_id)    ✅ OK
viagens -> clientes(id)                   ✅ OK
viagens -> vendas_recibos(recibo_id)      ✅ OK
```

### quote/quote_item
```sql
quote -> users(created_by)                ✅ OK
quote -> clientes(client_id)              ✅ OK
quote -> cidades(destino_cidade_id)        ✅ OK
quote_item -> quote(id)                   ✅ OK
quote_item -> cidades(cidade_id)           ✅ OK
```

## CAMINHOS CRÍTICOS VERIFICADOS

### 1. Cadastro de Venda
```
vendas/nova → POST /api/v1/vendas/create
  ↓
Cria: vendas + vendas_recibos + vendas_pagamentos
  ↓
Se orçamento: atualiza quote.status_negociacao = 'Fechado'
  ↓
Se viagem: cria viagem com vínculos corretos
```

### 2. Consulta de Venda
```
vendas/[id] → GET /api/v1/vendas/[id]
  ↓
Carrega: vendas + recibos + pagamentos + cliente + vendedor
  ↓
Calcula: totais, comissões, status
```

### 3. Importação de Contratos
```
POST /api/v1/vendas/importar-contrato
  ↓
Parse PDF → cria vendas_recibos
  ↓
Valida duplicidade por numero_recibo
  ↓
Aplica normalização de numero_recibo_normalizado
```

### 4. Conciliação
```
GET /api/v1/conciliacao/list
  ↓
Busca: conciliacao_recibos + vendas_recibos
  ↓
Aplica: rateio, ranking, is_baixa_rac
  ↓
Retorna: lista com vínculos corretos
```

## GAPS IDENTIFICADOS E AÇÕES

### Gap 1: escala_horario_usuario (MÉDIA)
- **Descrição**: Tabela para horário de trabalho por usuário
- **Status**: Não tem API dedicated
- **Impacto**: Parâmetros/Escalas não salva horários
- **Ação**: Adicionar API ou integrar em parametros/escalas

### Gap 2: cliente_template_dispatches (ALTA)
- **Descrição**: Histórico de envios de templates CRM
- **Status**: API send existe mas não persiste dispatch
- **Impacto**: Não registra histórico de envios
- **Ação**: Criar API para salvar dispatch

### Gap 3: airline_iata_* (BAIXA)
- **Descrição**: Códigos IATA para roteiros aéreos
- **Status**: Migration existe mas sem API
- **Impacto**: Não autocomplete companhias aéreas
- **Ação**: Adicionar quando necessário

### Gap 4: push_subscriptions (MÉDIA)
- **Descrição**: Assinaturas push
- **Status**: Não tem API
- **Impacto**: Não suporta notifications
- **Ação**: Adicionar quando implementarem push

## VALIDAÇÃO DE SCHEMA

### Campos Críticos Verificados

| Tabela.Campo | Tipo | API Responsável |
|--------------|------|-----------------|
| vendas.numero_recibo_normalizado | text | vendas/create, vendas/[id] |
| vendas.company_id | uuid | Todas APIs de vendas |
| vendas.data_venda | date | Relatórios, KPIs |
| vendas_recibos.is_baixa_rac | boolean | Conciliação |
| vendas_pagamentos.venda_recibo_id | uuid | Pagamentos |
| conciliacao_recibos.ranking_vendedor_id | uuid | Ranking |
| users.avatar_url | text | Perfil |

## RECOMENDAÇÕES

1. **Alta Prioridade**: Implementar persistência de `cliente_template_dispatches`
2. **Média Prioridade**: Integrar `escala_horario_usuario` em parametros/escalas
3. **Baixa Prioridade**: Adicionar autocomplete de `airline_iata_codes` quando necessário

## PRÓXIMOS PASSOS

1. [x] Implementar API cliente_template_dispatches ✅
2. [x] Integrar escala_horario_usuario em parametros/escalas ✅
3. [x] Corrigir profile/signature para paridade com legado ✅
4. [ ] Verificar se airline_iata está sendo usado em roteiros
5. [ ] Testar fluxos completos de vendas → conciliacao
6. [ ] Validar com dados reais

## CORREÇÕES APLICADAS (2026-04-17)

### 1. cliente_template_dispatches ✅
- Criada API GET/POST em `src/routes/api/v1/clientes/template-dispatches/`
- Registra histórico de envios CRM

### 2. escala_horario_usuario ✅
- Integrada em `src/routes/api/v1/parametros/escalas/`
- GET retorna horariosUsuario
- POST suporta action=upsert_horario_usuario

### 3. profile/signature ✅
- Corrigida para usar quote_print_settings (não users)
- Paridade com legado vtur-app

## COMMITS REALIZADOS (GitHub)

| Commit | Descrição |
|--------|-----------|
| 8426d4ea | feat(migracao): APIs kriticas e paridade com legado |
| 95988b95 | fix(profile/signature): alinhar com legado usando quote_print_settings |
| 11b1e01b | feat(auditoria): adicionar APIs faltantes e documentacao completa |
| fe1e0f2c | feat(clientes/templates): migrar API de envio de templates CRM |
| cd23d337 | docs(migracao): atualizar plano de handoff com progresso do dia |
| d456316f | feat(migracao): espelhar migrations pendentes do vtur-app |
| d52c11e2 | feat(migracao): adicionar plano de handoff e migrar APIs pendentes |

## APIs ADICIONADAS/CORRIGIDAS (2026-04-17)

| API | Status | Descrição |
|-----|--------|-----------|
| admin/maintenance | ✅ Corrigido | Paridade com legado (mantem updated_at) |
| clientes/delete | ✅ Criado | API desabilitada (403) como legado |
| operacao/preferencias | ✅ Atualizado | Suporte a share/accept/revoke |
| roteiros | ✅ Atualizado | Suporte a sugestoes (busca/salvar/remover) |
| clientes/template-dispatches | ✅ Criado | Historico de envios CRM |
| parametros/escalas | ✅ Atualizado | Suporte a escala_horario_usuario |
| profile/signature | ✅ Corrigido | Usa quote_print_settings |

## APIs MIGRADAS ADICIONAIS (2026-04-17 - Continuacao)

| API | Status | Descrição |
|-----|--------|-----------|
| health | ✅ Migrado | Health check endpoint |
| convites/accept | ✅ Migrado | Aceitar convite corporativo |
| convites/send | ✅ Migrado | Enviar convite corporativo |
| consultorias | ✅ Migrado | CRUD de consultorias online |
| consultorias/ics | ✅ Migrado | Gerar arquivo ICS para consultoria |
| welcome-email | ✅ Migrado | Enviar e-mail de boas-vindas |
| documentacao | ✅ Migrado | Buscar documentacao do sistema |
| push/subscribe | ✅ Migrado | Inscrever push notification |
| push/unsubscribe | ✅ Migrado | Desinscrever push notification |
| equipe/relacao | ✅ Migrado | Gerenciar relacao gestor-vendedor |
| importar-vendas | ✅ Migrado | Placeholder (410 Gone como legado) |
| cron/alerta-comissao | ✅ Migrado | Placeholder para cron de alertas |
| cron/lembretes-consultoria | ✅ Migrado | Placeholder para cron de lembretes |

## HELPERS CRIADOS

| Arquivo | Descrição |
|---------|-----------|
| lib/server/emailMarkdown.ts | Renderizar emails em HTML/texto |
| lib/server/emailSettings.ts | Configuracoes de email (Resend/SendGrid/SMTP) |

# Auditoria Geral de Paridade — `vtur-app` -> `vtur-svelte`

Data da varredura: `2026-04-13`

## Regra-mestra

- A fonte de verdade continua sendo o `vtur-app`.
- Nenhuma decisao desta auditoria autoriza mudanca de regra de negocio.
- O objetivo aqui e identificar onde o `vtur-svelte` ainda nao espelha integralmente schema, APIs, fluxos e persistencia do legado.

## Fontes utilizadas nesta varredura

- `vtur-app/src/pages`
- `vtur-app/src/pages/api`
- `vtur-app/database/migrations`
- `vtur-svelte/src/routes`
- `vtur-svelte/src/routes/api`
- `vtur-svelte/supabase/migrations`
- `/Users/allima97/Desktop/banco_vtur.txt`

## Achados estruturais

### 1) Gap de migrations

- `vtur-app` possui `281` migrations SQL.
- `vtur-svelte` possui `232` migrations SQL.
- Isso significa que o `vtur-svelte` ainda nao pode ser considerado autossuficiente do ponto de vista de schema/historia de banco.
- Hoje ele depende, na pratica, de o banco ja estar alinhado pelo legado ou por aplicacoes manuais externas.

### 2) Gap de APIs do legado sem espelho direto no `vtur-svelte`

#### Vendas
- `vendas/cadastro-save`
- `vendas/kpis`

#### Orcamentos
- `orcamentos/cidades-busca`
- `orcamentos/cliente-create`
- `orcamentos/clientes`
- `orcamentos/delete`
- `orcamentos/interaction`
- `orcamentos/produtos`
- `orcamentos/save`
- `orcamentos/tipos`

#### Viagens
- `viagens/cidades-busca`
- `viagens/clientes`
- `viagens/create`
- `viagens/delete`
- `viagens/dossie-batch`
- `viagens/list`

#### Documentos de viagens
- `documentos-viagens/create`
- `documentos-viagens/delete`
- `documentos-viagens/list`
- `documentos-viagens/save-template`
- `documentos-viagens/update`

#### Dashboard

#### CRM / Cards
- `crm/library`
- `cards/aniversario.svg`
- `cards/render`
- `cards/render.png`
- `cards/render.svg`

#### Relatorios auxiliares

## Correcoes aplicadas nesta rodada

### Vendas — persistencia real alinhada ao legado

Foi corrigido o fluxo de persistencia de `Vendas` no `vtur-svelte` para aproximar o comportamento do `vtur-app` em:

- normalizacao de `numero_recibo` e persistencia de `numero_recibo_normalizado`;
- validacao de duplicidade de recibo e reserva no escopo da company;
- recriacao consistente de `vendas_recibos`, `vendas_pagamentos`, `viagens` e `viagem_passageiros`;
- ligacao de pagamento com `venda_recibo_id`;
- fechamento de orcamento via `quote.status_negociacao = 'Fechado'` quando ha `orcamento_id`;
- validacao de atribuicao de vendedor com regra corporativa.

Arquivos:

- `src/lib/server/vendasSave.ts`
- `src/routes/api/v1/vendas/create/+server.ts`
- `src/routes/api/v1/vendas/[id]/+server.ts`

### Conciliacao — contratos auxiliares do legado portados

Foi portada a camada auxiliar de `Conciliação` que ainda faltava no `vtur-svelte`, preservando os contratos do legado para:

- listagem operacional com filtros de pendente, conciliado, ranking e baixa RAC;
- busca de recibo por numero (`lookup`);
- historico de alteracoes (`changes`);
- execucoes de conciliacao (`executions`);
- heranca de registros anteriores por documento (`existing`);
- reversao de alteracoes em taxas (`revert`).

Arquivos:

- `src/routes/api/v1/conciliacao/_legacy.ts`
- `src/routes/api/v1/conciliacao/list/+server.ts`
- `src/routes/api/v1/conciliacao/lookup/+server.ts`
- `src/routes/api/v1/conciliacao/executions/+server.ts`
- `src/routes/api/v1/conciliacao/changes/+server.ts`
- `src/routes/api/v1/conciliacao/existing/+server.ts`
- `src/routes/api/v1/conciliacao/revert/+server.ts`

### Preferencias e Mural — contratos legados adicionados

Foram adicionadas as rotas de compatibilidade do legado para `Minhas Preferencias` e `Mural`, mantendo a mesma semantica operacional do `vtur-app`:

- `Preferencias`: `base`, `list`, `save`, `delete`, `share`, `share-accept`, `share-revoke`, `cidades-busca`;
- `Mural`: `bootstrap`, `company`, `recados`.

Arquivos:

- `src/routes/api/v1/preferencias/_shared.ts`
- `src/routes/api/v1/preferencias/base/+server.ts`
- `src/routes/api/v1/preferencias/list/+server.ts`
- `src/routes/api/v1/preferencias/save/+server.ts`
- `src/routes/api/v1/preferencias/delete/+server.ts`
- `src/routes/api/v1/preferencias/share/+server.ts`
- `src/routes/api/v1/preferencias/share-accept/+server.ts`
- `src/routes/api/v1/preferencias/share-revoke/+server.ts`
- `src/routes/api/v1/preferencias/cidades-busca/+server.ts`
- `src/routes/api/v1/mural/_shared.ts`
- `src/routes/api/v1/mural/bootstrap/+server.ts`
- `src/routes/api/v1/mural/company/+server.ts`
- `src/routes/api/v1/mural/recados/+server.ts`

### CRM / Cards — biblioteca e render do legado portados

Foi portada a base tecnica do legado para `CRM/Cards`, preservando os contratos de biblioteca e renderizacao:

- `crm/library`
- `cards/render`
- `cards/render.svg`
- `cards/render.png`
- `cards/aniversario.svg`

Tambem foram trazidos os utilitarios e assets tecnicos do legado para manter a mesma regra de composicao visual e templates oficiais.

Arquivos:

- `src/routes/api/v1/crm/library/+server.ts`
- `src/routes/api/v1/cards/_render.ts`
- `src/routes/api/v1/cards/render/+server.ts`
- `src/routes/api/v1/cards/render.svg/+server.ts`
- `src/routes/api/v1/cards/render.png/+server.ts`
- `src/routes/api/v1/cards/aniversario.svg/+server.ts`
- `src/lib/cards/*`
- `src/lib/messageTemplates.ts`
- `src/lib/whatsapp.ts`
- `src/assets/cards/fonts/*`
- `static/assets/cards/themes-master/*`

### Dashboard — auxiliares do legado fechados

Foi adicionada a compatibilidade direta do legado para:

- `dashboard/widgets`
- `dashboard/debug-aggregates`
- `dashboard/consultorias`

Arquivos:

- `src/routes/api/v1/dashboard/widgets/+server.ts`
- `src/routes/api/v1/dashboard/debug-aggregates/+server.ts`
- `src/routes/api/v1/dashboard/consultorias/+server.ts`

### Relatorios — contratos auxiliares do legado fechados

Foi adicionada a compatibilidade direta do legado para:

- `relatorios/cidades-busca`
- `relatorios/produtos-recibos`
- `relatorios/ranking-vendas`
- `relatorios/vendas-por-cliente`
- `relatorios/vendas-por-destino`
- `relatorios/vendas-por-produto`

Arquivos:

- `src/routes/api/v1/relatorios/cidades-busca/+server.ts`
- `src/routes/api/v1/relatorios/produtos-recibos/+server.ts`
- `src/routes/api/v1/relatorios/ranking-vendas/+server.ts`
- `src/routes/api/v1/relatorios/vendas-por-cliente/+server.ts`
- `src/routes/api/v1/relatorios/vendas-por-destino/+server.ts`
- `src/routes/api/v1/relatorios/vendas-por-produto/+server.ts`

### Schema / migrations — espelhamento estrutural ampliado

Foi ampliada a cobertura estrutural de schema no `vtur-svelte` com o espelhamento direto de migrations do `vtur-app` que sustentam modulos ja portados no projeto Svelte.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20260112_vendas_recibos_complementares.sql`
- `supabase/migrations/20260205_vendas_recibos_notas.sql`
- `supabase/migrations/20260217_perf_indexes_bff.sql`
- `supabase/migrations/20260228_ensure_consultorias_online.sql`
- `supabase/migrations/20260317_conciliacao_recibos.sql`
- `supabase/migrations/20260322_message_template_themes_and_render_styles.sql`
- `supabase/migrations/20260325_crm_scope_column_hotfix.sql`
- `supabase/migrations/20260325_crm_template_scope_rls_hierarchy.sql`
- `supabase/migrations/20260326_crm_theme_custom_logo.sql`
- `supabase/migrations/20260327_crm_categories_and_scope.sql`
- `supabase/migrations/20260406_conciliacao_is_baixa_rac.sql`
- `supabase/migrations/20260408_conciliacao_valor_nao_comissionavel.sql`
- `supabase/migrations/20260408_vendas_pagamentos_venda_recibo_id.sql`
- `supabase/migrations/20260409_vendas_recibos_numero_normalizado.sql`

Cobertura estrutural melhorada para:

- `Vendas` e suas tabelas auxiliares de recibos, pagamentos e notas;
- `Conciliação`, incluindo `is_baixa_rac` e `valor_nao_comissionavel`;
- `Consultorias` usadas no `Dashboard`;
- `CRM/Cards`, incluindo escopo hierarquico, categorias e customizacao visual;
- indices e suporte de performance usados pelos BFFs legados.

Observacao importante:

- Esse espelhamento deixa o repositorio `vtur-svelte` mais fiel ao legado, mas nao elimina todo o gap historico de schema. Ainda ha migrations do `vtur-app` sem reflexo no projeto Svelte.

### Schema / migrations — bloco de company, clientes, convites e competencia espelhado

Foi ampliado o espelhamento de schema do legado para um segundo bloco estrutural que sustenta regras corporativas ja existentes no `vtur-app`.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20260205_clientes_created_by_backfill.sql`
- `supabase/migrations/20260205_clientes_privacidade.sql`
- `supabase/migrations/20260206_vendas_company_id.sql`
- `supabase/migrations/20260211_user_convites.sql`
- `supabase/migrations/20260211_vendas_data_venda.sql`
- `supabase/migrations/20260213_relatorios_competencia_data_venda.sql`
- `supabase/migrations/20260303_clientes_rls_company_claim_fix.sql`
- `supabase/migrations/20260304_clientes_rls_recursion_hotfix.sql`
- `supabase/migrations/20260305_clientes_shared_by_cpf_company_link.sql`
- `supabase/migrations/20260306_clientes_created_by_default_trigger.sql`
- `supabase/migrations/20260311_user_convites_expiration.sql`
- `supabase/migrations/20260311_users_self_lockdown.sql`
- `supabase/migrations/20260312_agenda_todo_user_privacy.sql`
- `supabase/migrations/20260312_rls_escala_horario_usuario_master_company_match.sql`
- `supabase/migrations/20260312_rls_escalas_master_company_match.sql`
- `supabase/migrations/20260312_rls_gestor_vendedor_master_scope.sql`
- `supabase/migrations/20260312_user_types_default_perms.sql`
- `supabase/migrations/20260315_clientes_resolve_import_rpc.sql`

Cobertura estrutural melhorada para:

- `Clientes`, incluindo privacidade, `created_by`, compartilhamento por CPF e importacao;
- `Vendas`, incluindo `company_id` e competencia via `data_venda`;
- `Relatórios`, incluindo apuracao por competencia correta;
- `Convites`, usuarios e permissoes corporativas;
- `Agenda`, `To Do` e partes do escopo operacional por company.

### Schema / migrations — bloco de KPI, totais, dispatches e rateio espelhado

Foi espelhado um terceiro bloco estrutural do legado com impacto direto em KPIs, dashboard, templates enviados ao cliente, filtros de totais e conciliacao de recibos.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20260217_rpc_vendas_kpis.sql`
- `supabase/migrations/20260218_rpc_dashboard_vendas_summary.sql`
- `supabase/migrations/20260326_template_master_layout_lock.sql`
- `supabase/migrations/20260328_clientes_cpf_normalization_hardening.sql`
- `supabase/migrations/20260330_cliente_template_dispatches.sql`
- `supabase/migrations/20260330_vendas_recibos_conciliacao_status_rpc.sql`
- `supabase/migrations/20260330_vendas_recibos_conciliacao_status_vendor_fix.sql`
- `supabase/migrations/20260407_exclude_baixa_rac_from_vendas_totals.sql`
- `supabase/migrations/20260407_kpi_vendas_filter_nao_comissionaveis.sql`
- `supabase/migrations/20260408_fix_sistema_valor_taxas_swap.sql`
- `supabase/migrations/20260408_gestor_same_company_visibility.sql`
- `supabase/migrations/20260408_vendas_clientes_base_modulo_fix.sql`
- `supabase/migrations/20260412_vendas_recibos_rateio.sql`

Cobertura estrutural melhorada para:

- `Vendas`, incluindo KPI legado, exclusao de baixa RAC, filtro de nao comissionaveis e rateio de recibos;
- `Dashboard`, incluindo a mesma base agregada do legado para totais comerciais;
- `Conciliação`, incluindo status de recibo e ajustes de taxas;
- `Clientes`, incluindo endurecimento de normalizacao de CPF e dispatches de templates;
- `CRM/Cards`, incluindo trava de layout master.

### Schema / migrations — bloco de templates, roteiros e parametrizacao operacional espelhado

Foi espelhado um quarto bloco estrutural do legado com foco em parametrizacao de conciliacao, biblioteca de mensagens do CRM, relacionamento de equipes e campos de `Roteiros`.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20260318_conciliacao_import_rules.sql`
- `supabase/migrations/20260319_clientes_corporate_normalize_and_link.sql`
- `supabase/migrations/20260319_conciliacao_ranking_assignments.sql`
- `supabase/migrations/20260319_parametros_conciliacao_comissionamento.sql`
- `supabase/migrations/20260319_parametros_conciliacao_escalonavel.sql`
- `supabase/migrations/20260319_parametros_conciliacao_faixas_loja.sql`
- `supabase/migrations/20260319_vendas_recibos_cancelamento_conciliacao.sql`
- `supabase/migrations/20260320_gestor_vendedor_relacao_rpc.sql`
- `supabase/migrations/20260320_gestor_vendedor_relacao_rpc_permissions_fix.sql`
- `supabase/migrations/20260320_gestor_vendedor_relacao_rpc_return_team_ids.sql`
- `supabase/migrations/20260320_gestor_vendedor_relacao_rpc_shared_team_fix.sql`
- `supabase/migrations/20260320_user_message_templates_and_clientes_doc_type.sql`
- `supabase/migrations/20260321_airline_iata_lookup.sql`
- `supabase/migrations/20260321_modulo_parametros_avisos_sync.sql`
- `supabase/migrations/20260321_roteiro_aereo_fields.sql`
- `supabase/migrations/20260321_roteiro_hotel_import_fields.sql`
- `supabase/migrations/20260321_roteiro_itinerario_config.sql`
- `supabase/migrations/20260321_roteiro_passeio_import_fields.sql`
- `supabase/migrations/20260321_seed_user_message_templates_defaults.sql`
- `supabase/migrations/20260322_system_documentation_sections.sql`
- `supabase/migrations/20260322_users_avatar_profile.sql`
- `supabase/migrations/20260323_expand_seed_user_message_templates_library.sql`
- `supabase/migrations/20260324_seed_user_message_template_themes_official.sql`
- `supabase/migrations/20260324_templates_hierarquia_v2.sql`
- `supabase/migrations/20260324_vendas_clientes_base_fix.sql`
- `supabase/migrations/20260325_metas_vendedor_write_master_gestor_scope.sql`
- `supabase/migrations/20260325_user_message_template_themes_dimensions_hotfix.sql`
- `supabase/migrations/20260326_crm_scope_system_visibility_fix.sql`

Cobertura estrutural melhorada para:

- `Conciliação`, incluindo regras de importacao, ranking e parametros operacionais;
- `CRM/Cards`, incluindo biblioteca seeded, temas oficiais, hierarquia de templates e visibilidade `system`;
- `Viagens / Roteiros`, incluindo campos de aereo, hotel, passeio e configuracao de itinerario;
- `Equipe / escopo`, incluindo RPCs de relacionamento gestor-vendedor;
- `Sistema / perfil`, incluindo avatar de usuario e secoes de documentacao.

### Schema / migrations — bloco de orcamentos, agenda, mural e ligacao vendas-viagens espelhado

Foi espelhado um quinto bloco estrutural do legado com foco em `Orçamentos`, `Agenda`, `To Do`, `Mural`, `Consultorias`, `Escalas` e ligacoes entre `Vendas` e `Viagens`.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20240724_cascade_orcamentos_viagens.sql`
- `supabase/migrations/20240725_vendas_recibos_periodos.sql`
- `supabase/migrations/20240726_viagens_recibo_fk.sql`
- `supabase/migrations/20260111_orcamento_itens.sql`
- `supabase/migrations/20260113_reset_orcamentos_quotes.sql`
- `supabase/migrations/20260114_add_quote_negociacao_status.sql`
- `supabase/migrations/20260115_add_order_index_quote_item.sql`
- `supabase/migrations/20260116_quote_print_settings.sql`
- `supabase/migrations/20260117_add_logo_url_quote_print_settings.sql`
- `supabase/migrations/20260118_add_quote_item_taxes.sql`
- `supabase/migrations/20260120_add_cidade_id_to_quote_item.sql`
- `supabase/migrations/20260121_add_data_final_to_vendas.sql`
- `supabase/migrations/20260121_add_quote_contact_fields.sql`
- `supabase/migrations/20260122_add_quote_sales_fields.sql`
- `supabase/migrations/20260204_contratos_pagamentos.sql`
- `supabase/migrations/20260204_controle_sac.sql`
- `supabase/migrations/20260204_controle_sac_fields.sql`
- `supabase/migrations/20260204_escala_horario_usuario.sql`
- `supabase/migrations/20260205_rls_uso_individual.sql`
- `supabase/migrations/20260206_consultorias_online_fechada.sql`
- `supabase/migrations/20260206_parametros_pagamentos_nao_comissionaveis.sql`
- `supabase/migrations/20260210_add_quote_interaction_notes.sql`
- `supabase/migrations/20260211_add_quote_print_complement_image.sql`
- `supabase/migrations/20260211_todo_categorias.sql`
- `supabase/migrations/20260212_mural_recados.sql`
- `supabase/migrations/20260213_agenda_itens.sql`
- `supabase/migrations/20260213_agenda_itens_time.sql`
- `supabase/migrations/20260214_agenda_itens_status_todo.sql`
- `supabase/migrations/20260215_agenda_status_fix.sql`
- `supabase/migrations/20260216_agenda_itens_deleted_at.sql`
- `supabase/migrations/20260216_mural_recados_arquivos.sql`
- `supabase/migrations/20260216_todo_improvements.sql`
- `supabase/migrations/20260216_todo_remove_categoria_cor.sql`
- `supabase/migrations/20260220_rpc_dashboard_consultorias.sql`
- `supabase/migrations/20260302_buscar_cidades_unaccent.sql`
- `supabase/migrations/20260304_menu_prefs.sql`

Cobertura estrutural melhorada para:

- `Orçamentos`, incluindo itens, impressao, taxas, negociacao e campos comerciais;
- `Vendas` e `Viagens`, incluindo periodos de recibo, `data_final` e FK entre viagem e recibo;
- `Agenda`, `To Do` e `Mural`, incluindo categorias, horarios, status, arquivos e preferencias;
- `Consultorias` e `Dashboard`, incluindo fechamento e RPC dedicada;
- `Controle SAC`, `Escalas` e parametros operacionais de pagamento.

### Schema / migrations — bloco de produtos, metas, companies, permissoes e documentos espelhado

Foi espelhado um sexto bloco estrutural do legado com foco em `Produtos`, `Metas`, `Companies`, modulos granulares, perfil de usuario, `Consultoria`, `Documentos de Viagens` e `Preferencias`.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20240720_create_metas_vendedor_produto.sql`
- `supabase/migrations/20240721_add_active_companies.sql`
- `supabase/migrations/20240721_add_ativo_gestor_vendedor.sql`
- `supabase/migrations/20240722_add_destino_cidade_to_vendas.sql`
- `supabase/migrations/20240722_add_todas_as_cidades_to_produtos.sql`
- `supabase/migrations/20240723_clientes_company_unique.sql`
- `supabase/migrations/20240727_produtos_precos.sql`
- `supabase/migrations/20240728_produtos_moeda.sql`
- `supabase/migrations/20240730_parametros_cambios.sql`
- `supabase/migrations/20240801_produtos_tarifas.sql`
- `supabase/migrations/20240802_update_metas_vendedor_policy.sql`
- `supabase/migrations/20240803_update_is_admin_function.sql`
- `supabase/migrations/20240810_circuitos.sql`
- `supabase/migrations/20260126_clientes_cpf_nullable.sql`
- `supabase/migrations/20260127_relatorios_aggregates.sql`
- `supabase/migrations/20260131_default_perms_vendedor.sql`
- `supabase/migrations/20260131_follow_up_viagens.sql`
- `supabase/migrations/20260203_master_profile.sql`
- `supabase/migrations/20260203_users_welcome_email.sql`
- `supabase/migrations/20260204_modulos_granulares_permissoes.sql`
- `supabase/migrations/20260204_modulos_granulares_permissoes_contratos.sql`
- `supabase/migrations/20260205_clientes_telefone_nullable.sql`
- `supabase/migrations/20260206_grant_is_admin_exec.sql`
- `supabase/migrations/20260206_system_documentation.sql`
- `supabase/migrations/20260206_system_documentation_storage.sql`
- `supabase/migrations/20260207_product_commission_rule_pacote.sql`
- `supabase/migrations/20260207_vendas_recibos_tipo_pacote.sql`
- `supabase/migrations/20260209_tipo_pacotes.sql`
- `supabase/migrations/20260227_add_consultoria_default_perms.sql`
- `supabase/migrations/20260227_roteiro_personalizado.sql`
- `supabase/migrations/20260228_roteiro_passeio_data_sugestoes.sql`
- `supabase/migrations/20260314_documentos_viagens.sql`
- `supabase/migrations/20260314_master_allowed_modules_preferencias_documentos.sql`
- `supabase/migrations/20260314_minhas_preferencias.sql`
- `supabase/migrations/20260315_documentos_viagens_templates.sql`
- `supabase/migrations/20260316_minhas_preferencias_drop_categoria.sql`

Cobertura estrutural melhorada para:

- `Produtos`, incluindo precos, moeda, tarifas, circuitos e tipos de pacote;
- `Metas`, incluindo metas por produto e atualizacao de policy;
- `Companies` e `Clientes`, incluindo company ativa, unicidade por company e campos flexiveis;
- `Permissões`, incluindo modulos granulares e grants auxiliares;
- `Viagens / Roteiros`, incluindo follow-up e roteiro personalizado;
- `Consultoria`, incluindo permissao padrao;
- `Documentos de Viagens` e `Preferencias`, incluindo schema base, templates e liberacao de modulo.

### Schema / migrations — bloco de admin, auth, mural, escalas e ajustes de RLS espelhado

Foi espelhado um setimo bloco estrutural do legado com foco em `Admin`, `Auth/Users`, `Mural`, `Escalas`, `Vendas DU/RAV`, `Consultoria`, `Push`, `Roteiros do dia` e reforcos de RLS.

Migrations espelhadas nesta rodada:

- `supabase/migrations/20260211_allow_anonymous_login_logs.sql`
- `supabase/migrations/20260211_master_users_stack_depth_hotfix.sql`
- `supabase/migrations/20260211_master_users_visibility_rls.sql`
- `supabase/migrations/20260211_users_corporativo_visibility_fix.sql`
- `supabase/migrations/20260211_users_rls_recursion_hotfix.sql`
- `supabase/migrations/20260212_add_quote_print_whatsapp_country.sql`
- `supabase/migrations/20260212_agenda_itens_fix.sql`
- `supabase/migrations/20260212_modulos_operacao_recados_backfill.sql`
- `supabase/migrations/20260213_admin_billing_schema.sql`
- `supabase/migrations/20260213_gestor_equipe_compartilhada.sql`
- `supabase/migrations/20260213_mural_recados_sender_visibility.sql`
- `supabase/migrations/20260213_rls_gestor_equipe_compartilhada.sql`
- `supabase/migrations/20260214_mural_recados_leituras.sql`
- `supabase/migrations/20260214_rls_modulo_acesso.sql`
- `supabase/migrations/20260215_mural_recados_delete_private.sql`
- `supabase/migrations/20260215_rls_users_companies.sql`
- `supabase/migrations/20260216_campanhas.sql`
- `supabase/migrations/20260216_rls_users_companies_scope.sql`
- `supabase/migrations/20260217_escalas_compartilhadas_gestor_base.sql`
- `supabase/migrations/20260217_gestor_equipe_gestor_ids.sql`
- `supabase/migrations/20260217_modulo_acesso_master_allowed_module_fix.sql`
- `supabase/migrations/20260217_mural_recados_unread_count_fix.sql`
- `supabase/migrations/20260217_update_metas_vendedor_policy_gestor.sql`
- `supabase/migrations/20260218_rls_gestor_vendedor.sql`
- `supabase/migrations/20260219_add_created_by_gestor_to_users.sql`
- `supabase/migrations/20260219_admin_system_settings.sql`
- `supabase/migrations/20260219_modulo_acesso_normalize_modulo.sql`
- `supabase/migrations/20260219_perf_indexes_p2.sql`
- `supabase/migrations/20260219_vendas_clientes_base_rpc.sql`
- `supabase/migrations/20260219_vendas_recibos_rav.sql`
- `supabase/migrations/20260220_modulo_acesso_master_allowed_module_admin_only.sql`
- `supabase/migrations/20260220_rls_users_insert_gestor.sql`
- `supabase/migrations/20260220_rpc_vendas_du.sql`
- `supabase/migrations/20260220_vendas_recibos_du.sql`
- `supabase/migrations/20260221_auth_user_profile_trigger.sql`
- `supabase/migrations/20260222_cleanup_duplicate_auth_users.sql`
- `supabase/migrations/20260223_update_ensure_user_profile_rls.sql`
- `supabase/migrations/20260224_update_default_perms_vendedor_rls.sql`
- `supabase/migrations/20260225_normalize_companies_cnpj.sql`
- `supabase/migrations/20260226_consultoria_online.sql`
- `supabase/migrations/20260229_consultoria_lembrete_email.sql`
- `supabase/migrations/20260301_consultoria_lembretes_envios.sql`
- `supabase/migrations/20260301_push_subscriptions.sql`
- `supabase/migrations/20260302_admin_avisos_templates.sql`
- `supabase/migrations/20260302_admin_avisos_templates_sender.sql`
- `supabase/migrations/20260302_admin_email_settings.sql`
- `supabase/migrations/20260302_admin_email_settings_fix.sql`
- `supabase/migrations/20260302_admin_email_settings_from_emails.sql`
- `supabase/migrations/20260302_admin_email_settings_imap.sql`
- `supabase/migrations/20260302_admin_email_settings_resend.sql`
- `supabase/migrations/20260302_admin_email_settings_support.sql`
- `supabase/migrations/20260302_rls_users_exclude_individual.sql`
- `supabase/migrations/20260302_roteiro_inclusoes_texto.sql`
- `supabase/migrations/20260302_roteiro_personalizado_informacoes_importantes.sql`
- `supabase/migrations/20260302_rpc_vendas_kpis_use_bruto_and_recibo_total.sql`
- `supabase/migrations/20260302_users_rls_helpers_row_security_off.sql`
- `supabase/migrations/20260303_companies_admin_only.sql`
- `supabase/migrations/20260303_roteiro_dia_percurso.sql`
- `supabase/migrations/20260303_roteiro_dia_rls_company_write.sql`
- `supabase/migrations/20260303_roteiro_dia_unique_ordem.sql`
- `supabase/migrations/20260303_roteiro_dia_unique_ordem_fix.sql`
- `supabase/migrations/20260304_competencia_por_recibo.sql`
- `supabase/migrations/20260304_master_documents.sql`
- `supabase/migrations/20260305_escalas.sql`
- `supabase/migrations/20260306_users_participa_ranking.sql`
- `supabase/migrations/20260307_master_allowed_modules_operacao_extra.sql`
- `supabase/migrations/20260307_modulos_operacao_agenda_todo_chat_backfill.sql`
- `supabase/migrations/20260308_admin_avisos_template_convite_acesso.sql`
- `supabase/migrations/20260308_grant_rls_helper_functions_exec.sql`
- `supabase/migrations/20260308_master_allowed_modules_sync.sql`
- `supabase/migrations/20260308_modulo_acesso_normalize_module_keys.sql`
- `supabase/migrations/20260308_rls_modulo_acesso_master_gestor_scope.sql`
- `supabase/migrations/20260308_rls_users_insert_update_master_gestor.sql`
- `supabase/migrations/20260308_users_force_password_change.sql`
- `supabase/migrations/20260308_users_operator_creation_signup_fix.sql`
- `supabase/migrations/20260309_users_master_placeholder_rls_fix.sql`
- `supabase/migrations/20260310_users_master_company_match.sql`
- `supabase/migrations/20260313_metas_vendedor_unique_scope.sql`
- `supabase/migrations/20260318_admin_logs_indexes.sql`
- `supabase/migrations/20260318_conciliacao_audit_revert.sql`
- `supabase/migrations/20260318_conciliacao_execucoes.sql`
- `supabase/migrations/20260318_parametros_mfa_obrigatorio.sql`

Cobertura estrutural melhorada para:

- `Admin`, incluindo billing, system settings, templates de avisos, e-mail e logs;
- `Auth / Users`, incluindo visibilidade, triggers de perfil, recursao RLS, senha forcada, signup operacional e company match;
- `Mural`, incluindo remetente, leituras, exclusao privada e contador de nao lidos;
- `Escalas` e equipe compartilhada;
- `Vendas`, incluindo DU, RAV, base RPC e KPI por bruto/recibo total;
- `Consultoria`, incluindo online, lembretes e envios;
- `Push subscriptions`, `Campanhas` e documentos master;
- `Roteiros`, incluindo inclusoes, informacoes importantes e roteiro do dia;
- reforcos de `RLS`, `allowed modules` e normalizacao de acessos.

## Riscos ainda abertos

- Existem modulos no `vtur-svelte` cuja pagina existe, mas a cobertura de APIs auxiliares ainda nao acompanha 1:1 o legado.
- Existem modulos cujo schema real do legado aparece no `banco_vtur.txt`, mas ainda nao ha migrations equivalentes no repositorio Svelte.
- A documentacao de status de alguns modulos pode estar mais otimista que a paridade real medida por rotas auxiliares e persistencia profunda.

## Ordem recomendada de continuidade

1. Continuar reduzindo o gap estrutural de migrations SQL, porque o repositorio Svelte ainda nao reflete integralmente o historico real do schema do legado.

## Conclusao honesta desta auditoria

O `vtur-svelte` ja possui boa cobertura funcional, mas ainda nao esta em estado de “100% espelho do legado” quando a analise e feita por:

- historico de migrations;
- cobertura de rotas auxiliares;
- persistencia profunda entre tabelas relacionadas;
- contratos de API por modulo.

Esta auditoria deve ser usada como checklist vivo ate que cada gap acima seja efetivamente portado.

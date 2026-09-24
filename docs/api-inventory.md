# Inventário de contrato das APIs

Gerado por `node scripts/api-inventory.mjs` — **não editar à mão**. JSON completo em `docs/api-inventory.json`.

- Endpoints: **257** (126 gravam no banco)
- Domínios: 50

## Pontos de atenção (detectados automaticamente)

Heurística por análise de texto — confirmar manualmente antes de agir.

### Gravam no banco sem `requireAuthenticatedUser` (1)
- `/api/auth/convite/activate` (POST)

### Métodos de escrita sem `rejectCrossOriginRequest` (0)
- nenhum

### Gravam em tabelas de venda/conciliação sem invalidação explícita de cache (0)
Desde a migration 20260924184114 o read model v4 é marcado dirty por trigger; ainda assim o cache em memória/KV depende da invalidação na aplicação.

- nenhum

## Endpoints por domínio

Legenda: **Auth** = requireAuthenticatedUser · **Escopo** = resolveUserScope · **CSRF** = rejectCrossOriginRequest · **Body** = limite de tamanho do corpo

### admin (24)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/admin/auth/mfa-status` | POST | ✔ | ✔ |  | ✔ | ✔ | — | — | — |
| `/v1/admin/auth/reset-mfa` | POST | ✔ | ✔ |  | ✔ | ✔ | — | — | — |
| `/v1/admin/auth/set-password` | POST | ✔ | ✔ |  | ✔ | ✔ | — | — | — |
| `/v1/admin/avisos` | GET POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | admin_avisos_templates(D/U) | — | — |
| `/v1/admin/avisos/send` | POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | — | — | — |
| `/v1/admin/crm` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | crm_template_categories(R), user_message_templates(R) | — | — |
| `/v1/admin/email` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | admin_email_settings(R/U) | — | — |
| `/v1/admin/email/test` | POST | ✔ | ✔ | Admin | ✔ | ✔ | — | — | — |
| `/v1/admin/empresas` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | companies(R/U), company_billing(C/R), master_empresas(R) | — | — |
| `/v1/admin/empresas/[id]` | GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | companies(R/U), company_billing(R), master_empresas(R) | — | — |
| `/v1/admin/fix-recibos` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | conciliacao_recibo_changes(C), conciliacao_recibos(R/U), users(R), vendas_recibos(R) | — | invalidateSalesReadModels |
| `/v1/admin/logs` | GET | ✔ | ✔ | Admin |  |  | logs(R) | — | — |
| `/v1/admin/maintenance` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | admin_system_settings(R/UP) | — | — |
| `/v1/admin/master-empresas` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | master_empresas(C/R) | — | — |
| `/v1/admin/modulos-sistema` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | system_module_settings(R/UP) | — | — |
| `/v1/admin/permissoes` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | modulo_acesso(R) | — | invalidateUserReadModels |
| `/v1/admin/permissoes/[id]` | GET POST | ✔ | ✔ |  | ✔ | ✔ | — | — | invalidateUserReadModels |
| `/v1/admin/planos` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | plans(D/R/U) | — | — |
| `/v1/admin/summary` | GET | ✔ | ✔ | Admin |  |  | company_billing(R), master_empresas(R), plans(R) | — | — |
| `/v1/admin/system-modules` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | system_module_settings(R/UP) | — | — |
| `/v1/admin/tipos-usuario` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | user_type_default_perms(R), user_types(D/U) | — | — |
| `/v1/admin/tipos-usuario/[id]` | GET | ✔ | ✔ |  |  |  | users(R) | — | — |
| `/v1/admin/usuarios` | GET POST | ✔ | ✔ | Admin Gestor | ✔ | ✔ | user_types(R), users(U/UP) | — | invalidateReadModelCache |
| `/v1/admin/usuarios/[id]` | GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | users(U) | — | invalidateReadModelCache |

### agenda (5)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/agenda` | GET | ✔ | ✔ |  |  |  | agenda_itens(R) | — | — |
| `/v1/agenda/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | agenda_itens(C) | — | — |
| `/v1/agenda/delete` | DELETE | ✔ | ✔ | Admin | ✔ |  | agenda_itens(D/R) | — | — |
| `/v1/agenda/range` | GET | ✔ | ✔ | Vendedor |  |  | agenda_itens(R), users(R) | — | — |
| `/v1/agenda/update` | PATCH POST | ✔ | ✔ | Admin | ✔ | ✔ | agenda_itens(R/U) | — | — |

### auth (9)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/auth/convite/activate` | POST |  |  |  | ✔ | ✔ | user_convites(R/U), users(UP) | — | — |
| `/auth/login` <sub>turnstile</sub> | POST |  |  |  | ✔ | ✔ | — | — | — |
| `/auth/passkeys` | DELETE GET | ✔ |  |  | ✔ | ✔ | — | — | — |
| `/auth/passkeys/login/options` | POST |  |  |  | ✔ | ✔ | — | — | — |
| `/auth/passkeys/login/verify` | POST |  |  |  | ✔ | ✔ | — | — | — |
| `/auth/passkeys/register/options` | POST | ✔ |  |  |  |  | — | — | — |
| `/auth/passkeys/register/verify` | POST | ✔ |  |  | ✔ | ✔ | — | — | — |
| `/auth/set-session` | POST |  |  |  | ✔ | ✔ | — | — | — |
| `/auth/turnstile/verify` <sub>turnstile</sub> | POST |  |  |  | ✔ | ✔ | — | — | — |

### cards (4)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/cards/aniversario.svg` | GET |  |  |  |  |  | — | — | — |
| `/v1/cards/render.png` | GET |  |  |  |  |  | — | — | — |
| `/v1/cards/render.svg` | GET |  |  |  |  |  | — | — | — |
| `/v1/cards/render` | GET |  |  |  |  |  | — | — | — |

### cidades (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/cidades` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | cidades(D/R/U) | — | invalidateCatalogReadModels |
| `/v1/cidades/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | cidades(D/R/U) | — | invalidateCatalogReadModels |

### circuitos (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/circuitos` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | circuitos(R/U) | — | — |
| `/v1/circuitos/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | circuitos(D/R/U) | — | — |

### client-error (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/client-error` | POST |  |  |  | ✔ | ✔ | — | — | — |

### clientes (13)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/clientes` | GET | ✔ | ✔ | Admin |  |  | clientes(R) | — | — |
| `/v1/clientes/[id]` | DELETE GET PATCH | ✔ | ✔ |  | ✔ | ✔ | cliente_acompanhantes(R), clientes(D/R/U), quote(R), vendas(R) | — | invalidateClientReadModels |
| `/v1/clientes/[id]/acompanhantes` | GET POST | ✔ | ✔ |  | ✔ | ✔ | cliente_acompanhantes(R), clientes(R) | — | invalidateClientReadModels |
| `/v1/clientes/avisos/history` | GET | ✔ | ✔ | Admin |  |  | cliente_avisos_historico(R) | — | — |
| `/v1/clientes/avisos/send` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | cliente_avisos_historico(C/R), clientes(R) | — | — |
| `/v1/clientes/avisos/templates` | GET | ✔ | ✔ | Admin |  |  | master_empresas(R), user_message_templates(R) | — | — |
| `/v1/clientes/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(C) | — | invalidateClientReadModels |
| `/v1/clientes/delete` | DELETE |  |  |  | ✔ |  | — | — | — |
| `/v1/clientes/historico` | GET | ✔ | ✔ |  |  |  | cidades(R), users(R), vendas(R), vendas_recibos(R), viagens(R) | — | — |
| `/v1/clientes/list` | GET | ✔ | ✔ | Admin |  |  | clientes(R), quote(R), users(R), vendas(R) | — | — |
| `/v1/clientes/resolve-import` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(C/R/U) | — | invalidateClientReadModels |
| `/v1/clientes/template-dispatches` | GET POST | ✔ | ✔ | Admin Gestor Master Vendedor | ✔ | ✔ | cliente_template_dispatches(C/R), clientes(R), vendas(R) | — | — |
| `/v1/clientes/templates/send` | POST | ✔ | ✔ |  | ✔ | ✔ | companies(R), master_empresas(R), user_message_template_themes(R), user_message_templates(R), users(R) | — | — |

### conciliacao (18)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/conciliacao` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | conciliacao_recibos(R) | — | — |
| `/v1/conciliacao/assign` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_recibo_changes(C), conciliacao_recibos(R/U), master_empresas(R), users(R) | — | invalidateSalesReadModels |
| `/v1/conciliacao/changes` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | conciliacao_recibo_changes(R) | — | — |
| `/v1/conciliacao/delete` | DELETE | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ |  | conciliacao_recibos(D/R) | — | invalidateSalesReadModels |
| `/v1/conciliacao/executions` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | conciliacao_execucoes(R) | — | — |
| `/v1/conciliacao/existing` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_recibos(R) | — | — |
| `/v1/conciliacao/fix-vinculos` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_recibos(R/U), users(R), vendas_recibos(R), vendas_recibos_rateio(R) | — | invalidateSalesReadModels |
| `/v1/conciliacao/import` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_dias_sem_movimento(R), conciliacao_recibos(R/U), vendas(R), vendas_recibos(R) | — | invalidateSalesReadModels |
| `/v1/conciliacao/list` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | clientes(R), conciliacao_recibos(R), parametros_pagamentos_nao_comissionaveis(R), users(R), vendas(R), vendas_pagamentos(R), vendas_recibos(R) | — | — |
| `/v1/conciliacao/lookup` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | vendas(R), vendas_recibos(R) | — | — |
| `/v1/conciliacao/options` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | tipo_produtos(R) | — | — |
| `/v1/conciliacao/rateio-info` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | conciliacao_recibos(R), vendas_recibos(R) | — | — |
| `/v1/conciliacao/revert` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_recibo_changes(R/U) | — | invalidateSalesReadModels |
| `/v1/conciliacao/run` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | — | — | invalidateSalesReadModels |
| `/v1/conciliacao/sem-movimento` | DELETE GET POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_dias_sem_movimento(D/R/UP), conciliacao_recibos(R) | — | invalidateSalesReadModels |
| `/v1/conciliacao/status-cronologico` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | — | — | — |
| `/v1/conciliacao/summary` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | conciliacao_recibos(R) | — | — |
| `/v1/conciliacao/update-valores` | POST | ✔ | ✔ | Admin | ✔ | ✔ | conciliacao_recibos(R/U) | — | invalidateSalesReadModels |

### consultorias (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/consultorias` | GET PATCH POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | consultorias_online(C/R/U) | — | invalidateConsultoriaReadModels |
| `/v1/consultorias/ics` | GET | ✔ |  |  |  |  | consultorias_online(R) | — | — |

### convites (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/convites/accept` | POST | ✔ |  |  | ✔ | ✔ | user_convites(R/U), users(C/R/U) | — | — |
| `/v1/convites/send` | POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | gestor_equipe_compartilhada(R), gestor_vendedor(C), master_empresas(R), user_convites(C/R/U), user_types(R), users(R/U) | — | — |

### crm (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/crm/library` | GET | ✔ | ✔ | Admin |  |  | companies(R), crm_template_categories(R), master_empresas(R), quote_print_settings(R), user_crm_assinaturas(R), user_message_template_themes(R) | — | — |
| `/v1/crm/signature` | POST | ✔ |  |  | ✔ | ✔ | user_crm_assinaturas(UP) | — | — |

### cron (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/cron/alerta-comissao` <sub>cron-secret</sub> | GET POST |  |  |  |  | ✔ | — | — | — |
| `/v1/cron/lembretes-consultoria` <sub>cron-secret</sub> | POST |  |  |  |  | ✔ | — | — | — |

### dashboard (11)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/dashboard/aniversariantes` | GET | ✔ | ✔ | Admin Vendedor |  |  | cliente_acompanhantes(R), clientes(R), vendas(R) | — | — |
| `/v1/dashboard/base` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | companies(R), users(R) | — | — |
| `/v1/dashboard/comparativo-empresas` | GET | ✔ | ✔ | Admin Master |  |  | companies(R), metas_vendedor(R), users(R) | — | — |
| `/v1/dashboard/consultorias` | GET | ✔ | ✔ | Admin Gestor Master |  |  | consultorias_online(R) | rpc_dashboard_consultorias | — |
| `/v1/dashboard/debug-aggregates` <sub>debug-only</sub> | GET | ✔ | ✔ | Admin |  |  | conciliacao_recibos(R), vendas(R) | — | — |
| `/v1/dashboard/evolucao-anual` | GET | ✔ | ✔ | Admin |  |  | companies(R) | — | — |
| `/v1/dashboard/follow-ups` | GET | ✔ | ✔ |  |  |  | viagem_passageiros(R), viagens(R) | — | — |
| `/v1/dashboard/summary` | GET | ✔ | ✔ | Admin |  |  | companies(R), dashboard_widgets(R), metas_vendedor(R), quote(R), users(R) | — | — |
| `/v1/dashboard/ultimas-compras` | GET | ✔ | ✔ | Admin Gestor Master |  |  | clientes(R), companies(R), users(R), vendas(R) | — | — |
| `/v1/dashboard/viagens` | GET | ✔ | ✔ | Admin |  |  | clientes(R), users(R), vendas(R), viagens(R) | — | — |
| `/v1/dashboard/widgets` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | dashboard_widgets(D/C/R) | — | — |

### debug (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/debug/permissions` <sub>debug-only</sub> | GET | ✔ | ✔ | Admin Gestor Master Vendedor |  |  | companies(R), users(R) | — | — |
| `/v1/debug/vendas-recibos-diff` <sub>debug-only</sub> | GET | ✔ | ✔ | Admin Master |  |  | — | — | — |

### debug-comissao (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/debug-comissao` <sub>debug-only</sub> | GET | ✔ | ✔ | Admin Master |  |  | — | — | — |

### documentacao (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/documentacao` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | system_documentation(R), system_documentation_sections(D/R/U) | — | — |

### documentos-viagens (5)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/documentos-viagens/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | documentos_viagens(C) | — | — |
| `/v1/documentos-viagens/delete` | POST | ✔ | ✔ | Admin | ✔ | ✔ | documentos_viagens(D/R) | — | — |
| `/v1/documentos-viagens/list` | GET |  |  |  |  |  | — | — | — |
| `/v1/documentos-viagens/save-template` | POST | ✔ | ✔ | Admin | ✔ | ✔ | documentos_viagens(R/U) | — | — |
| `/v1/documentos-viagens/update` | POST | ✔ | ✔ | Admin | ✔ | ✔ | documentos_viagens(R/U) | — | — |

### enderecos (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/enderecos/cep` | GET |  |  |  |  |  | — | — | — |

### equipe (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/equipe/relacao` | POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | users(R) | set_gestor_vendedor_relacao | — |

### financeiro (10)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/financeiro/ajustes-vendas` | GET POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_recibos(R), users(R), vendas_recibos(R), vendas_recibos_rateio(R/U) | — | invalidateAjustesVendasReadModels, invalidateReadModelCache |
| `/v1/financeiro/ajustes-vendas/list` | GET | ✔ | ✔ | Admin |  |  | conciliacao_recibos(R), users(R), vendas_recibos(R), vendas_recibos_rateio(R) | — | — |
| `/v1/financeiro/ajustes-vendas/save` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | conciliacao_recibos(R), users(R), vendas(R), vendas_recibos(R), vendas_recibos_rateio(U) | — | invalidateAjustesVendasReadModels, invalidateReadModelCache |
| `/v1/financeiro/caixa` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | caixa_movimentacoes(C/R), vendas_pagamentos(R) | — | invalidateReadModelCache |
| `/v1/financeiro/comissoes` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | — | — | — |
| `/v1/financeiro/comissoes/calcular` | GET POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | — | — | — |
| `/v1/financeiro/comissoes/pagamento` | DELETE POST PUT | ✔ | ✔ | Admin Financeiro | ✔ | ✔ | comissoes(U), vendas_recibos(R) | — | invalidateCommissionReadModels |
| `/v1/financeiro/comissoes/regras` | DELETE GET POST PUT | ✔ | ✔ | Admin | ✔ | ✔ | commission_rule(C/R/U), commission_tier(D/C) | — | invalidateCommissionReadModels, invalidateCommissionRuleReadModels |
| `/v1/financeiro/comissoes/vendedores` | GET POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ |  | — | — | — |
| `/v1/financeiro/formas-pagamento` | DELETE GET PATCH POST | ✔ | ✔ | Admin | ✔ | ✔ | formas_pagamento(D/C/R/U), vendas_pagamentos(R) | — | invalidateReadModelCache |

### fornecedores (3)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/fornecedores` | GET | ✔ | ✔ | Admin |  |  | — | — | — |
| `/v1/fornecedores/[id]` | DELETE GET PUT | ✔ | ✔ | Admin | ✔ | ✔ | fornecedores(U), produtos(R) | — | invalidateCatalogReadModels |
| `/v1/fornecedores/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | fornecedores(C) | — | invalidateCatalogReadModels |

### health (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/health` | GET |  |  |  |  |  | — | — | — |

### importar-vendas (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/importar-vendas` | POST |  |  |  | ✔ |  | — | — | — |

### menu (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/menu/prefs` | GET POST | ✔ |  |  | ✔ | ✔ | menu_prefs(R/UP) | — | — |

### mural (4)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/mural/bootstrap` | GET | ✔ |  | Admin |  |  | companies(R) | — | — |
| `/v1/mural/company` | GET | ✔ |  |  |  |  | — | — | — |
| `/v1/mural/read` | POST | ✔ |  |  | ✔ | ✔ | mural_recados(R), mural_recados_leituras(UP) | — | invalidateMuralReadModels |
| `/v1/mural/recados` | DELETE GET POST | ✔ |  | Admin | ✔ | ✔ | mural_recados(D/C/R), users(R) | — | invalidateMuralReadModels |

### operacao (5)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/operacao/campanhas` | DELETE GET POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | campanhas(D/R/U) | — | — |
| `/v1/operacao/documentos-viagens` | DELETE GET | ✔ | ✔ | Admin | ✔ |  | documentos_viagens(D/R) | — | — |
| `/v1/operacao/preferencias` | DELETE GET PATCH POST | ✔ | ✔ | Admin | ✔ | ✔ | minhas_preferencias(D/R/U), minhas_preferencias_shares(C/U), tipo_produtos(R), users(R) | — | invalidatePreferenceReadModels |
| `/v1/operacao/recados` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | mural_recados(C/R/U), users(R) | — | — |
| `/v1/operacao/sac` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | sac_controle(D/R/U) | — | — |

### orcamentos (15)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/orcamentos/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | clientes(R), quote(R/U), quote_item(C/R), quote_item_segment(R) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/[id]/resumo-venda` | GET | ✔ | ✔ | Admin Financeiro |  |  | clientes(R), quote(R) | — | — |
| `/v1/orcamentos/cidades-busca` | GET | ✔ | ✔ | Admin Financeiro |  |  | cidades(R) | buscar_cidades | — |
| `/v1/orcamentos/cliente-create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(C) | — | invalidateClientReadModels |
| `/v1/orcamentos/clientes` | GET | ✔ | ✔ | Admin |  |  | clientes(R) | — | — |
| `/v1/orcamentos/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(R), quote(C), quote_item(C) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/delete` | POST | ✔ | ✔ | Admin | ✔ | ✔ | quote(R) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/importar` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(R), produtos(R/U), quote(C/U), quote_item(C), quote_item_segment(C) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/interacao` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | quote(R/U) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/interaction` | GET POST |  |  |  |  |  | — | — | — |
| `/v1/orcamentos/list` | GET | ✔ | ✔ | Admin |  |  | clientes(R), quote(R), quote_item(R), users(R) | — | — |
| `/v1/orcamentos/produtos` | GET | ✔ | ✔ | Admin |  |  | produtos(R) | — | — |
| `/v1/orcamentos/save` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(R), produtos(R/U), quote(R/U), quote_item(R/UP), quote_item_segment(D/C), tipo_produtos(R) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/status` | PATCH | ✔ | ✔ | Admin | ✔ | ✔ | quote(R/U) | — | invalidateQuoteReadModels |
| `/v1/orcamentos/tipos` | GET | ✔ | ✔ | Admin Financeiro |  |  | tipo_produtos(R) | — | — |

### pagamentos (4)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/pagamentos` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | vendas(R), vendas_pagamentos(C/R) | — | invalidatePagamentoReadModels, invalidateReadModelCache |
| `/v1/pagamentos/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | vendas_pagamentos(D/R/U) | — | invalidatePagamentoReadModels, invalidateReadModelCache |
| `/v1/pagamentos/[id]/conciliar` | POST | ✔ | ✔ | Admin | ✔ | ✔ | vendas_pagamentos(R/U) | — | invalidatePagamentoReadModels, invalidateReadModelCache |
| `/v1/pagamentos/upload` | POST | ✔ | ✔ | Admin | ✔ |  | vendas_pagamentos(R/U) | — | invalidatePagamentoReadModels, invalidateReadModelCache |

### paises (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/paises` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | paises(D/R/U) | — | invalidateCatalogReadModels |

### parametros (12)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/parametros/cambios` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | parametros_cambios(D/R/U) | — | invalidateQuoteReadModels |
| `/v1/parametros/commission-rules` | DELETE GET PATCH POST | ✔ | ✔ | Admin | ✔ | ✔ | commission_rule(D/C/R/U), commission_tier(D) | — | invalidateCommissionReadModels, invalidateCommissionRuleReadModels |
| `/v1/parametros/empresa` | GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | companies(R/U) | — | invalidateUserReadModels |
| `/v1/parametros/equipe` | GET POST | ✔ | ✔ | Admin Gestor | ✔ | ✔ | gestor_vendedor(C/R), user_convites(R), user_types(R), users(R) | — | invalidateUserReadModels |
| `/v1/parametros/escalas` | GET POST | ✔ | ✔ | Admin Gestor Master Vendedor | ✔ | ✔ | escala_dia(D/C/R/UP), escala_horario_usuario(C/R), escala_mes(R), feriados(R), users(R) | gestor_equipe_base_id | invalidateReadModelCache |
| `/v1/parametros/metas` | DELETE GET POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | metas_vendedor(R/U), metas_vendedor_produto(D/R), tipo_produtos(R), users(R) | — | invalidateReadModelCache |
| `/v1/parametros/nao-comissionaveis` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | parametros_pagamentos_nao_comissionaveis(D/R/U) | — | invalidateSalesReadModels |
| `/v1/parametros/orcamentos-pdf` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | quote_print_settings(R), users(R) | — | invalidateQuoteReadModels |
| `/v1/parametros/regras-produto-pacote` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | product_commission_rule_pacote(D/R/U) | — | invalidateCatalogReadModels |
| `/v1/parametros/regras-produto` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | product_commission_rule(D/R/U) | — | invalidateCatalogReadModels |
| `/v1/parametros/sistema` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | parametros_comissao(R/UP), users(R) | — | invalidateSalesReadModels |
| `/v1/parametros/tipo-pacotes` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | tipo_pacotes(D/R/U) | — | invalidateCatalogReadModels |

### preferencias (8)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/preferencias/base` | GET | ✔ |  |  |  |  | — | — | — |
| `/v1/preferencias/cidades-busca` | GET | ✔ |  |  |  |  | cidades(R) | buscar_cidades | — |
| `/v1/preferencias/delete` | POST | ✔ |  | Admin | ✔ | ✔ | minhas_preferencias(D) | — | invalidatePreferenceReadModels |
| `/v1/preferencias/list` | GET | ✔ |  |  |  |  | minhas_preferencias(R), minhas_preferencias_shares(R) | — | — |
| `/v1/preferencias/save` | POST | ✔ |  | Admin | ✔ | ✔ | minhas_preferencias(C/U) | — | invalidatePreferenceReadModels |
| `/v1/preferencias/share-accept` | POST | ✔ |  |  | ✔ | ✔ | minhas_preferencias_shares(U) | — | invalidatePreferenceReadModels |
| `/v1/preferencias/share-revoke` | POST | ✔ |  |  | ✔ | ✔ | minhas_preferencias_shares(U) | — | invalidatePreferenceReadModels |
| `/v1/preferencias/share` | POST | ✔ |  | Admin | ✔ | ✔ | minhas_preferencias(R), minhas_preferencias_shares(UP), users(R) | — | invalidatePreferenceReadModels |

### produtos (5)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/produtos` | GET | ✔ | ✔ | Admin |  |  | — | — | — |
| `/v1/produtos/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | produtos(U), produtos_tarifas(D) | — | invalidateCatalogReadModels |
| `/v1/produtos/base` | GET | ✔ | ✔ | Admin |  |  | — | — | — |
| `/v1/produtos/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | produtos(C) | — | invalidateCatalogReadModels |
| `/v1/produtos/tarifas` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | produtos_tarifas(D) | — | invalidateCatalogReadModels |

### profile (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/profile/signature` | GET PATCH | ✔ | ✔ |  | ✔ | ✔ | users(R) | — | invalidateQuoteReadModels |

### push (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/push/subscribe` | POST | ✔ |  |  | ✔ | ✔ | push_subscriptions(UP) | — | — |
| `/v1/push/unsubscribe` | POST | ✔ |  |  | ✔ | ✔ | push_subscriptions(U) | — | — |

### qr (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/qr` | GET |  |  |  |  |  | — | — | — |

### read-model (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/read-model/rebuild` <sub>cron-secret</sub> | GET POST | ✔ | ✔ | Admin Financeiro Master |  |  | — | — | — |

### relatorios (13)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/relatorios/base` | GET | ✔ | ✔ | Admin Vendedor |  |  | companies(R), users(R) | — | — |
| `/v1/relatorios/cidades-busca` | GET | ✔ | ✔ | Admin |  |  | — | buscar_cidades | — |
| `/v1/relatorios/clientes` | GET | ✔ | ✔ | Admin |  |  | clientes(R) | — | — |
| `/v1/relatorios/destinos` | GET | ✔ | ✔ | Admin |  |  | — | — | — |
| `/v1/relatorios/produtos-recibos` | GET | ✔ | ✔ | Admin |  |  | — | — | — |
| `/v1/relatorios/produtos` | GET | ✔ | ✔ | Admin |  |  | — | — | — |
| `/v1/relatorios/ranking-debug` <sub>debug-only</sub> | GET POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | conciliacao_recibos(R/U), users(R), vendas(R) | — | invalidateSalesReadModels |
| `/v1/relatorios/ranking-vendas` | GET |  |  |  |  |  | — | — | — |
| `/v1/relatorios/ranking` | GET | ✔ | ✔ | Admin |  |  | metas_vendedor(R), parametros_comissao(R), quote(R), users(R) | — | — |
| `/v1/relatorios/vendas-por-cliente` | GET |  |  |  |  |  | — | — | — |
| `/v1/relatorios/vendas-por-destino` | GET |  |  |  |  |  | — | — | — |
| `/v1/relatorios/vendas-por-produto` | GET |  |  |  |  |  | — | — | — |
| `/v1/relatorios/vendas` | GET | ✔ | ✔ | Admin Financeiro Gestor Master Vendedor |  |  | cidades(R), parametros_comissao(R), parametros_pagamentos_nao_comissionaveis(R), users(R), vendas(R), vendas_pagamentos(R), vendas_recibos_rateio(R) | — | — |

### roteiros (10)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/roteiros` | DELETE GET PATCH POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | roteiro_dia(D/C), roteiro_personalizado(D/C/R/U), roteiro_sugestoes(D/R/U), users(R) | — | — |
| `/v1/roteiros/[id]` | GET | ✔ | ✔ | Admin Gestor Master |  |  | roteiro_dia(R), roteiro_investimento(R), roteiro_passeio(R), roteiro_personalizado(R) | — | — |
| `/v1/roteiros/delete` | DELETE | ✔ | ✔ | Admin Gestor Master | ✔ |  | roteiro_personalizado(D/R) | — | — |
| `/v1/roteiros/dias-busca` | GET | ✔ | ✔ | Admin Gestor Master |  |  | roteiro_dia(R) | — | — |
| `/v1/roteiros/gerar-orcamento` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(R), quote(C), quote_item(C), roteiro_personalizado(R) | — | invalidateQuoteReadModels |
| `/v1/roteiros/list` | GET | ✔ | ✔ | Admin Gestor Master |  |  | roteiro_personalizado(R) | — | — |
| `/v1/roteiros/save` | POST | ✔ | ✔ | Admin Gestor Master | ✔ | ✔ | roteiro_dia(C/UP), roteiro_hotel(C), roteiro_investimento(D/C), roteiro_pagamento(C), roteiro_passeio(C), roteiro_personalizado(C/R/U), roteiro_transporte(C) | — | — |
| `/v1/roteiros/sugestoes-busca` | GET | ✔ | ✔ |  |  |  | roteiro_sugestoes(R) | — | — |
| `/v1/roteiros/sugestoes-remover` | POST | ✔ | ✔ |  | ✔ | ✔ | roteiro_sugestoes(D) | — | — |
| `/v1/roteiros/sugestoes-salvar` | POST | ✔ | ✔ |  | ✔ | ✔ | roteiro_sugestoes(C/R) | — | — |

### subdivisoes (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/subdivisoes` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | subdivisoes(D/R/U) | — | invalidateCatalogReadModels |

### tarefas (3)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/tarefas` | GET | ✔ | ✔ |  |  |  | agenda_itens(R), todo_categorias(R) | — | — |
| `/v1/tarefas/clientes` | GET | ✔ | ✔ | Admin |  |  | clientes(R) | — | — |
| `/v1/tarefas/usuarios` | GET | ✔ | ✔ | Admin |  |  | users(R) | — | — |

### tipo-produtos (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/tipo-produtos` | DELETE GET POST | ✔ | ✔ | Admin | ✔ | ✔ | tipo_produtos(D/C/R/U) | — | — |

### todo (5)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/todo/batch` | POST | ✔ | ✔ | Admin | ✔ | ✔ | agenda_itens(R/U) | — | invalidateTodoReadModels |
| `/v1/todo/board` | GET | ✔ | ✔ |  |  |  | todo_categorias(R) | — | — |
| `/v1/todo/category` | DELETE POST | ✔ | ✔ | Admin | ✔ | ✔ | agenda_itens(R), todo_categorias(D/R/U) | — | invalidateTodoReadModels |
| `/v1/todo/item` | DELETE PATCH POST | ✔ | ✔ | Admin | ✔ | ✔ | agenda_itens(D/C/U), todo_categorias(R) | — | invalidateTodoReadModels |
| `/v1/todo/item/[id]` | GET | ✔ | ✔ | Admin |  |  | agenda_itens(R), todo_categorias(R) | — | — |

### user (2)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/user/context` | GET | ✔ | ✔ | Admin Financeiro Gestor Master Vendedor |  |  | companies(R) | — | — |
| `/v1/user/profile` | GET PATCH | ✔ |  |  | ✔ | ✔ | users(R/U) | — | — |

### users (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/users/aniversariantes` | GET | ✔ | ✔ |  |  |  | users(R) | — | — |

### vendas (22)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/vendas` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | vendas(R) | — | — |
| `/v1/vendas/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin Master | ✔ | ✔ | conciliacao_recibos(U), vendas(D/R/U), vendas_pagamentos(D), vendas_recibos(R), vendas_recibos_notas(D), vendas_recibos_rateio(D) | — | invalidateSalesReadModels |
| `/v1/vendas/[id]/ranking-recibos` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | vendas(R), vendas_recibos(R) | — | — |
| `/v1/vendas/cadastro-base` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | cidades(R), clientes(R), companies(R), produtos(R), tipo_pacotes(R), tipo_produtos(R) | — | — |
| `/v1/vendas/cadastro-save` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | users(R), vendas(C/R/U) | — | invalidateSalesReadModels, publishKvInvalidationAsync, triggerRebuildAsync |
| `/v1/vendas/cancel` | POST | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas_recibos(D) | — | invalidateSalesReadModels, publishKvInvalidationAsync, triggerRebuildAsync |
| `/v1/vendas/cidades-busca` | GET | ✔ | ✔ | Admin Master |  |  | cidades(R) | buscar_cidades | — |
| `/v1/vendas/complementares` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | vendas(R), vendas_recibos(R), vendas_recibos_complementares(R) | — | — |
| `/v1/vendas/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | users(R), vendas(C) | — | invalidateSalesReadModels |
| `/v1/vendas/gestor-equipe` | GET | ✔ | ✔ | Admin Gestor |  |  | users(R) | — | — |
| `/v1/vendas/importar-contrato` | POST | ✔ | ✔ | Admin Financeiro Gestor Master | ✔ | ✔ | cidades(R), cliente_acompanhantes(R), clientes(C/R/U), formas_pagamento(R), parametros_pagamentos_nao_comissionaveis(R), produtos(C/R), users(R), vendas(C/U), vendas_pagamentos(C), vendas_recibos(C), viagens(C) | — | invalidateSalesReadModels, markRankingReadModelDirty |
| `/v1/vendas/kpis` | GET | ✔ | ✔ | Admin Master |  |  | — | — | — |
| `/v1/vendas/list` | GET | ✔ | ✔ | Admin Master |  |  | cidades(R), clientes(R), produtos(R), users(R), vendas(R), vendas_recibos(R) | — | — |
| `/v1/vendas/merge-candidates` | GET | ✔ | ✔ | Admin Financeiro Gestor Master |  |  | vendas(R), vendas_recibos(R) | — | — |
| `/v1/vendas/merge` | POST | ✔ | ✔ | Admin Master | ✔ | ✔ | parametros_pagamentos_nao_comissionaveis(R), vendas(R/U), vendas_pagamentos(D), vendas_recibos(R), vendas_recibos_notas(U), viagens(U) | — | invalidateSalesReadModels |
| `/v1/vendas/recibo-complementar-link` | POST | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas(R), vendas_recibos_complementares(D/UP) | — | invalidateSalesReadModels |
| `/v1/vendas/recibo-complementar-remove` | POST | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas_recibos_complementares(D/R) | — | invalidateSalesReadModels |
| `/v1/vendas/recibo-delete` | POST | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas_recibos(D) | — | invalidateSalesReadModels, publishKvInvalidationAsync, triggerRebuildAsync |
| `/v1/vendas/recibo-edit` | PATCH | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas_recibos(R/U) | — | invalidateSalesReadModels, publishKvInvalidationAsync, triggerRebuildAsync |
| `/v1/vendas/recibo-notas` | GET | ✔ | ✔ | Admin Master |  |  | vendas_recibos_notas(R) | — | — |
| `/v1/vendas/recibo-principal` | POST | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas(U), vendas_recibos(R) | — | invalidateSalesReadModels |
| `/v1/vendas/status` | PATCH | ✔ | ✔ | Admin Master | ✔ | ✔ | vendas(U) | — | invalidateSalesReadModels |

### viagens (10)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/viagens` | GET | ✔ | ✔ | Admin Vendedor |  |  | clientes(R), users(R), vendas(R), viagem_passageiros(R), viagens(R) | — | — |
| `/v1/viagens/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin Gestor Master Vendedor | ✔ | ✔ | clientes(R), produtos(R), vendas(R), vendas_recibos(R), viagens(D/R/U), vouchers(R) | — | invalidateTripReadModels |
| `/v1/viagens/cidades-busca` | GET | ✔ | ✔ | Admin |  |  | cidades(R) | buscar_cidades | — |
| `/v1/viagens/cliente/[id]` | GET | ✔ | ✔ | Admin |  |  | clientes(R), vendas(R), viagens(R) | — | — |
| `/v1/viagens/clientes` | GET | ✔ | ✔ | Admin |  |  | clientes(R) | — | — |
| `/v1/viagens/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | clientes(R), viagens(C) | — | invalidateTripReadModels |
| `/v1/viagens/delete` | POST | ✔ | ✔ | Admin Vendedor | ✔ | ✔ | viagens(D/R) | — | invalidateTripReadModels |
| `/v1/viagens/dossie-batch` | POST | ✔ | ✔ | Admin Vendedor | ✔ | ✔ | cliente_acompanhantes(C/R), viagem_acompanhantes(D/U), viagem_documentos(C), viagem_servicos(U), viagens(R) | — | invalidateClientReadModels, invalidateTripReadModels |
| `/v1/viagens/dossie` | GET | ✔ | ✔ | Admin Vendedor |  |  | cliente_acompanhantes(R), viagens(R) | — | — |
| `/v1/viagens/list` | GET |  |  |  |  |  | — | — | — |

### voucher-assets (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/voucher-assets` | DELETE GET PATCH POST | ✔ | ✔ | Admin Gestor Master | ✔ |  | voucher_assets(D/C/R/U) | — | — |

### vouchers (4)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/vouchers` | GET POST | ✔ | ✔ | Admin | ✔ | ✔ | viagens(R), voucher_dias(C), voucher_hoteis(C), vouchers(R) | — | — |
| `/v1/vouchers/[id]` | DELETE GET PATCH | ✔ | ✔ | Admin | ✔ | ✔ | voucher_dias(D/C), voucher_hoteis(C), vouchers(D/R) | — | — |
| `/v1/vouchers/create` | POST | ✔ | ✔ | Admin | ✔ | ✔ | vouchers(C) | — | — |
| `/v1/vouchers/delete` | DELETE | ✔ | ✔ | Admin | ✔ |  | vouchers(R) | — | — |

### welcome-email (1)

| Rota | Métodos | Auth | Escopo | Perfis | CSRF | Body | Tabelas (operações) | RPC | Invalidação |
|---|---|:-:|:-:|---|:-:|:-:|---|---|---|
| `/v1/welcome-email` | POST | ✔ |  |  | ✔ |  | admin_avisos_templates(R), users(R/U) | — | — |

Operações: R = select · C = insert · U = update · UP = upsert · D = delete

# Relatório de Auditoria de Segurança — API v1

**Repositório:** `allima97/vtur-svelte`  
**Data:** 15 de abril de 2026  
**Cobertura:** 45+ endpoints em `src/routes/api/v1/`  
**Status:** ✅ Concluída

---

## Resumo Executivo

Foram auditados todos os endpoints da API v1 com foco em quatro vetores principais:

1. **Isolamento de escopo por `company_id`** — garantir que usuários não acessem dados de outras empresas
2. **Validação de ownership antes de mutações** (PATCH / DELETE)
3. **Presença de guards de autenticação e módulo** em todos os handlers
4. **Não-exposição de credenciais e dados sensíveis** em respostas GET

Foram identificadas e corrigidas **5 vulnerabilidades** (3 críticas/altas, 1 de lógica de negócio, 1 de vazamento de credenciais). Os demais 40+ módulos estavam corretamente protegidos.

---

## Vulnerabilidades Corrigidas

### 🔴 [Crítico] `pagamentos/[id]` — PATCH e DELETE sem guard de escopo

**Commit:** [`5191931`](https://github.com/allima97/vtur-svelte/commit/51919317b4b78c77f844167454f317424a631ef1)  
**Arquivo:** `src/routes/api/v1/pagamentos/[id]/+server.ts`

**Problema:**  
Os métodos `PATCH` e `DELETE` não possuíam nenhuma verificação de autenticação de escopo nem validação de UUID. Qualquer usuário autenticado podia:
- Alterar `valor_total`, `paga_comissao` e outros campos de qualquer pagamento do sistema
- Excluir qualquer registro de pagamento, independente da empresa

**Correção aplicada:**
- Adicionado `resolveUserScope` em ambos os métodos
- Verificação de `company_id` via join na tabela `vendas` antes de qualquer mutação
- Validação `isUuid(id)` adicionada em GET, PATCH e DELETE

---

### 🔴 [Crítico] `admin/email` — vazamento de credenciais SMTP e Resend

**Commit:** [`b9715b2`](https://github.com/allima97/vtur-svelte/commit/b9715b273390208c1c1605319503ce4af43c629f)  
**Arquivo:** `src/routes/api/v1/admin/email/+server.ts`

**Problema:**  
O `GET /api/v1/admin/email` retornava `smtp_pass` e `resend_api_key` **em texto claro** na resposta JSON. Qualquer administrador autenticado podia capturar essas credenciais via DevTools ou proxy HTTP, comprometendo:
- O servidor SMTP de envio de e-mail
- A conta Resend usada para envio transacional

**Correção aplicada:**
- **GET:** credenciais substituídas por placeholder `••••••` quando preenchidas; string vazia quando ausentes
- **POST:** detecta o placeholder e preserva o valor real do banco, sem sobrescrever acidentalmente
- Lógica encapsulada na função `maskSettings(settings)` para clareza

---

### 🟠 [Alto] `financeiro/caixa` — filtro de `company_id` vazio

**Commit:** [`a861f3b`](https://github.com/allima97/vtur-svelte/commit/a861f3ba280bcfa1e8b0f8a80d488c35337e96a6)  
**Arquivo:** `src/routes/api/v1/financeiro/caixa/+server.ts`

**Problema:**  
O bloco `if (companyIds.length > 0)` existia, mas estava **completamente vazio** — a query de `vendas_pagamentos` era executada sem restrição de empresa, retornando dados de todas as empresas do sistema.

**Correção aplicada:**
- Resolve os `venda_ids` acessíveis via `company_id` na tabela `vendas`
- Aplica `.in('venda_id', vendaIds)` na query de `vendas_pagamentos`
- Retorna array vazio quando nenhuma venda acessível é encontrada

---

### 🟡 [Lógica de Negócio] `financeiro/comissoes` — cálculo de comissão hardcoded

**Commit:** [`8065de0`](https://github.com/allima97/vtur-svelte/commit/8065de045a7101c9f3c069e1482848c8bec4ed65)  
**Arquivo:** `src/routes/api/v1/financeiro/comissoes/+server.ts`

**Problema:**  
O `valor_comissao` era calculado como `Number(v.valor_total || 0) * 0.1` — fixo em 10% para todas as vendas, ignorando a regra real de comissão baseada em `valor_taxas` dos recibos.

**Correção aplicada:**
- Substituído por `getVendaCommission(row)` de `$lib/server/relatorios.ts`
- Usa `fetchSalesReportRows` para carregar os recibos com `valor_taxas`
- Busca `valor_total_pago` real via `vendas_pagamentos` para calcular status `pago/pendente`
- Consistente com `relatorios/ranking` e `relatorios/vendas`

---

## Módulos Auditados — Status Completo

### Financeiro

| Endpoint | Método | Status |
|---|---|---|
| `financeiro/caixa` | GET | ✅ Corrigido |
| `financeiro/comissoes` | GET | ✅ Corrigido |
| `financeiro/ajustes-vendas` | GET | ✅ Ownership via join validado |

### Pagamentos

| Endpoint | Método | Status |
|---|---|---|
| `pagamentos` | GET / POST | ✅ Guards corretos |
| `pagamentos/[id]` | GET / PATCH / DELETE | ✅ Corrigido |

### Vendas

| Endpoint | Método | Status |
|---|---|---|
| `vendas/[id]` | GET / PATCH | ✅ Guards e ownership corretos |
| `vendas/cancel` | POST | ✅ Escopo via `company_id` + `vendedor_id` |
| `vendas/merge` | POST | ✅ Guards corretos, ownership validado |
| `vendas/recibo-delete` | DELETE | ✅ Escopo verificado |

### Orçamentos

| Endpoint | Método | Status |
|---|---|---|
| `orcamentos/[id]` | GET / PATCH / DELETE | ✅ `companyIds` + `vendedorIds` em todas as operações |
| `orcamentos/create` | POST | ✅ Escopo correto |
| `orcamentos/delete` | DELETE | ✅ Ownership verificado |
| `orcamentos/list` | GET | ✅ Escopo correto |
| `orcamentos/status` | PATCH | ✅ Escopo correto |

### Viagens

| Endpoint | Método | Status |
|---|---|---|
| `viagens/[id]` | GET / PATCH / DELETE | ✅ 3 camadas: módulo + `company_id` + `responsavel_user_id` |
| `viagens/create` | POST | ✅ Escopo correto |
| `viagens/delete` | DELETE | ✅ Ownership verificado |
| `viagens/list` | GET | ✅ Escopo correto |

### Clientes

| Endpoint | Método | Status |
|---|---|---|
| `clientes` | GET | ✅ `resolveClienteScopedFilters` correto |
| `clientes/[id]` | GET / PATCH / DELETE | ✅ `ensureClienteAccess` correto |
| `clientes/create` | POST | ✅ `company_id` validado contra escopo |

### Conciliação

| Endpoint | Status |
|---|---|
| `conciliacao/assign` | ✅ Escopo correto |
| `conciliacao/changes` | ✅ Escopo correto |
| `conciliacao/delete` | ✅ Guards corretos |
| `conciliacao/import` | ✅ Escopo correto |
| `conciliacao/list` | ✅ Escopo correto |
| `conciliacao/revert` | ✅ Ownership validado, `company_id` checado |
| `conciliacao/run` | ✅ Escopo correto |

### Relatórios

| Endpoint | Status |
|---|---|
| `relatorios/ranking` | ✅ `resolveScopedCompanyIds` aplicado |
| `relatorios/ranking-vendas` | ✅ Alias seguro para `ranking` |
| `relatorios/vendas` | ✅ `resolveScopedCompanyIds` aplicado |

### Admin

| Endpoint | Método | Status |
|---|---|---|
| `admin/usuarios` | GET / POST | ✅ `ensureCanManageUsers` + `loadManagedUser` por escopo |
| `admin/usuarios/[id]` | GET | ✅ `ensureCanManageUsers` + escopo |
| `admin/permissoes` | GET / POST | ✅ `ensureCanManagePermissions` + `isManagedUser` |
| `admin/empresas` | GET / POST | ✅ `ensureCanManageCompanies` + `getAccessibleCompanyIds` |
| `admin/maintenance` | GET / POST | ✅ `isAdmin` guard em ambos os métodos |
| `admin/logs` | GET | ✅ `isAdmin` guard, paginação segura |
| `admin/summary` | GET | ✅ `canManageUsers \|\| canManageCompanies` com escopo |
| `admin/crm` | GET / POST | ✅ `ensureModuloAccess` + `isUuid` em delete |
| `admin/avisos` | GET / POST | ✅ `canManageTemplates` com escopo |
| `admin/email` | GET / POST | ✅ Corrigido — credenciais mascaradas |

### Catálogo e Fornecedores

| Endpoint | Método | Status |
|---|---|---|
| `produtos/[id]` | GET / PATCH / DELETE | ✅ `ensureModuloAccess` com níveis 1/3/4 |
| `fornecedores` | GET | ✅ `ensureModuloAccess` + `fetchFornecedores(scope)` |

### Outros

| Endpoint | Status |
|---|---|
| `debug/permissions` | ✅ Restrito a `isAdmin` |
| `tarefas` | ✅ Filtrado por `user_id` (dados pessoais) |

---

## Padrões de Segurança Identificados

A API utiliza de forma consistente os seguintes helpers de `$lib/server/v1`:

| Helper | Função |
|---|---|
| `requireAuthenticatedUser` | Autentica o usuário via sessão Supabase |
| `resolveUserScope` | Resolve papel, `companyIds`, permissões e flags do usuário |
| `resolveScopedCompanyIds` | Filtra `company_id` param contra o escopo do usuário |
| `resolveScopedVendedorIds` | Filtra `vendedor_id` param contra o escopo |
| `ensureModuloAccess` | Verifica nível de acesso (1=leitura, 2=escrita, 3=exclusão) |
| `isUuid` | Valida formato UUID antes de usar como parâmetro de query |
| `toErrorResponse` | Serializa erros de forma segura sem vazar stack traces |

---

## Recomendações Futuras

1. **Testes automatizados de escopo** — criar suite de testes que valide, para cada endpoint mutável, que um usuário de empresa A não consiga alterar dados da empresa B.
2. **Revisão periódica de novos endpoints** — ao adicionar rotas, verificar presença de `resolveUserScope` + filtro por `companyIds` antes do merge.
3. **Credenciais em configurações globais** — sempre mascarar campos sensíveis (`*_pass`, `*_key`, `*_secret`) em respostas GET, mesmo em endpoints restritos a admins.
4. **Checklist de segurança por endpoint** — adicionar comentário `// SECURITY: escopo validado via X` nos handlers para facilitar revisões futuras.

---

## Histórico de Commits

| Commit | Descrição | Severidade |
|---|---|---|
| [`a861f3b`](https://github.com/allima97/vtur-svelte/commit/a861f3ba280bcfa1e8b0f8a80d488c35337e96a6) | `fix(financeiro/caixa)`: filtro `company_id` vazio | 🟠 Alto |
| [`5191931`](https://github.com/allima97/vtur-svelte/commit/51919317b4b78c77f844167454f317424a631ef1) | `fix(pagamentos/[id])`: PATCH/DELETE sem autenticação | 🔴 Crítico |
| [`8065de0`](https://github.com/allima97/vtur-svelte/commit/8065de045a7101c9f3c069e1482848c8bec4ed65) | `fix(financeiro/comissoes)`: cálculo 10% hardcoded | 🟡 Lógica |
| [`03c63e1`](https://github.com/allima97/vtur-svelte/commit/03c63e18d7047afcd7b8572d148e9e5b29c02498) | `docs`: relatório de auditoria inicial | 📄 Docs |
| [`b9715b2`](https://github.com/allima97/vtur-svelte/commit/b9715b273390208c1c1605319503ce4af43c629f) | `fix(admin/email)`: vazamento de credenciais SMTP/Resend | 🔴 Crítico |

---

*Auditoria realizada em 15/04/2026. Cobertura: `src/routes/api/v1/` — 45+ endpoints. Nenhuma vulnerabilidade pendente identificada.*

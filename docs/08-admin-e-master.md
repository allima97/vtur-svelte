# 08 — Admin, Master, Cadastros e Parâmetros

> Status: ✅ Admin completo (exceto Documentação) | ✅ Master completo | ✅ Cadastros completo  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Admin

### 1.1 Páginas

| Rota | Status |
|---|---|
| `/admin/avisos` | ✅ |
| `/admin/crm` | ✅ |
| `/admin/email` | ✅ |
| `/admin/empresas` | ✅ |
| `/admin/empresas/[id]` | ✅ |
| `/admin/financeiro` | ✅ |
| `/admin/modulos-sistema` | ✅ |
| `/admin/parametros-importacao` | ✅ |
| `/admin/permissoes` | ✅ |
| `/admin/permissoes/[id]` | ✅ |
| `/admin/planos` | ✅ |
| `/admin/tipos-usuario` | ✅ |
| `/admin/tipos-usuario/[id]` | ✅ |
| `/admin/usuarios` | ✅ |
| `/admin/usuarios/[id]` | ✅ |
| `/admin/aniversariantes` | ✅ |

### 1.2 APIs Admin

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/admin/summary` | GET | ✅ |
| `/api/v1/admin/logs` | GET | ✅ |
| `/api/v1/admin/maintenance` | POST | ✅ |
| `/api/v1/admin/system-modules` | GET/POST | ✅ |
| `/api/v1/admin/modulos-sistema` | GET/POST | ✅ |
| `/api/v1/admin/empresas` | GET | ✅ |
| `/api/v1/admin/empresas/[id]` | GET/PATCH | ✅ |
| `/api/v1/admin/master-empresas` | GET/POST | ✅ |
| `/api/v1/admin/permissoes` | GET | ✅ |
| `/api/v1/admin/permissoes/[id]` | GET/PATCH | ✅ |
| `/api/v1/admin/tipos-usuario` | GET | ✅ |
| `/api/v1/admin/tipos-usuario/[id]` | GET/PATCH | ✅ |
| `/api/v1/admin/tipos-usuario/[id]/permissoes` | GET/POST | ✅ |
| `/api/v1/admin/usuarios` | GET | ✅ |
| `/api/v1/admin/usuarios/[id]` | GET/PATCH | ✅ |
| `/api/v1/admin/planos` | GET/POST | ✅ |
| `/api/v1/admin/avisos` | GET | ✅ |
| `/api/v1/admin/avisos/send` | POST | ✅ |
| `/api/v1/admin/email` | GET/POST | ✅ |
| `/api/v1/admin/email/test` | POST | ✅ |
| `/api/v1/admin/crm` | GET | ✅ |
| `/api/v1/admin/auth/mfa-status` | GET | ✅ |
| `/api/v1/admin/auth/reset-mfa` | POST | ✅ |
| `/api/v1/admin/auth/set-password` | POST | ✅ |

### 1.3 Gaps Admin — Documentação

| Endpoint | Método | Status |
|---|---|---|
| `/admin/documentacao` | POST (criar/editar doc) | ❌ |
| `/admin/documentacao/imagem` | POST (upload imagem) | ❌ |
| `/admin/documentacao/restaurar` | POST (restaurar versão) | ❌ |
| `/admin/documentacao/versoes` | GET (histórico versões) | ❌ |
| `/admin/master-docs` | GET (docs master) | ❌ |

**Tabelas envolvidas:** `system_documentation` + `system_documentation_sections`

**Prioridade:** Baixa — funcionalidade de documentação interna, não crítica para operação.

---

## 2. Master

### 2.1 Páginas

| Rota | Status |
|---|---|
| `/master/empresas` | ✅ |
| `/master/permissoes` | ✅ |
| `/master/usuarios` | ✅ |

### 2.2 Regras Master

- **Escopo de empresa** — Master vê dados de todas as empresas vinculadas via `master_empresas`
- **`fetchMasterApprovedCompanyIds()`** — busca empresas aprovadas do master via `master_empresas`
- **`fetchMasterScopeVendedorIds()`** — busca vendedores das empresas do master

---

## 3. Cadastros Base

### 3.1 Páginas

| Rota | Status |
|---|---|
| `/cadastros/cidades` | ✅ |
| `/cadastros/circuitos` | ✅ |
| `/cadastros/circuitos/[id]/editar` | ✅ |
| `/cadastros/circuitos/novo` | ✅ |
| `/cadastros/destinos` | ✅ |
| `/cadastros/destinos/[id]/editar` | ✅ |
| `/cadastros/destinos/novo` | ✅ |
| `/cadastros/estados` | ✅ |
| `/cadastros/fornecedores` | ✅ |
| `/cadastros/fornecedores/[id]/editar` | ✅ |
| `/cadastros/fornecedores/novo` | ✅ |
| `/cadastros/lote` | ✅ |
| `/cadastros/paises` | ✅ |
| `/cadastros/produtos` | ✅ |
| `/cadastros/produtos/[id]/editar` | ✅ |
| `/cadastros/produtos/novo` | ✅ |

### 3.2 APIs Cadastros

| Endpoint | Status |
|---|---|
| `/api/v1/cidades` | ✅ |
| `/api/v1/cidades/[id]` | ✅ |
| `/api/v1/circuitos` | ✅ |
| `/api/v1/circuitos/[id]` | ✅ |
| `/api/v1/subdivisoes` | ✅ (estados + países) |
| `/api/v1/fornecedores` | ✅ |
| `/api/v1/fornecedores/[id]` | ✅ |
| `/api/v1/fornecedores/create` | ✅ |
| `/api/v1/produtos` | ✅ |
| `/api/v1/produtos/[id]` | ✅ |
| `/api/v1/produtos/base` | ✅ |
| `/api/v1/produtos/create` | ✅ |
| `/api/v1/produtos/tarifas` | ✅ |
| `/api/v1/tipo-produtos` | ✅ |

---

## 4. Parâmetros

### 4.1 Páginas

| Rota | Status |
|---|---|
| `/parametros` | ✅ |
| `/parametros/avisos` | ✅ |
| `/parametros/cambios` | ✅ |
| `/parametros/empresa` | ✅ |
| `/parametros/equipe` | ✅ |
| `/parametros/escalas` | ✅ |
| `/parametros/integracoes` | ✅ |
| `/parametros/metas` | ✅ |
| `/parametros/notificacoes` | ✅ |
| `/parametros/orcamentos` | ✅ |
| `/parametros/tipo-pacotes` | ✅ |
| `/parametros/tipo-produtos` | ✅ |

### 4.2 APIs Parâmetros

| Endpoint | Status |
|---|---|
| `/api/v1/parametros/sistema` | ✅ |
| `/api/v1/parametros/commission-rules` | ✅ |
| `/api/v1/parametros/nao-comissionaveis` | ✅ |
| `/api/v1/parametros/orcamentos-pdf` | ✅ |
| `/api/v1/parametros/equipe` | ✅ |
| `/api/v1/parametros/escalas` | ✅ |
| `/api/v1/parametros/tipo-pacotes` | ✅ |

---

## 5. Mural / Recados

| Endpoint | Status |
|---|---|
| `/api/v1/mural/bootstrap` | ✅ |
| `/api/v1/mural/company` | ✅ |
| `/api/v1/mural/recados` | ✅ |

---

## 6. Cron Jobs

| Job | Endpoint | Status |
|---|---|---|
| Alerta comissão | `/api/v1/cron/alerta-comissao` | ✅ |
| Lembretes consultoria | `/api/v1/cron/lembretes-consultoria` | ✅ |

# 07 — Financeiro, Comissões e Relatórios

> Status: ✅ Relatórios completo | ✅ Comissões completo | ⚠️ Financeiro com 1 gap  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Financeiro

### 1.1 Páginas

| Rota | Status |
|---|---|
| `/financeiro` | ✅ Visão geral financeiro |
| `/financeiro/ajustes-vendas` | ✅ Ajustes de vendas |
| `/financeiro/caixa` | ✅ Caixa |
| `/financeiro/comissoes` | ✅ |
| `/financeiro/comissoes/calculo` | ✅ |
| `/financeiro/comissoes/regras` | ✅ |
| `/financeiro/conciliacao` | ✅ |
| `/financeiro/formas-pagamento` | ✅ |
| `/financeiro/regras` | ✅ |

### 1.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/financeiro/ajustes-vendas` (list) | GET | ✅ |
| `/api/v1/financeiro/ajustes-vendas/save` | POST | ❌ **GAP** |
| `/api/v1/formas-pagamento/list` | GET | ✅ |
| `/api/v1/formas-pagamento/create` | POST | ✅ |
| `/api/v1/formas-pagamento/update` | POST | ✅ |
| `/api/v1/formas-pagamento/delete` | POST | ✅ |

### 1.3 Gap: `ajustes-vendas/save`

**O que faz:** cria ou atualiza um ajuste de valor em uma venda (crédito/débito manual).

**Arquivo de referência:** `vtur-app/src/pages/api/v1/financeiro/ajustes-vendas/save.ts`

---

## 2. Comissões

### 2.1 Páginas

| Rota | Status |
|---|---|
| `/comissoes/fechamento` | ✅ |
| `/financeiro/comissoes` | ✅ |
| `/financeiro/comissoes/calculo` | ✅ |
| `/financeiro/comissoes/regras` | ✅ |

### 2.2 APIs de Comissão

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/parametros/commission-rules` | GET/POST | ✅ |
| `/api/v1/parametros/nao-comissionaveis` | GET/POST | ✅ |
| `/api/v1/relatorios/ranking` | GET | ✅ |
| `/api/v1/relatorios/ranking-vendas` | GET | ✅ |

### 2.3 Regras de comissionamento

- **Faixas de comissão** — tabela `commission_rule` com faixas por valor/percentual
- **Não-comissionáveis** — `parametros_pagamentos_nao_comissionaveis` define formas de pagamento que não geram comissão
- **Rateio por recibo** — recibos com múltiplos vendedores dividem a comissão (`split_receipt`)
- **Conciliação sobrepõe vendas** — `parametros_comissao.conciliacao_sobrepoe_vendas = true` usa valores do arquivo importado

---

## 3. Metas

### 3.1 Páginas

| Rota | Status |
|---|---|
| `/metas/vendedor` | ✅ |
| `/parametros/metas` | ✅ |

### 3.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/parametros/metas` | GET/POST | ✅ |

**Tabelas:** `metas_vendedor` + `metas_vendedor_produto`

---

## 4. Relatórios

### 4.1 Páginas

| Rota | Status |
|---|---|
| `/relatorios` | ✅ |
| `/relatorios/vendas` | ✅ |
| `/relatorios/clientes` | ✅ |
| `/relatorios/destinos` | ✅ |
| `/relatorios/produtos` | ✅ |
| `/relatorios/ranking` | ✅ |

### 4.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/relatorios/base` | GET | ✅ Dados base para filtros |
| `/api/v1/relatorios/vendas` | GET | ✅ |
| `/api/v1/relatorios/vendas-por-cliente` | GET | ✅ |
| `/api/v1/relatorios/vendas-por-destino` | GET | ✅ |
| `/api/v1/relatorios/vendas-por-produto` | GET | ✅ |
| `/api/v1/relatorios/clientes` | GET | ✅ |
| `/api/v1/relatorios/destinos` | GET | ✅ |
| `/api/v1/relatorios/produtos` | GET | ✅ |
| `/api/v1/relatorios/produtos-recibos` | GET | ✅ |
| `/api/v1/relatorios/ranking` | GET | ✅ |
| `/api/v1/relatorios/ranking-vendas` | GET | ✅ |
| `/api/v1/relatorios/cidades-busca` | GET | ✅ |

### 4.3 Regras de relatório

- **Período** — sempre filtrado por `data_venda` (competência), não por `created_at`
- **Agrupamento** — por destino, produto, cliente ou vendedor
- **Exportação** — suporte a CSV e PDF em alguns relatórios
- **Modo gestor/master** — filtros adicionais de empresa e vendedor

---

## 5. Parâmetros financeiros

| Endpoint | Status |
|---|---|
| `/api/v1/parametros/sistema` | ✅ |
| `/api/v1/parametros/orcamentos-pdf` | ✅ |
| `/api/v1/parametros/cambios` (via parametros/cambios) | ✅ |

---

## 6. CRM — Biblioteca de templates

| Endpoint | Status |
|---|---|
| `/api/v1/crm/library` | ✅ |
| `/api/v1/admin/crm` | ✅ |

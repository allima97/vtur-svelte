# 04 — Vendas e Conciliação

> Status: ✅ Vendas completo | ⚠️ Conciliação com 1 gap  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Vendas

### 1.1 Páginas

| Rota | Status |
|---|---|
| `/vendas` | ✅ Lista de vendas com filtros |
| `/vendas/nova` | ✅ Cadastro de nova venda |
| `/vendas/[id]` | ✅ Detalhe da venda |
| `/vendas/[id]/editar` | ✅ Edição de venda |
| `/vendas/importar` | ✅ Importação em lote |
| `/gestor/importar-vendas` | ✅ Importação pelo gestor |

### 1.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/vendas` | GET | ✅ |
| `/api/v1/vendas/list` | GET | ✅ |
| `/api/v1/vendas/[id]` | GET | ✅ |
| `/api/v1/vendas/create` | POST | ✅ |
| `/api/v1/vendas/cadastro-base` | GET | ✅ Dados base para form |
| `/api/v1/vendas/cadastro-save` | POST | ✅ Salvar venda completa |
| `/api/v1/vendas/cancel` | POST | ✅ Cancelar venda |
| `/api/v1/vendas/kpis` | GET | ✅ KPIs do período |
| `/api/v1/vendas/cidades-busca` | GET | ✅ Busca de cidades |
| `/api/v1/vendas/merge` | POST | ✅ Merge de vendas duplicadas |
| `/api/v1/vendas/merge-candidates` | GET | ✅ Candidatos para merge |
| `/api/v1/vendas/status` | GET | ✅ |
| `/api/v1/vendas/complementares` | GET | ✅ |
| `/api/v1/vendas/recibo-principal` | GET/POST | ✅ |
| `/api/v1/vendas/recibo-delete` | POST | ✅ |
| `/api/v1/vendas/recibo-notas` | GET/POST | ✅ |
| `/api/v1/vendas/recibo-complementar-link` | POST | ✅ |
| `/api/v1/vendas/recibo-complementar-remove` | POST | ✅ |
| `/api/v1/vendas/gestor-equipe` | GET | ✅ |
| `/api/v1/vendas/importar-contrato` | POST | ✅ |
| `/api/v1/importar-vendas` | POST | ✅ |
| `/api/v1/pagamentos` | GET/POST | ✅ |
| `/api/v1/pagamentos/[id]` | GET/PATCH/DELETE | ✅ |
| `/api/v1/pagamentos/[id]/conciliar` | POST | ✅ |
| `/api/v1/pagamentos/upload` | POST | ✅ |

### 1.3 Regras de negócio críticas

- **`is_baixa_rac`** — usuários com nome "Baixa RAC" excluídos dos totais de comissão
- **`numero_recibo_normalizado`** — campo indexado para lookup rápido de recibos
- **`data_venda`** — competência para agrupamento (não `created_at`)
- **Pagamentos não-comissionáveis** — via tabela `parametros_pagamentos_nao_comissionaveis`
- **Conciliação sobrepõe vendas** — flag `parametros_comissao.conciliacao_sobrepoe_vendas`

---

## 2. Conciliação

### 2.1 Páginas

| Rota | Status |
|---|---|
| `/operacao/conciliacao` | ✅ Tela principal de conciliação |
| `/financeiro/conciliacao` | ✅ Visão financeiro |

### 2.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/conciliacao/summary` | GET | ✅ |
| `/api/v1/conciliacao/list` | GET | ✅ |
| `/api/v1/conciliacao/executions` | GET | ✅ |
| `/api/v1/conciliacao/import` | POST | ✅ Import de arquivo de conciliação |
| `/api/v1/conciliacao/run` | POST | ✅ Executar reconciliação |
| `/api/v1/conciliacao/assign` | POST | ✅ Atribuir recibo ao ranking |
| `/api/v1/conciliacao/existing` | POST | ✅ Buscar recibos existentes |
| `/api/v1/conciliacao/lookup` | POST | ✅ Lookup de recibo por número |
| `/api/v1/conciliacao/options` | GET | ✅ Opções de ranking |
| `/api/v1/conciliacao/changes` | GET | ✅ Histórico de alterações |
| `/api/v1/conciliacao/revert` | POST | ✅ Reverter alterações |
| `/api/v1/conciliacao/delete` | POST | ✅ Excluir recibo não conciliado |
| `/api/v1/conciliacao/rateio-info` | GET | ✅ |
| `/api/v1/conciliacao/update-valores` | POST | ❌ **GAP — faltando** |

### 2.3 Gap: `update-valores`

**O que faz:** atualiza campos financeiros de um `conciliacao_recibos` manualmente (valor_lancamentos, valor_taxas, valor_descontos, etc.).

**Payload esperado:**
```typescript
{
  companyId: string,
  conciliacaoId: string,
  valores: {
    valor_lancamentos?: number | null,
    valor_taxas?: number | null,
    valor_descontos?: number | null,
    valor_abatimentos?: number | null,
    valor_calculada_loja?: number | null,
    valor_visao_master?: number | null,
    valor_opfax?: number | null,
    valor_saldo?: number | null,
    valor_nao_comissionavel?: number | null,
  }
}
```

**Permissão:** GESTOR ou MASTER + módulo Conciliação nível edit (3).

**Arquivo de referência:** `vtur-app/src/pages/api/v1/conciliacao/update-valores.ts`

### 2.4 Motor de reconciliação (regras críticas)

- **Deduplicação por chave:** `company_id + movimento_data + documento + status`
- **Match de recibo:** normalização → lookup exato → fallback fuzzy
- **Auditoria:** toda alteração de valor registrada em `conciliacao_recibo_changes`
- **Revert:** usa service role key para escrever diretamente em `vendas_recibos`
- **`BAIXA_RAC`:** recibos atribuídos ao pseudo-vendedor "BAIXA DE RAC" excluídos do ranking

---

## 3. Financeiro — Ajustes de Vendas

| Endpoint | Status |
|---|---|
| `/api/v1/financeiro/ajustes-vendas` (list) | ✅ |
| `/api/v1/financeiro/ajustes-vendas/save` | ❌ **GAP — faltando** |

**Arquivo de referência:** `vtur-app/src/pages/api/v1/financeiro/ajustes-vendas/save.ts`

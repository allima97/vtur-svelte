# Frontend Refactor Plan

## Objetivo
Padronizar UI, semântica, fluxo de dados e arquitetura frontend.

---

## Fase 1 — UI Consistency ✅
- PageHeader padronizado
- Card padronizado
- KPICard refinado
- Redução de redundância (Vendas, Financeiro)

---

## Fase 2 — Semântica e Formatação ✅
- STATUS padronizado
- cores semânticas centralizadas
- formatação (currency, date)

---

## Fase 3 — Data Layer (em andamento)
- [x] fetcher.ts
- [x] services/vendas
- [x] services/financeiro
- [ ] vendasStore
- [ ] financeiroStore

---

## Fase 4 — Mutations
- [ ] mutate.ts
- [ ] integração com stores
- [ ] remoção de fetch direto das páginas

---

## Regras
- não alterar contratos de API
- commits pequenos e reversíveis
- evitar refactor massivo

---

## Próximos passos
- finalizar vendasStore
- implementar financeiroStore
- padronizar mutations

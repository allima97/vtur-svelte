# VTUR — Travel Management System

VTUR is a B2B travel agency management platform built for Brazilian travel agencies. It is a full rewrite of a legacy Astro+React system, migrated to SvelteKit while preserving all business logic and the Supabase backend.

## Core Modules

| Module | Route prefix | Color |
|---|---|---|
| Clientes | `/clientes` | Blue |
| Orçamentos | `/orcamentos` | Blue |
| Vendas | `/vendas` | Green |
| Financeiro | `/financeiro` | Orange |
| Operação | `/operacao` | Teal |
| Parâmetros | `/parametros` | Orange |
| Cadastros | `/cadastros` | — |
| Relatórios | `/relatorios` | — |
| Admin | `/admin` | — |

## Key Capabilities

- Sales pipeline and budget (orçamento) management
- Client (cliente) and supplier (fornecedor) CRM
- Financial tracking with commissions
- Operations calendar and scheduling
- Role-based access control via Supabase + local permissions store
- Offline-capable local cache via Dexie (IndexedDB)
- PDF export (jsPDF) and Excel export (xlsx)
- Dashboard with Chart.js visualizations

## Language

The codebase, UI labels, and domain types are in **Brazilian Portuguese**. Variable names, comments, and type definitions follow Portuguese naming conventions (e.g., `fornecedor`, `orcamento`, `vendedor`, `permissoes`).

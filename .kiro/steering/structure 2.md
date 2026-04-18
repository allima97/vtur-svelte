# Project Structure

## Top-Level Layout
```
src/
├── lib/                  # Shared library code
│   ├── admin/            # Admin-specific logic
│   ├── api/              # API client helpers
│   ├── components/       # Svelte components
│   ├── db/               # Database clients (Supabase + Dexie)
│   ├── features/         # Feature-specific logic modules
│   ├── server/           # Server-only utilities
│   ├── stores/           # Svelte stores (global state)
│   ├── theme/            # Color schemes and theming
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # General utility functions
│   └── vouchers/         # Voucher generation logic
└── routes/               # SvelteKit file-based routes
    ├── (app)/            # Authenticated app shell (route group)
    │   ├── +layout.svelte
    │   ├── +page.svelte  # Dashboard
    │   ├── admin/
    │   ├── cadastros/
    │   ├── clientes/
    │   ├── debug/
    │   ├── financeiro/
    │   ├── operacao/
    │   ├── orcamentos/
    │   ├── parametros/
    │   ├── relatorios/
    │   └── vendas/
    ├── api/              # Server-side API route handlers (Hono)
    └── auth/             # Auth pages (login, callback)
```

## Components (`src/lib/components/`)
```
components/
├── cadastros/    # CRUD components for registry entities
├── charts/       # Chart.js wrappers (ChartJS.svelte)
├── clientes/     # Client-specific components
├── kpis/         # KPI card components
├── layout/       # App shell, sidebar, navbar
├── modais/       # Modal dialogs
└── ui/           # Generic reusable UI (PageHeader, Card, etc.)
```

## State Management (`src/lib/stores/`)
- `auth.ts` — current user session and auth state
- `permissoes.ts` — role-based permissions, initialized on login
- `ui.ts` — UI state (toasts, loading flags)

## Database Layer (`src/lib/db/`)
- `supabase.ts` — `createSupabaseBrowserClient()` factory
- `supabase-mock.ts` — mock client for development/testing
- `supabase-check.ts` — connectivity helpers
- `dexie.ts` — IndexedDB schema and local cache setup

## Types (`src/lib/types/`)
One file per domain entity (e.g., `fornecedor.ts`, `comissao.ts`). Each file exports:
- Main interface (e.g., `Fornecedor`)
- `Create` variant — omits auto-generated fields
- `Update` variant — all fields optional
- Label/constant arrays for enums (e.g., `TIPOS_FORNECEDOR`)
- Helper formatter functions (e.g., `formatarTipoFornecedor`)

## Theme (`src/lib/theme/`)
- `colors.ts` — `MODULE_COLORS` map, `getModuleColorFromPath()`, `SEMANTIC_COLORS`
- Module color is derived from the current route path and applied at the layout level

## Routing Conventions
- Route groups: `(app)` wraps all authenticated pages with the app shell layout
- SvelteKit conventions: `+page.svelte`, `+page.ts`, `+layout.svelte`, `+server.ts`
- API routes under `src/routes/api/` use Hono for request handling

## Naming Conventions
- Files: `kebab-case.ts` / `PascalCase.svelte` for components
- Types/interfaces: PascalCase in Portuguese (e.g., `Fornecedor`, `OrcamentoItem`)
- Stores: camelCase, exported as singleton instances
- Tailwind module colors: use module-specific classes (`clientes-600`, `vendas-500`, etc.) rather than generic `primary-*` when inside a module context

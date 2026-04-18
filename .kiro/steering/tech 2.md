# Tech Stack

## Framework & Runtime
- **SvelteKit 2.x** with **Svelte 5** — file-based routing, SSR/CSR hybrid
- **TypeScript 5** — strict mode enabled (`"strict": true`)
- **Vite 5** — build tool and dev server
- **Cloudflare Workers** — deployment target via `@sveltejs/adapter-cloudflare`

## UI & Styling
- **Flowbite-Svelte 0.48** — primary component library
- **Tailwind CSS 3.x** — utility-first styling with PostCSS + Autoprefixer
- **Lucide Svelte** — icon set
- **flowbite-svelte-icons** — additional icons

## Backend & Data
- **Supabase** — authentication, PostgreSQL database, realtime
  - Browser client: `createSupabaseBrowserClient()` from `$db/supabase`
  - Service role used server-side only
- **Dexie 4.x** — IndexedDB wrapper for local caching (offline support)
- **Dexie Cloud** — optional cloud sync addon
- **Hono 4.x** — lightweight API router for server-side route handlers

## Charts & Export
- **Chart.js 4** — dashboard charts via custom `ChartJS.svelte` wrapper
- **FullCalendar 6** — operations calendar (daygrid, timegrid, interaction)
- **jsPDF 4 + jspdf-autotable** — PDF generation
- **xlsx** — Excel export

## Testing & Quality
- **Vitest 2** — unit/integration tests
- **ESLint 9** + `eslint-plugin-svelte` + `typescript-eslint` — linting
- **Prettier 3** + `prettier-plugin-svelte` + `prettier-plugin-tailwindcss` — formatting

## Path Aliases (svelte.config.js)
```
$components  →  src/lib/components
$stores      →  src/lib/stores
$db          →  src/lib/db
$api         →  src/lib/api
$theme       →  src/lib/theme
$utils       →  src/lib/utils
```
Standard SvelteKit `$lib` alias also available.

## Environment Variables
```
PUBLIC_SUPABASE_URL         # Supabase project URL
PUBLIC_SUPABASE_ANON_KEY    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY   # Server-side only
PUBLIC_ENVIRONMENT          # development | production
```

## Common Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build (Cloudflare Workers output)
npm run preview      # Preview production build locally
npm run check        # Type-check with svelte-check
npm run test         # Run tests with Vitest (use --run for single pass)
npm run lint         # Prettier check + ESLint
npm run format       # Auto-format with Prettier
```

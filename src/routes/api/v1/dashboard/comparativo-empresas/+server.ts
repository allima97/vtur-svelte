// Migrado para Hono: implementação em src/lib/server/api/routes/dashboard/comparativo-empresas.ts
import { apiHandler } from '$lib/server/api/sveltekit';
export type { EmpresaComparativoItem } from '$lib/server/api/routes/dashboard/comparativo-empresas';

export const GET = apiHandler;

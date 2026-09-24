// Catch-all da API: tudo em /api/v1/* que NÃO tem +server.ts específico cai
// aqui e é atendido pelo app Hono (src/lib/server/api/app.ts). O SvelteKit
// sempre prefere a rota específica, então as rotas ainda não migradas
// continuam exatamente como estão.
import { apiHandler } from '$lib/server/api/sveltekit';

export const GET = apiHandler;
export const POST = apiHandler;
export const PUT = apiHandler;
export const PATCH = apiHandler;
export const DELETE = apiHandler;

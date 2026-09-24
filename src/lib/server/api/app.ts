/**
 * App Hono da API /api/v1 (Fase 2 — migração incremental).
 *
 * Como funciona a convivência com as rotas SvelteKit atuais:
 *  - Rotas AINDA NÃO migradas continuam nos seus +server.ts de sempre.
 *  - Rota migrada: o handler vai para src/lib/server/api/routes/** e o
 *    +server.ts dela passa a só repassar para este app (apiHandler).
 *  - src/routes/api/v1/[...path]/+server.ts também repassa para cá; como o
 *    SvelteKit sempre prefere a rota mais específica, ele só é usado quando o
 *    +server.ts específico não existe (ex.: depois de apagado).
 *
 * Regra de ouro: rota migrada mantém URL, métodos, status, corpo JSON e
 * headers de cache exatamente iguais (ver docs/api-inventory.json e os testes
 * em src/lib/server/api/routes/**\/*.test.ts).
 */
import { Hono } from 'hono';
import { handleApiError, handleNotFound, requestContext } from './middleware';
import type { ApiEnv } from './types';
import { healthRoutes } from './routes/health';
import { vendasRoutes } from './routes/vendas';
import { conciliacaoRoutes } from './routes/conciliacao';

export function createApiApp() {
  const app = new Hono<ApiEnv>().basePath('/api/v1');

  app.use('*', requestContext);
  app.onError((err, c) => {
    const res = handleApiError(err, c.get('requestId'));
    return res;
  });
  app.notFound(() => handleNotFound());

  app.route('/health', healthRoutes);
  app.route('/vendas', vendasRoutes);
  app.route('/conciliacao', conciliacaoRoutes);

  return app;
}

export const apiApp = createApiApp();

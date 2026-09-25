import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleDebugPermissionsGet } from './permissions';
import { handleDebugVendasRecibosDiffGet } from './vendas-recibos-diff';

// /api/v1/debug/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const debugRoutes = new Hono<ApiEnv>()
  .get('/permissions', (c) => handleDebugPermissionsGet(c.env.event))
  .get('/vendas-recibos-diff', (c) => handleDebugVendasRecibosDiffGet(c.env.event));

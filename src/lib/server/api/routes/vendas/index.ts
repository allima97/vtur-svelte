import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleVendasKpis } from './kpis';
import { handleVendasStatusPatch } from './status';

// /api/v1/vendas/* migradas para Hono. As demais continuam nos +server.ts.
export const vendasRoutes = new Hono<ApiEnv>()
  .get('/kpis', (c) => handleVendasKpis(c.env.event))
  .patch('/status', (c) => handleVendasStatusPatch(c.env.event));

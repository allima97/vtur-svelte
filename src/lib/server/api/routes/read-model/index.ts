import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleReadModelRebuildPost, handleReadModelRebuildGet } from './rebuild';

// /api/v1/read-model/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const readModelRoutes = new Hono<ApiEnv>()
  .post('/rebuild', (c) => handleReadModelRebuildPost(c.env.event))
  .get('/rebuild', (c) => handleReadModelRebuildGet(c.env.event));

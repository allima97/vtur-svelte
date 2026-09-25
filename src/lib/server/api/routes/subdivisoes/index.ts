import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleSubdivisoesGet, handleSubdivisoesPost, handleSubdivisoesDelete } from './root';

// /api/v1/subdivisoes/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const subdivisoesRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleSubdivisoesGet(c.env.event))
  .post('/', (c) => handleSubdivisoesPost(c.env.event))
  .delete('/', (c) => handleSubdivisoesDelete(c.env.event));

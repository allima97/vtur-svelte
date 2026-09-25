import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handlePaisesGet, handlePaisesPost, handlePaisesDelete } from './root';

// /api/v1/paises/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const paisesRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handlePaisesGet(c.env.event))
  .post('/', (c) => handlePaisesPost(c.env.event))
  .delete('/', (c) => handlePaisesDelete(c.env.event));

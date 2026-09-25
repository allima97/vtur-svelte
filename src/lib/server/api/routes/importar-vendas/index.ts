import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleImportarVendasPost } from './root';

// /api/v1/importar-vendas/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const importarVendasRoutes = new Hono<ApiEnv>()
  .post('/', (c) => handleImportarVendasPost(c.env.event));

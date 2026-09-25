import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleTipoProdutosGet, handleTipoProdutosPost, handleTipoProdutosDelete } from './root';

// /api/v1/tipo-produtos/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const tipoProdutosRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleTipoProdutosGet(c.env.event))
  .post('/', (c) => handleTipoProdutosPost(c.env.event))
  .delete('/', (c) => handleTipoProdutosDelete(c.env.event));

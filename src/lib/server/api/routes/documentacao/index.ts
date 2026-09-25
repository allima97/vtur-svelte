import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleDocumentacaoGet, handleDocumentacaoPost, handleDocumentacaoDelete } from './root';

// /api/v1/documentacao/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const documentacaoRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleDocumentacaoGet(c.env.event))
  .post('/', (c) => handleDocumentacaoPost(c.env.event))
  .delete('/', (c) => handleDocumentacaoDelete(c.env.event));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleCrmLibraryGet } from './library';
import { handleCrmSignaturePost } from './signature';

// /api/v1/crm/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const crmRoutes = new Hono<ApiEnv>()
  .get('/library', (c) => handleCrmLibraryGet(c.env.event))
  .post('/signature', (c) => handleCrmSignaturePost(c.env.event));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleMuralBootstrapGet } from './bootstrap';
import { handleMuralCompanyGet } from './company';
import { handleMuralReadPost } from './read';
import { handleMuralRecadosGet, handleMuralRecadosPost, handleMuralRecadosDelete } from './recados';

// /api/v1/mural/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const muralRoutes = new Hono<ApiEnv>()
  .get('/bootstrap', (c) => handleMuralBootstrapGet(c.env.event))
  .get('/company', (c) => handleMuralCompanyGet(c.env.event))
  .post('/read', (c) => handleMuralReadPost(c.env.event))
  .get('/recados', (c) => handleMuralRecadosGet(c.env.event))
  .post('/recados', (c) => handleMuralRecadosPost(c.env.event))
  .delete('/recados', (c) => handleMuralRecadosDelete(c.env.event));

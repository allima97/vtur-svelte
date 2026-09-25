import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { withRouteParams } from '../../params';
import { handleCidadesGet, handleCidadesPost, handleCidadesDelete } from './root';
import { handleCidadesIdGet, handleCidadesIdPatch, handleCidadesIdDelete } from './id';

// /api/v1/cidades/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const cidadesRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleCidadesGet(c.env.event))
  .post('/', (c) => handleCidadesPost(c.env.event))
  .delete('/', (c) => handleCidadesDelete(c.env.event))
  .get('/:id', (c) => handleCidadesIdGet(withRouteParams(c.env.event, c.req.param())))
  .patch('/:id', (c) => handleCidadesIdPatch(withRouteParams(c.env.event, c.req.param())))
  .delete('/:id', (c) => handleCidadesIdDelete(withRouteParams(c.env.event, c.req.param())));

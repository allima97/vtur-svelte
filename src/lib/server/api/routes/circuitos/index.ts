import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { withRouteParams } from '../../params';
import { handleCircuitosGet, handleCircuitosPost } from './root';
import { handleCircuitosIdGet, handleCircuitosIdPatch, handleCircuitosIdDelete } from './id';

// /api/v1/circuitos/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const circuitosRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleCircuitosGet(c.env.event))
  .post('/', (c) => handleCircuitosPost(c.env.event))
  .get('/:id', (c) => handleCircuitosIdGet(withRouteParams(c.env.event, c.req.param())))
  .patch('/:id', (c) => handleCircuitosIdPatch(withRouteParams(c.env.event, c.req.param())))
  .delete('/:id', (c) => handleCircuitosIdDelete(withRouteParams(c.env.event, c.req.param())));

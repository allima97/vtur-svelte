import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { withRouteParams } from '../../params';
import { handleVouchersGet, handleVouchersPost } from './root';
import { handleVouchersIdGet, handleVouchersIdPatch, handleVouchersIdDelete } from './id';
import { handleVouchersCreatePost } from './create';
import { handleVouchersDeleteDelete } from './delete';

// /api/v1/vouchers/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const vouchersRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleVouchersGet(c.env.event))
  .post('/', (c) => handleVouchersPost(c.env.event))
  .post('/create', (c) => handleVouchersCreatePost(c.env.event))
  .delete('/delete', (c) => handleVouchersDeleteDelete(c.env.event))
  .get('/:id', (c) => handleVouchersIdGet(withRouteParams(c.env.event, c.req.param())))
  .patch('/:id', (c) => handleVouchersIdPatch(withRouteParams(c.env.event, c.req.param())))
  .delete('/:id', (c) => handleVouchersIdDelete(withRouteParams(c.env.event, c.req.param())));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { withRouteParams } from '../../params';
import { handleFornecedoresGet } from './root';
import { handleFornecedoresIdGet, handleFornecedoresIdPut, handleFornecedoresIdDelete } from './id';
import { handleFornecedoresCreatePost } from './create';

// /api/v1/fornecedores/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const fornecedoresRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleFornecedoresGet(c.env.event))
  .post('/create', (c) => handleFornecedoresCreatePost(c.env.event))
  .get('/:id', (c) => handleFornecedoresIdGet(withRouteParams(c.env.event, c.req.param())))
  .put('/:id', (c) => handleFornecedoresIdPut(withRouteParams(c.env.event, c.req.param())))
  .delete('/:id', (c) => handleFornecedoresIdDelete(withRouteParams(c.env.event, c.req.param())));

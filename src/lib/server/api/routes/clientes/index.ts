import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { withRouteParams } from '../../params';
import { handleClientesGet } from './root';
import { handleClientesIdGet, handleClientesIdPatch, handleClientesIdDelete } from './id';
import { handleClientesIdAcompanhantesGet, handleClientesIdAcompanhantesPost } from './id-acompanhantes';
import { handleClientesAvisosHistoryGet } from './avisos-history';
import { handleClientesAvisosSendGet, handleClientesAvisosSendPost } from './avisos-send';
import { handleClientesAvisosTemplatesGet } from './avisos-templates';
import { handleClientesCreatePost } from './create';
import { handleClientesDeleteDelete } from './delete';
import { handleClientesHistoricoGet } from './historico';
import { handleClientesListGet } from './list';
import { handleClientesResolveImportPost } from './resolve-import';
import { handleClientesTemplateDispatchesGet, handleClientesTemplateDispatchesPost } from './template-dispatches';
import { handleClientesTemplatesSendPost } from './templates-send';

// /api/v1/clientes/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const clientesRoutes = new Hono<ApiEnv>()
  .get('/avisos/history', (c) => handleClientesAvisosHistoryGet(c.env.event))
  .get('/avisos/send', (c) => handleClientesAvisosSendGet(c.env.event))
  .post('/avisos/send', (c) => handleClientesAvisosSendPost(c.env.event))
  .get('/avisos/templates', (c) => handleClientesAvisosTemplatesGet(c.env.event))
  .post('/templates/send', (c) => handleClientesTemplatesSendPost(c.env.event))
  .get('/', (c) => handleClientesGet(c.env.event))
  .post('/create', (c) => handleClientesCreatePost(c.env.event))
  .delete('/delete', (c) => handleClientesDeleteDelete(c.env.event))
  .get('/historico', (c) => handleClientesHistoricoGet(c.env.event))
  .get('/list', (c) => handleClientesListGet(c.env.event))
  .post('/resolve-import', (c) => handleClientesResolveImportPost(c.env.event))
  .get('/template-dispatches', (c) => handleClientesTemplateDispatchesGet(c.env.event))
  .post('/template-dispatches', (c) => handleClientesTemplateDispatchesPost(c.env.event))
  .get('/:id/acompanhantes', (c) => handleClientesIdAcompanhantesGet(withRouteParams(c.env.event, c.req.param())))
  .post('/:id/acompanhantes', (c) => handleClientesIdAcompanhantesPost(withRouteParams(c.env.event, c.req.param())))
  .get('/:id', (c) => handleClientesIdGet(withRouteParams(c.env.event, c.req.param())))
  .patch('/:id', (c) => handleClientesIdPatch(withRouteParams(c.env.event, c.req.param())))
  .delete('/:id', (c) => handleClientesIdDelete(withRouteParams(c.env.event, c.req.param())));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleAgendaGet } from './root';
import { handleAgendaCreatePost } from './create';
import { handleAgendaDeleteDelete } from './delete';
import { handleAgendaRangeGet } from './range';
import { handleAgendaUpdatePatch, handleAgendaUpdatePost } from './update';

// /api/v1/agenda/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const agendaRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleAgendaGet(c.env.event))
  .post('/create', (c) => handleAgendaCreatePost(c.env.event))
  .delete('/delete', (c) => handleAgendaDeleteDelete(c.env.event))
  .get('/range', (c) => handleAgendaRangeGet(c.env.event))
  .patch('/update', (c) => handleAgendaUpdatePatch(c.env.event))
  .post('/update', (c) => handleAgendaUpdatePost(c.env.event));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleConsultoriasGet, handleConsultoriasPost, handleConsultoriasPatch } from './root';
import { handleConsultoriasIcsGet } from './ics';

// /api/v1/consultorias/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const consultoriasRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleConsultoriasGet(c.env.event))
  .post('/', (c) => handleConsultoriasPost(c.env.event))
  .patch('/', (c) => handleConsultoriasPatch(c.env.event))
  .get('/ics', (c) => handleConsultoriasIcsGet(c.env.event));

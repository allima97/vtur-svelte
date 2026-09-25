import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleTarefasGet } from './root';
import { handleTarefasClientesGet } from './clientes';
import { handleTarefasUsuariosGet } from './usuarios';

// /api/v1/tarefas/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const tarefasRoutes = new Hono<ApiEnv>()
  .get('/', (c) => handleTarefasGet(c.env.event))
  .get('/clientes', (c) => handleTarefasClientesGet(c.env.event))
  .get('/usuarios', (c) => handleTarefasUsuariosGet(c.env.event));

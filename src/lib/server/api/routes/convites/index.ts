import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleConvitesAcceptPost } from './accept';
import { handleConvitesSendPost } from './send';

// /api/v1/convites/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const convitesRoutes = new Hono<ApiEnv>()
  .post('/accept', (c) => handleConvitesAcceptPost(c.env.event))
  .post('/send', (c) => handleConvitesSendPost(c.env.event));

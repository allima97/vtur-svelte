import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handlePushSubscribePost } from './subscribe';
import { handlePushUnsubscribePost } from './unsubscribe';

// /api/v1/push/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const pushRoutes = new Hono<ApiEnv>()
  .post('/subscribe', (c) => handlePushSubscribePost(c.env.event))
  .post('/unsubscribe', (c) => handlePushUnsubscribePost(c.env.event));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleMenuPrefsGet, handleMenuPrefsPost } from './prefs';

// /api/v1/menu/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const menuRoutes = new Hono<ApiEnv>()
  .get('/prefs', (c) => handleMenuPrefsGet(c.env.event))
  .post('/prefs', (c) => handleMenuPrefsPost(c.env.event));

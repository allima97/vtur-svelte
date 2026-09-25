import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleProfileSignatureGet, handleProfileSignaturePatch } from './signature';

// /api/v1/profile/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const profileRoutes = new Hono<ApiEnv>()
  .get('/signature', (c) => handleProfileSignatureGet(c.env.event))
  .patch('/signature', (c) => handleProfileSignaturePatch(c.env.event));

import { Hono } from 'hono';
import type { ApiEnv } from '../../types';
import { handleUserContextGet } from './context';
import { handleUserProfileGet, handleUserProfilePatch } from './profile';

// /api/v1/user/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.
export const userRoutes = new Hono<ApiEnv>()
  .get('/context', (c) => handleUserContextGet(c.env.event))
  .get('/profile', (c) => handleUserProfileGet(c.env.event))
  .patch('/profile', (c) => handleUserProfilePatch(c.env.event));

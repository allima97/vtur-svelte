import { Hono } from 'hono';
import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import type { ApiEnv } from '../types';

// Migrado de src/routes/api/v1/health/+server.ts (contrato idêntico).
export const healthRoutes = new Hono<ApiEnv>().get('/', () => {
  return json({ ok: true, ts: new Date().toISOString() }, { headers: NO_STORE_HEADERS });
});

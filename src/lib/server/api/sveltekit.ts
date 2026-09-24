import type { RequestEvent } from '@sveltejs/kit';
import { apiApp } from './app';

/**
 * Ponte SvelteKit → Hono. Use em qualquer +server.ts migrado:
 *
 *   import { apiHandler } from '$lib/server/api/sveltekit';
 *   export const GET = apiHandler;
 */
export function apiHandler(event: RequestEvent): Promise<Response> {
  return Promise.resolve(apiApp.fetch(event.request, { event }));
}

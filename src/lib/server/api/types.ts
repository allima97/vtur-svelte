import type { RequestEvent } from '@sveltejs/kit';

/**
 * Ambiente do app Hono dentro do SvelteKit.
 *
 * `event` é o RequestEvent original do SvelteKit: os handlers continuam
 * usando exatamente os mesmos helpers de hoje (requireAuthenticatedUser(event),
 * resolveUserScope, event.platform, event.locals...), o que garante que o
 * contrato de cada rota migrada fica idêntico.
 */
export type ApiEnv = {
  Bindings: {
    event: RequestEvent;
  };
  Variables: {
    requestId: string;
  };
};

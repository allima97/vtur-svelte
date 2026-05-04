import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logServerError, requireAuthenticatedUser } from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "").trim();

    if (!endpoint) {
      return json({ error: "Endpoint invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (endpoint.length > 2048) {
      return json({ error: "Endpoint muito grande." }, { status: 413, headers: NO_STORE_HEADERS });
    }
    try {
      const parsedEndpoint = new URL(endpoint);
      if (parsedEndpoint.protocol !== "https:") {
        return json({ error: "Endpoint invalido." }, { status: 400, headers: NO_STORE_HEADERS });
      }
    } catch {
      return json({ error: "Endpoint invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { error } = await client
      .from("push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() } as any)
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      logServerError("[push/unsubscribe] falha ao desativar subscription", error);
      return json({ error: "Erro ao desativar subscription." }, { status: 500, headers: NO_STORE_HEADERS });
    }

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    logServerError("[push/unsubscribe] falha interna", error);
    return json({ error: "Erro interno ao desativar subscription." }, { status: 500, headers: NO_STORE_HEADERS });
  }
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logServerError, requireAuthenticatedUser } from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;
const MAX_PUSH_SUBSCRIBE_BODY_BYTES = 16 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(request, MAX_PUSH_SUBSCRIBE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const subscription = body?.subscription || body;
    const endpoint = String(subscription?.endpoint || "").trim();
    const keys = subscription?.keys || {};
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return json({ error: "Subscription invalida." }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (
      endpoint.length > MAX_ENDPOINT_LENGTH ||
      String(p256dh).length > MAX_KEY_LENGTH ||
      String(auth).length > MAX_KEY_LENGTH
    ) {
      return json({ error: "Subscription muito grande." }, { status: 413, headers: NO_STORE_HEADERS });
    }
    try {
      const parsedEndpoint = new URL(endpoint);
      if (parsedEndpoint.protocol !== "https:") {
        return json({ error: "Endpoint invalido." }, { status: 400, headers: NO_STORE_HEADERS });
      }
    } catch {
      return json({ error: "Endpoint invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const payload = {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent") || null,
      active: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from("push_subscriptions")
      .upsert(payload as any, { onConflict: "endpoint" });

    if (error) {
      logServerError("[push/subscribe] falha ao salvar subscription", error);
      return json({ error: "Erro ao salvar subscription." }, { status: 500, headers: NO_STORE_HEADERS });
    }

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logServerError("[push/subscribe] falha interna", error);
    return json({ error: "Erro interno ao salvar subscription." }, { status: 500, headers: NO_STORE_HEADERS });
  }
};

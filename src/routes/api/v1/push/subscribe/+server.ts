import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuthenticatedUser } from '$lib/server/v1';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body = await request.json().catch(() => ({}));
    const subscription = body?.subscription || body;
    const endpoint = subscription?.endpoint;
    const keys = subscription?.keys || {};
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return json({ error: "Subscription invalida." }, { status: 400 });
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
      return json({ error: `Erro ao salvar subscription: ${error.message}` }, { status: 500 });
    }

    return json({ ok: true });
  } catch (error: any) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};

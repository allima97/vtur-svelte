import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuthenticatedUser } from '$lib/server/v1';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body = await request.json().catch(() => ({}));
    const endpoint = body?.endpoint;

    if (!endpoint) {
      return json({ error: "Endpoint invalido." }, { status: 400 });
    }

    const { error } = await client
      .from("push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() } as any)
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      return json({ error: `Erro ao desativar subscription: ${error.message}` }, { status: 500 });
    }

    return json({ ok: true });
  } catch (error: any) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};

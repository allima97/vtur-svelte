import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  toErrorResponse
} from '$lib/server/v1';
import { isSystemAdminRole, extractUserTypeName } from '$lib/server/admin';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { checkRateLimit } from '$lib/server/rateLimit';

async function requireSystemAdmin(client: ReturnType<typeof getAdminClient>, userId: string) {
  const { data, error } = await client
    .from('users')
    .select('id, user_types(name)')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return isSystemAdminRole(extractUserTypeName(data));
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);

    if (!(await requireSystemAdmin(client, user.id))) {
      return json({ error: 'Sem acesso.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const { data, error } = await client
      .from('admin_system_settings')
      .select('maintenance_enabled, maintenance_message, updated_at')
      .eq('singleton', true)
      .maybeSingle();
    if (error) throw error;

    return json(
      {
        maintenance_enabled: Boolean(data?.maintenance_enabled),
        maintenance_message: data?.maintenance_message ?? null,
        updated_at: data?.updated_at ?? null,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar manutencao.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);

    if (!(await requireSystemAdmin(client, user.id))) {
      return json({ error: 'Sem acesso.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const rl = checkRateLimit(`admin-maintenance:${user.id}`, { max: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return json(
        { error: 'Muitas requisicoes. Aguarde e tente novamente.' },
        { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const body = await event.request.json().catch(() => ({}));

    const payload = {
      singleton: true,
      maintenance_enabled: Boolean(body?.maintenance_enabled),
      maintenance_message: body?.maintenance_message ?? null,
      updated_by: user.id,
    };

    const { error } = await client
      .from('admin_system_settings')
      .upsert(payload, { onConflict: 'singleton' });
    if (error) throw error;

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar manutencao.');
  }
}

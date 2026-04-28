import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope } from '$lib/server/v1';

function mask(value?: string) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function GET(event) {
  const environment = String(publicEnv.PUBLIC_ENVIRONMENT || '').toLowerCase();
  if (environment === 'production') {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const client = getAdminClient();
  const user = await requireAuthenticatedUser(event);
  const scope = await resolveUserScope(client, user.id);
  if (!scope.isAdmin) {
    return json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const publicUrl = publicEnv.PUBLIC_SUPABASE_URL;
  const publicAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

  return json({
    runtime: 'cloudflare-worker',
    publicSupabaseUrlPresent: Boolean(publicUrl),
    publicSupabaseAnonKeyPresent: Boolean(publicAnonKey),
    serviceRoleKeyPresent: Boolean(serviceKey),
    publicSupabaseUrlMasked: mask(publicUrl),
    publicSupabaseAnonKeyMasked: mask(publicAnonKey),
    publicEnvironment: publicEnv.PUBLIC_ENVIRONMENT ?? null
  });
}
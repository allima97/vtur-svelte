import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

function mask(value?: string) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function GET() {
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
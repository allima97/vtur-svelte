import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/db/supabase';

export const GET: RequestHandler = async ({ locals: { supabase } }) => {
  await supabase.auth.signOut();
  // Also clear browser client cookies
  if (typeof window !== 'undefined') {
    await supabase.auth.signOut();
  }
  throw redirect(302, '/auth/login');
};

export const POST: RequestHandler = async ({ locals: { supabase } }) => {
  await supabase.auth.signOut();
  return json({ success: true });
};

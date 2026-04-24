import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
  if (locals.isSystemAdmin) {
    throw redirect(302, '/dashboard/admin');
  }

  const userType = String(locals.userType || '').toUpperCase();
  if (!userType.includes('GESTOR')) {
    throw redirect(302, '/negado');
  }

  return {};
}

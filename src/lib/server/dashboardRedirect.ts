export function resolveDashboardPathByUserType(
  userTypeRaw?: string | null,
  fallbackPath = '/'
): string {
  // Todos os perfis usam o mesmo dashboard unificado em '/'
  // Os paths /dashboard/vendedor|gestor|master|admin redirecionam para '/'
  const tipo = String(userTypeRaw || '').trim().toUpperCase();

  if (tipo.includes('ADMIN')) return '/dashboard/admin';
  if (tipo.includes('MASTER')) return '/dashboard/master';
  if (tipo.includes('GESTOR')) return '/dashboard/gestor';

  return fallbackPath;
}

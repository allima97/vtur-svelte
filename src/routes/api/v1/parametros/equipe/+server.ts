import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['equipe', 'parametros'], 1, 'Sem acesso a Equipe.');
    }

    // Busca usuários da empresa
    let usersQuery = client
      .from('users')
      .select('id, nome_completo, email, active, uso_individual, company_id, user_types(name)')
      .eq('active', true)
      .order('nome_completo');

    if (scope.companyId && !scope.isAdmin) {
      usersQuery = usersQuery.eq('company_id', scope.companyId);
    }

    const { data: usersData, error: usersError } = await usersQuery.limit(200);
    if (usersError) throw usersError;

    // Busca relações gestor-vendedor
    let relQuery = client.from('gestor_vendedor').select('gestor_id, vendedor_id, ativo');
    if (scope.isGestor) {
      relQuery = relQuery.eq('gestor_id', scope.userId);
    } else if (scope.companyId && !scope.isAdmin) {
      // Filtra por empresa via join
    }

    const { data: relData, error: relError } = await relQuery.limit(500);
    if (relError) throw relError;

    // Busca convites pendentes
    let convitesQuery = client
      .from('user_convites')
      .select('id, invited_email, company_id, user_type_id, invited_by, invited_by_role, status, created_at, expires_at')
      .eq('status', 'pending');

    if (scope.companyId && !scope.isAdmin) {
      convitesQuery = convitesQuery.eq('company_id', scope.companyId);
    }

    const { data: convitesData } = await convitesQuery.order('created_at', { ascending: false }).limit(100);

    // Busca tipos de usuário para o formulário de convite
    const { data: tiposData } = await client
      .from('user_types')
      .select('id, name')
      .order('name')
      .limit(50);

    return json({
      usuarios: usersData || [],
      relacoes: relData || [],
      convites: convitesData || [],
      tipos_usuario: tiposData || []
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar equipe.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['equipe', 'parametros'], 2, 'Sem permissão para gerenciar equipe.');
    }

    const body = await event.request.json();
    const { action, vendedor_id, ativo } = body;

    if (action === 'toggle_relacao') {
      if (!isUuid(vendedor_id)) return json({ error: 'Vendedor inválido.' }, { status: 400 });

      const gestorId = scope.isGestor ? scope.userId : String(body.gestor_id || '').trim();
      if (!isUuid(gestorId)) return json({ error: 'Gestor inválido.' }, { status: 400 });

      // Verifica se já existe
      const { data: existing } = await client
        .from('gestor_vendedor')
        .select('id, ativo')
        .eq('gestor_id', gestorId)
        .eq('vendedor_id', vendedor_id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await client
          .from('gestor_vendedor')
          .update({ ativo: ativo !== false })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await client
          .from('gestor_vendedor')
          .insert({ gestor_id: gestorId, vendedor_id, ativo: ativo !== false });
        if (insertError) throw insertError;
      }

      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao gerenciar equipe.');
  }
}

import { isUuid } from '$lib/server/v1';
import { requirePreferenciasScope, safeJsonParse } from '../_shared';

export async function POST(event) {
  try {
    const { client, user, scope } = await requirePreferenciasScope(event, 3);
    const companyId = scope.companyId;
    if (!companyId) return new Response('Empresa inválida.', { status: 400 });

    const body = safeJsonParse(await event.request.text()) as any;
    const preferenciaId = String(body?.preferencia_id || '').trim();
    const sharedWith = String(body?.shared_with || '').trim();

    if (!isUuid(preferenciaId)) return new Response('preferencia_id invalido.', { status: 400 });
    if (!isUuid(sharedWith)) return new Response('shared_with invalido.', { status: 400 });

    let preferenciaQuery = client
      .from('minhas_preferencias')
      .select('id, company_id, created_by')
      .eq('id', preferenciaId)
      .eq('company_id', companyId);
    if (!scope.isAdmin) preferenciaQuery = preferenciaQuery.eq('created_by', user.id);

    const { data: preferencia, error: prefError } = await preferenciaQuery.maybeSingle();
    if (prefError) throw prefError;
    if (!preferencia) return new Response('Preferência não encontrada.', { status: 404 });

    const { data: targetUser, error: targetError } = await client
      .from('users')
      .select('id, company_id, active')
      .eq('id', sharedWith)
      .eq('company_id', companyId)
      .eq('active', true)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetUser) return new Response('Usuário fora do escopo da empresa.', { status: 403 });

    const payload = {
      company_id: companyId,
      preferencia_id: preferenciaId,
      shared_by: user.id,
      shared_with: sharedWith,
      status: 'pending',
      accepted_at: null,
      revoked_at: null
    };

    const { data, error } = await client
      .from('minhas_preferencias_shares')
      .upsert(payload, { onConflict: 'preferencia_id,shared_with' })
      .select('id, preferencia_id, shared_by, shared_with, status, created_at, accepted_at, revoked_at')
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, share: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro preferencias/share', err);
    return new Response('Erro ao compartilhar preferência.', { status: 500 });
  }
}

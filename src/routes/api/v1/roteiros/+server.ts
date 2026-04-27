import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import type { RequestEvent } from '@sveltejs/kit';

function applyRoteiroScope<T>(
  query: T,
  scope: {
    isAdmin?: boolean;
    isGestor?: boolean;
    isMaster?: boolean;
    userId?: string | null;
    companyId?: string | null;
  }
) {
  if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
    return (query as any).eq('created_by', scope.userId);
  }

  if (scope.companyId && !scope.isAdmin && !scope.isMaster) {
    return (query as any).eq('company_id', scope.companyId);
  }

  return query;
}

function isMissingItinerarioConfigColumn(error: unknown) {
  const code = String((error as any)?.code || '');
  const message = String((error as any)?.message || '');
  return code === '42703' || /itinerario_config/i.test(message);
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['Orcamentos'], 1, 'Sem acesso a Roteiros.');

    const { data, error: queryError } = await applyRoteiroScope(
      client
        .from('roteiro_personalizado')
        .select('id, nome, duracao, inicio_cidade, fim_cidade, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200),
      scope
    );

    if (queryError) throw queryError;

    return json({ roteiros: data || [] });
  } catch (err) {
    console.error('[roteiros GET]', err);
    return toErrorResponse(err, 'Erro ao carregar roteiros.');
  }
}

export async function POST(event: RequestEvent) {
  try {
    const supabase = event.locals.supabase;
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return new Response('Sessao invalida.', { status: 401 });
    }

    const body = await event.request.json();
    const { id, nome, duracao, inicio_cidade, fim_cidade, dias, itinerario_config } = body;

    if (!String(nome || '').trim()) return json({ error: 'Nome obrigatório.' }, { status: 400 });

    // Buscar company_id do usuário
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    const companyId = (userProfile as any)?.company_id || null;

    let roteiroId: string;

    const hasItinerarioConfig = Object.prototype.hasOwnProperty.call(body, 'itinerario_config');

    if (id && isUuid(id)) {
      // Atualizar roteiro existente (RLS garante que só o dono pode atualizar)
      const updatePayload: Record<string, unknown> = {
        nome: String(nome).trim(),
        duracao: Number(duracao || 0) || null,
        inicio_cidade: String(inicio_cidade || '').trim() || null,
        fim_cidade: String(fim_cidade || '').trim() || null,
        updated_at: new Date().toISOString()
      };
      if (hasItinerarioConfig) {
        updatePayload.itinerario_config = itinerario_config || null;
      }

      let { error: updateError } = await supabase
        .from('roteiro_personalizado')
        .update(updatePayload)
        .eq('id', id)
        .eq('created_by', user.id);

      if (updateError && hasItinerarioConfig && isMissingItinerarioConfigColumn(updateError)) {
        delete updatePayload.itinerario_config;
        ({ error: updateError } = await supabase
          .from('roteiro_personalizado')
          .update(updatePayload)
          .eq('id', id)
          .eq('created_by', user.id));
      }

      if (updateError) throw updateError;
      roteiroId = id;
    } else {
      // Inserir novo roteiro
      const insertPayload: Record<string, unknown> = {
        nome: String(nome).trim(),
        duracao: Number(duracao || 0) || null,
        inicio_cidade: String(inicio_cidade || '').trim() || null,
        fim_cidade: String(fim_cidade || '').trim() || null,
        created_by: user.id,
        company_id: companyId
      };
      if (hasItinerarioConfig) {
        insertPayload.itinerario_config = itinerario_config || null;
      }

      let { data: inserted, error: insertError } = await supabase
        .from('roteiro_personalizado')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError && hasItinerarioConfig && isMissingItinerarioConfigColumn(insertError)) {
        delete insertPayload.itinerario_config;
        ({ data: inserted, error: insertError } = await supabase
          .from('roteiro_personalizado')
          .insert(insertPayload)
          .select('id')
          .single());
      }

      if (insertError || !inserted?.id) {
        throw insertError || new Error('Falha ao criar roteiro.');
      }
      roteiroId = inserted.id;
    }

    // Salva dias se fornecidos
    if (Array.isArray(dias) && dias.length > 0) {
      await supabase.from('roteiro_dia').delete().eq('roteiro_id', roteiroId);

      const diasRows = dias.map((dia: any, index: number) => ({
        roteiro_id: roteiroId,
        created_by: user.id,
        company_id: companyId,
        ordem: index + 1,
        cidade: String(dia.cidade || '').trim(),
        data: dia.data || null,
        descricao: String(dia.descricao || '').trim() || null
      }));

      if (diasRows.length > 0) {
        const { error: diasError } = await supabase.from('roteiro_dia').insert(diasRows);
        if (diasError && !String(diasError.code || '').includes('42P01')) throw diasError;
      }
    }

    return json({ ok: true, id: roteiroId });
  } catch (err) {
    console.error('[roteiros POST]', err);
    return toErrorResponse(err, 'Erro ao salvar roteiro.');
  }
}

export async function DELETE(event: RequestEvent) {
  try {
    const supabase = event.locals.supabase;
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return new Response('Sessao invalida.', { status: 401 });
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    // RLS garante que só o dono pode excluir
    const { error: deleteError } = await supabase
      .from('roteiro_personalizado')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    console.error('[roteiros DELETE]', err);
    return toErrorResponse(err, 'Erro ao excluir roteiro.');
  }
}

export async function PATCH(event: RequestEvent) {
  try {
    const supabase = event.locals.supabase;
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return new Response('Sessao invalida.', { status: 401 });
    }

    const body = await event.request.json();
    const { action } = body;

    if (action === 'sugestoes-busca') {
      const termo = String(body.termo || '').trim();
      const tipo = String(body.tipo || '').trim();

      if (!termo && !tipo) return json({ sugestoes: [] });

      let query = supabase.from('roteiro_sugestoes').select('*').order('uso_count', { ascending: false }).limit(50);
      if (termo) query = query.ilike('valor', `%${termo}%`);
      if (tipo) query = query.eq('tipo', tipo);

      const { data, error } = await query;
      if (error) throw error;
      return json({ sugestoes: data || [] });
    }

    if (action === 'sugestoes-salvar') {
      const { tipo, valor } = body;
      if (!tipo || !valor) return json({ error: 'tipo e valor obrigatorios.' }, { status: 400 });

      const normalizedValor = String(valor).trim().toLowerCase();

      // Buscar company_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      const companyId = (userProfile as any)?.company_id || null;

      const { data: existing } = await supabase
        .from('roteiro_sugestoes')
        .select('id, uso_count')
        .eq('tipo', tipo)
        .eq('valor_normalizado', normalizedValor)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('roteiro_sugestoes')
          .update({ uso_count: ((existing as any).uso_count || 0) + 1 })
          .eq('id', (existing as any).id);
        return json({ ok: true, id: (existing as any).id });
      }

      const { data: inserted, error: insertError } = await supabase
        .from('roteiro_sugestoes')
        .insert({ tipo, valor: String(valor).trim(), company_id: companyId, valor_normalizado: normalizedValor })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return json({ ok: true, id: (inserted as any)?.id });
    }

    if (action === 'sugestoes-remover') {
      const { id } = body;
      if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400 });
      await supabase.from('roteiro_sugestoes').delete().eq('id', id);
      return json({ ok: true });
    }

    return json({ error: 'Acao invalida.' }, { status: 400 });
  } catch (err) {
    console.error('[roteiros PATCH]', err);
    return toErrorResponse(err, 'Erro ao processar sugestoes.');
  }
}

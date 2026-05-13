import { json } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import type { RequestEvent } from '@sveltejs/kit';

const ROTEIRO_SUGESTAO_SELECT = 'id, company_id, tipo, valor, uso_count, created_at, updated_at';
const MAX_ROTEIRO_BODY_BYTES = 512 * 1024;

type EqQueryable<T> = {
  eq(column: string, value: string | null | undefined): T;
};

type UserCompanyRow = {
  company_id?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function applyRoteiroScope<T extends EqQueryable<T>>(
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
    return query.eq('created_by', scope.userId);
  }

  if (scope.companyId && !scope.isAdmin && !scope.isMaster) {
    return query.eq('company_id', scope.companyId);
  }

  return query;
}

function isMissingItinerarioConfigColumn(error: unknown) {
  const code = isRecord(error) ? String(error.code || '') : '';
  const message = isRecord(error) ? String(error.message || '') : '';
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

    return json({ roteiros: data || [] }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    logServerError('[roteiros] falha ao carregar roteiros', err);
    return toErrorResponse(err, 'Erro ao carregar roteiros.');
  }
}

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_ROTEIRO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const supabase = event.locals.supabase;
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, unknown>)
        : {};
    const { id, nome, duracao, inicio_cidade, fim_cidade, dias, itinerario_config } = body;
    const roteiroIdFromBody = typeof id === 'string' ? id : null;

    if (!String(nome || '').trim()) {
      return json({ error: 'Nome obrigatório.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    // Buscar company_id do usuário
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    const companyId = (userProfile as UserCompanyRow | null)?.company_id || null;

    let roteiroId: string;

    const hasItinerarioConfig = Object.prototype.hasOwnProperty.call(body, 'itinerario_config');

    if (roteiroIdFromBody && isUuid(roteiroIdFromBody)) {
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
        .eq('id', roteiroIdFromBody)
        .eq('created_by', user.id);

      if (updateError && hasItinerarioConfig && isMissingItinerarioConfigColumn(updateError)) {
        delete updatePayload.itinerario_config;
        ({ error: updateError } = await supabase
          .from('roteiro_personalizado')
          .update(updatePayload)
          .eq('id', roteiroIdFromBody)
          .eq('created_by', user.id));
      }

      if (updateError) throw updateError;
      roteiroId = roteiroIdFromBody;
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

    return json({ ok: true, id: roteiroId }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[roteiros] falha ao salvar roteiro', err);
    return toErrorResponse(err, 'Erro ao salvar roteiro.');
  }
}

export async function DELETE(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const supabase = event.locals.supabase;
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400, headers: NO_STORE_HEADERS });

    // RLS garante que só o dono pode excluir
    const { error: deleteError } = await supabase
      .from('roteiro_personalizado')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (deleteError) throw deleteError;

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[roteiros] falha ao excluir roteiro', err);
    return toErrorResponse(err, 'Erro ao excluir roteiro.');
  }
}

export async function PATCH(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_ROTEIRO_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const supabase = event.locals.supabase;
    const { session, user } = await event.locals.safeGetSession();
    if (!session || !user) {
      return new Response('Sessao invalida.', { status: 401, headers: NO_STORE_HEADERS });
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const { action } = body;

    if (action === 'sugestoes-busca') {
      const termo = sanitizePostgrestSearchTerm(body.termo, 80);
      const tipo = String(body.tipo || '').trim().slice(0, 60);

      if (!termo && !tipo) return json({ sugestoes: [] }, { headers: NO_STORE_HEADERS });

      let query = supabase
        .from('roteiro_sugestoes')
        .select(ROTEIRO_SUGESTAO_SELECT)
        .order('uso_count', { ascending: false })
        .limit(50);
      if (termo.length >= 2) query = query.ilike('valor', `%${termo}%`);
      if (tipo) query = query.eq('tipo', tipo);

      const { data, error } = await query;
      if (error) throw error;
      return json({ sugestoes: data || [] }, { headers: NO_STORE_HEADERS });
    }

    if (action === 'sugestoes-salvar') {
      const { tipo, valor } = body;
      if (!tipo || !valor) {
        return json({ error: 'tipo e valor obrigatorios.' }, { status: 400, headers: NO_STORE_HEADERS });
      }

      const safeTipo = String(tipo).trim().slice(0, 60);
      const safeValor = String(valor).trim().slice(0, 160);
      if (!safeTipo || !safeValor) {
        return json({ error: 'tipo e valor obrigatorios.' }, { status: 400, headers: NO_STORE_HEADERS });
      }

      const normalizedValor = safeValor.toLowerCase();

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
        .eq('tipo', safeTipo)
        .eq('valor_normalizado', normalizedValor)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('roteiro_sugestoes')
          .update({ uso_count: ((existing as any).uso_count || 0) + 1 })
          .eq('id', (existing as any).id);
        return json({ ok: true, id: (existing as any).id }, { headers: NO_STORE_HEADERS });
      }

      const { data: inserted, error: insertError } = await supabase
        .from('roteiro_sugestoes')
        .insert({ tipo: safeTipo, valor: safeValor, company_id: companyId, valor_normalizado: normalizedValor })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return json({ ok: true, id: (inserted as any)?.id }, { headers: NO_STORE_HEADERS });
    }

    if (action === 'sugestoes-remover') {
      const { id } = body;
      if (!isUuid(id)) return json({ error: 'ID invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
      await supabase.from('roteiro_sugestoes').delete().eq('id', id);
      return json({ ok: true }, { headers: NO_STORE_HEADERS });
    }

    return json({ error: 'Acao invalida.' }, { status: 400, headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[roteiros] falha ao processar sugestoes', err);
    return toErrorResponse(err, 'Erro ao processar sugestoes.');
  }
}

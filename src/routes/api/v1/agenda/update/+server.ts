import { json } from '@sveltejs/kit';
import { ensureAgendaAccess } from '$lib/server/agenda';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

function normalizeUpdate(body: any) {
  const payload: Record<string, unknown> = {};

  if (body?.titulo !== undefined || body?.title !== undefined) {
    payload.titulo = String(body?.titulo ?? body?.title ?? '').trim();
  }

  if (body?.descricao !== undefined) {
    payload.descricao = String(body?.descricao || '').trim() || null;
  }

  if (body?.all_day !== undefined || body?.allDay !== undefined) {
    payload.all_day = body?.all_day !== undefined ? Boolean(body.all_day) : Boolean(body.allDay);
  }

  const start = String(body?.start || '').trim();
  if (start) {
    payload.start_date = start.split('T')[0];
    payload.start_at = start.includes('T') ? start : null;
  }

  const end = String(body?.end || '').trim();
  if (end) {
    payload.end_date = end.split('T')[0];
    payload.end_at = end.includes('T') ? end : null;
  }

  if (body?.start_date !== undefined || body?.data_inicio !== undefined) {
    payload.start_date = String(body?.start_date || body?.data_inicio || '').trim();
  }

  if (body?.end_date !== undefined || body?.data_fim !== undefined) {
    payload.end_date = String(body?.end_date || body?.data_fim || '').trim();
  }

  if (body?.start_at !== undefined) {
    payload.start_at = String(body?.start_at || '').trim() || null;
  }

  if (body?.end_at !== undefined) {
    payload.end_at = String(body?.end_at || '').trim() || null;
  }

  return payload;
}

async function handleUpdate(event: any) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureAgendaAccess(scope, 3, 'Sem permissao para editar agenda.');

    const id = String(event.url.searchParams.get('id') || '').trim();
    const body = await event.request.json();
    const targetId = id || String(body?.id || '').trim();

    if (!targetId) {
      return json({ error: 'id obrigatorio.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await client
      .from('agenda_itens')
      .select('id, user_id, tipo')
      .eq('id', targetId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing || existing.tipo !== 'evento') {
      return json({ error: 'Evento nao encontrado.' }, { status: 404 });
    }

    if (!scope.isAdmin && String(existing.user_id || '') !== user.id) {
      return json({ error: 'Sem acesso a este evento.' }, { status: 403 });
    }

    const payload = normalizeUpdate(body);
    if (Object.keys(payload).length === 0) {
      return json({ error: 'payload vazio.' }, { status: 400 });
    }

    const { data, error } = await client
      .from('agenda_itens')
      .update(payload)
      .eq('id', targetId)
      .select('id, titulo, descricao, start_date, end_date, start_at, end_at, all_day')
      .single();

    if (error) throw error;

    return json({ ok: true, item: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar agenda.');
  }
}

export async function PATCH(event) {
  return handleUpdate(event);
}

export async function POST(event) {
  return handleUpdate(event);
}

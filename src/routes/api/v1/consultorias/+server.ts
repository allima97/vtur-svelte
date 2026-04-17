import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuthenticatedUser } from '$lib/server/v1';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const { data, error } = await client
      .from("consultorias_online")
      .select(
        `
          id,
          cliente_id,
          cliente_nome,
          data_hora,
          lembrete,
          destino,
          quantidade_pessoas,
          orcamento_id,
          taxa_consultoria,
          notas,
          fechada,
          fechada_em,
          created_at
        `
      )
      .order("data_hora", { ascending: true })
      .limit(200);

    if (error) {
      return json({ error: `Falha ao listar consultorias: ${error.message}` }, { status: 500 });
    }

    return json(data || []);
  } catch (error: any) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body = await request.json().catch(() => ({}));
    const clienteNome = String(body.clienteNome || "").trim();
    const dataHora = body.dataHora;

    if (!clienteNome) {
      return json({ error: "Cliente é obrigatório." }, { status: 400 });
    }
    if (!dataHora) {
      return json({ error: "Data e hora são obrigatórias." }, { status: 400 });
    }

    const registro = {
      cliente_id: body.clienteId || null,
      cliente_nome: clienteNome,
      data_hora: new Date(dataHora).toISOString(),
      lembrete: body.lembrete || "15min",
      destino: body.destino?.trim() || null,
      quantidade_pessoas: body.quantidadePessoas ?? 1,
      orcamento_id: body.orcamentoId || null,
      taxa_consultoria: Number.isFinite(body.taxaConsultoria ?? NaN)
        ? body.taxaConsultoria
        : 0,
      notas: body.notas?.trim() || null,
      created_by: user.id,
    };

    const { data, error } = await client
      .from("consultorias_online")
      .insert(registro as any)
      .select(
        `
          id,
          cliente_nome,
          data_hora,
          lembrete,
          destino,
          quantidade_pessoas,
          orcamento_id,
          taxa_consultoria,
          notas,
          created_at
        `
      )
      .single();

    if (error) {
      return json({ error: `Falha ao salvar consultoria: ${error.message}` }, { status: 500 });
    }

    return json(data, { status: 201 });
  } catch (error: any) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  try {
    await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    const body = await request.json().catch(() => ({}));
    const id = body.id;

    if (!id) {
      return json({ error: "Id da consultoria é obrigatório." }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (body.clienteId !== undefined) payload.cliente_id = body.clienteId || null;
    if (body.clienteNome !== undefined) payload.cliente_nome = body.clienteNome?.trim() || null;
    if (body.dataHora !== undefined && body.dataHora) {
      payload.data_hora = new Date(body.dataHora).toISOString();
    }
    if (body.lembrete !== undefined && body.lembrete !== null) payload.lembrete = body.lembrete;
    if (body.destino !== undefined) payload.destino = body.destino?.trim() || null;
    if (body.quantidadePessoas !== undefined) payload.quantidade_pessoas = body.quantidadePessoas;
    if (body.orcamentoId !== undefined) payload.orcamento_id = body.orcamentoId || null;
    if (body.taxaConsultoria !== undefined) payload.taxa_consultoria = body.taxaConsultoria;
    if (body.notas !== undefined) payload.notas = body.notas;
    if (body.fechada !== undefined) payload.fechada = body.fechada;
    if (body.fechada_em !== undefined) payload.fechada_em = body.fechada_em;

    if (!Object.keys(payload).length) {
      return json({ error: "Nenhum campo para atualizar." }, { status: 400 });
    }

    const { error } = await client
      .from("consultorias_online")
      .update(payload)
      .eq("id", id);

    if (error) {
      return json({ error: `Falha ao atualizar consultoria: ${error.message}` }, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};

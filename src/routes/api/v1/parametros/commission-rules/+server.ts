import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

type TierPayload = {
  faixa: 'PRE' | 'POS';
  de_pct: number;
  ate_pct: number;
  inc_pct_meta: number;
  inc_pct_comissao: number;
};

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeTipo(value: unknown): 'GERAL' | 'ESCALONAVEL' {
  return String(value || '').trim().toUpperCase() === 'ESCALONAVEL' ? 'ESCALONAVEL' : 'GERAL';
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeTiers(value: unknown): TierPayload[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((tier: any) => {
      const faixa = String(tier?.faixa || '').trim().toUpperCase();
      if (faixa !== 'PRE' && faixa !== 'POS') return null;

      return {
        faixa,
        de_pct: normalizeNumber(tier?.de_pct, 0),
        ate_pct: normalizeNumber(tier?.ate_pct, 0),
        inc_pct_meta: normalizeNumber(tier?.inc_pct_meta, 0),
        inc_pct_comissao: normalizeNumber(tier?.inc_pct_comissao, 0)
      } as TierPayload;
    })
    .filter((tier): tier is TierPayload => Boolean(tier));
}

function isMissingColumnError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').trim();
  const message = String((error as { message?: string })?.message || '').toLowerCase();

  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

async function requireAccess(event: RequestEvent, minLevel: number) {
  const client = getAdminClient();
  const user = await requireAuthenticatedUser(event);
  const scope = await resolveUserScope(client, user.id);

  if (!scope.isAdmin) {
    ensureModuloAccess(
      scope,
      ['parametros_regras_comissao', 'regras_comissao', 'parametros'],
      minLevel,
      'Sem acesso às regras de comissão.'
    );
  }

  return {
    client,
    user,
    scope,
    scopedCompanyId: scope.companyId || scope.companyIds[0] || null
  };
}

function canAccessRuleCompany(companyId: string | null | undefined, allowedCompanyIds: string[]) {
  if (!companyId) return true;
  if (allowedCompanyIds.length === 0) return true;
  return allowedCompanyIds.includes(companyId);
}

export async function GET(event: RequestEvent) {
  try {
    const access = await requireAccess(event, 1);
    const client = access.client;

    let data: any[] | null = null;
    let error: unknown = null;

    const primary = await client
      .from('commission_rule')
      .select('*, company_id, created_by, commission_tier(*)')
      .order('nome', { ascending: true });

    data = primary.data as any[] | null;
    error = primary.error;

    if (error && isMissingColumnError(error)) {
      const fallback = await client
        .from('commission_rule')
        .select('*, commission_tier(*)')
        .order('nome', { ascending: true });

      data = fallback.data as any[] | null;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    let items = Array.isArray(data) ? data : [];

    if (!access.scope.isAdmin && access.scope.companyIds.length > 0) {
      items = items.filter((rule) =>
        canAccessRuleCompany(
          String(rule?.company_id || '').trim() || null,
          access.scope.companyIds
        )
      );
    }

    return json(items);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar regras de comissão.');
  }
}

export async function POST(event: RequestEvent) {
  try {
    const access = await requireAccess(event, 3);
    const client = access.client;

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as any;
    const nome = String(body?.nome || '').trim();

    if (!nome) {
      return new Response('Nome é obrigatório.', { status: 400 });
    }

    const payload = {
      nome,
      descricao: String(body?.descricao || '').trim() || null,
      tipo: normalizeTipo(body?.tipo),
      meta_nao_atingida: normalizeNumber(body?.meta_nao_atingida, 0),
      meta_atingida: normalizeNumber(body?.meta_atingida, 0),
      super_meta: normalizeNumber(body?.super_meta, 0),
      ativo: body?.ativo === undefined ? true : Boolean(body?.ativo)
    };

    const payloadWithScope = {
      ...payload,
      company_id: access.scope.isAdmin ? null : access.scopedCompanyId,
      created_by: access.user.id
    };

    const ruleId = String(body?.id || '').trim();
    let persistedId = ruleId || null;

    if (persistedId) {
      let query = client.from('commission_rule').update(payloadWithScope).eq('id', persistedId);

      if (!access.scope.isAdmin && access.scopedCompanyId) {
        query = query.eq('company_id', access.scopedCompanyId);
      }

      let { error } = await query;

      if (error && isMissingColumnError(error)) {
        const fallback = await client.from('commission_rule').update(payload).eq('id', persistedId);
        error = fallback.error;
      }

      if (error) {
        throw error;
      }
    } else {
      let insertResult = await client
        .from('commission_rule')
        .insert(payloadWithScope)
        .select('id')
        .single();

      if (insertResult.error && isMissingColumnError(insertResult.error)) {
        insertResult = await client.from('commission_rule').insert(payload).select('id').single();
      }

      if (insertResult.error) {
        throw insertResult.error;
      }

      persistedId = String(insertResult.data?.id || '').trim() || null;
    }

    if (!persistedId) {
      return new Response('Não foi possível identificar a regra salva.', { status: 500 });
    }

    const tiers = payload.tipo === 'ESCALONAVEL' ? sanitizeTiers(body?.tiers) : [];

    const { error: deleteError } = await client
      .from('commission_tier')
      .delete()
      .eq('rule_id', persistedId);

    if (deleteError) {
      throw deleteError;
    }

    if (tiers.length > 0) {
      const { error: tierError } = await client.from('commission_tier').insert(
        tiers.map((tier) => ({
          rule_id: persistedId,
          faixa: tier.faixa,
          de_pct: tier.de_pct,
          ate_pct: tier.ate_pct,
          inc_pct_meta: tier.inc_pct_meta,
          inc_pct_comissao: tier.inc_pct_comissao,
          ativo: true
        }))
      );

      if (tierError) {
        throw tierError;
      }
    }

    return json({ ok: true, id: persistedId });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar regra de comissão.');
  }
}

export async function PATCH(event: RequestEvent) {
  try {
    const access = await requireAccess(event, 3);
    const client = access.client;

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as any;
    const id = String(body?.id || '').trim();

    if (!id) {
      return new Response('ID obrigatório.', { status: 400 });
    }

    const payload: Record<string, unknown> = {};

    if ('ativo' in (body || {})) {
      payload.ativo = Boolean(body?.ativo);
    }

    if (Object.keys(payload).length === 0) {
      return new Response('Nenhuma alteração enviada.', { status: 400 });
    }

    let query = client.from('commission_rule').update(payload).eq('id', id);

    if (!access.scope.isAdmin && access.scopedCompanyId) {
      query = query.eq('company_id', access.scopedCompanyId);
    }

    let { error } = await query;

    if (error && isMissingColumnError(error)) {
      const fallback = await client.from('commission_rule').update(payload).eq('id', id);
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    return json({ ok: true, id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar regra de comissão.');
  }
}

export async function DELETE(event: RequestEvent) {
  try {
    const access = await requireAccess(event, 3);
    const client = access.client;

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody) as any;
    const id = String(body?.id || '').trim();

    if (!id) {
      return new Response('ID obrigatório.', { status: 400 });
    }

    const { error: tierError } = await client.from('commission_tier').delete().eq('rule_id', id);

    if (tierError) {
      throw tierError;
    }

    let query = client.from('commission_rule').delete().eq('id', id);

    if (!access.scope.isAdmin && access.scopedCompanyId) {
      query = query.eq('company_id', access.scopedCompanyId);
    }

    let { error } = await query;

    if (error && isMissingColumnError(error)) {
      const fallback = await client.from('commission_rule').delete().eq('id', id);
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    return json({ ok: true, id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir regra de comissão.');
  }
}

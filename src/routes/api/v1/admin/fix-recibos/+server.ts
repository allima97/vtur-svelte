import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { findEquipeVturVendedor } from '$lib/conciliacao/baixaRac';
import {
  getAdminClient,
  isRankingEligibleUser,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  sanitizePostgrestSearchTerm,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateSalesReadModels } from '$lib/server/readModelCache';

const MAX_DOC_VARIANTS = 200;

function adminJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', NO_STORE_HEADERS['Cache-Control']);
  return json(body, { ...init, headers });
}

function requireAdmin(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (!scope.isAdmin) {
    return adminJson({ error: 'Somente ADMIN pode usar a correção de recibos.' }, { status: 403 });
  }
  return null;
}

function normalizeDocumentVariants(input: string) {
  const values = String(input || '')
    .split(/[,\n;\t]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const variants = new Set<string>();

  for (const value of values) {
    variants.add(value);

    const digits = value.replace(/\D/g, '');
    if (!digits) continue;

    variants.add(digits);

    const core10 = digits.length >= 10 ? digits.slice(-10) : digits.padStart(10, '0');
    variants.add(`5630-${core10}`);
    variants.add(`5630${core10}`);

    const core6 = digits.length >= 6 ? digits.slice(-6) : digits.padStart(6, '0');
    variants.add(`5630-0000${core6}`);
  }

  return Array.from(variants).slice(0, MAX_DOC_VARIANTS);
}

async function searchUsers(event: RequestEvent, scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  const client = getAdminClient();
  const term = sanitizePostgrestSearchTerm(event.url.searchParams.get('busca_usuario'), 60);
  if (!term || term.length < 2) {
    return adminJson({ usuarios: [] });
  }

  const searchExpression = `nome_completo.ilike.%${term}%,email.ilike.%${term}%`;
  let query = client
    .from('users')
    .select('id, nome_completo, email, company_id, active, uso_individual, participa_ranking, user_types(name)')
    .or(searchExpression)
    .limit(15);

  const companyId = String(event.url.searchParams.get('empresa_id') || '').trim();
  if (isUuid(companyId)) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) throw error;

  return adminJson({
    usuarios: (data || [])
      .filter((row) => scope.isAdmin || scope.companyIds.includes(String(row.company_id || '')))
      .filter(isRankingEligibleUser)
      .map((row) => ({
        id: row.id,
        nome_completo: row.nome_completo || row.email || row.id,
        email: row.email || null,
        company_id: row.company_id || null
      }))
  });
}

async function searchDocuments(event: RequestEvent) {
  const client = getAdminClient();
  const docs = String(event.url.searchParams.get('docs') || '').trim();
  const docVariants = normalizeDocumentVariants(docs);
  if (docVariants.length === 0) {
    return adminJson({
      docs_pesquisados: [],
      conciliacao_rows: [],
      resumo: { linhas_encontradas: 0 }
    });
  }

  let query = client
    .from('conciliacao_recibos')
    .select(
      'id, documento, status, descricao, movimento_data, valor_lancamentos, valor_venda_real, venda_id, venda_recibo_id, ranking_vendedor_id, company_id'
    )
    .in('documento', docVariants)
    .order('movimento_data', { ascending: true });

  const companyId = String(event.url.searchParams.get('empresa_id') || '').trim();
  if (isUuid(companyId)) query = query.eq('company_id', companyId);

  const { data: rows, error } = await query;
  if (error) throw error;

  const vendedorIds = Array.from(
    new Set((rows || []).map((row) => String(row.ranking_vendedor_id || '').trim()).filter(isUuid))
  );
  const vendedorNomes = new Map<string, string>();
  if (vendedorIds.length > 0) {
    const { data: usersRows, error: usersError } = await client
      .from('users')
      .select('id, nome_completo, email')
      .in('id', vendedorIds);
    if (usersError) throw usersError;
    (usersRows || []).forEach((row) => {
      vendedorNomes.set(String(row.id), String(row.nome_completo || row.email || row.id));
    });
  }

  const conciliacaoRows = (rows || []).map((row) => ({
    ...row,
    ranking_vendedor_nome:
      vendedorNomes.get(String(row.ranking_vendedor_id || '')) ||
      row.ranking_vendedor_id ||
      '(sem vendedor)'
  }));

  return adminJson({
    docs_pesquisados: docVariants,
    conciliacao_rows: conciliacaoRows,
    resumo: { linhas_encontradas: conciliacaoRows.length }
  });
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const denied = requireAdmin(scope);
    if (denied) return denied;

    if (event.url.searchParams.has('busca_usuario')) {
      return await searchUsers(event, scope);
    }

    return await searchDocuments(event);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao buscar dados da correção de recibos.');
  }
}

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const denied = requireAdmin(scope);
    if (denied) return denied;

    const body = await event.request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    const id = String(body.id || '').trim();
    if (!isUuid(id)) return adminJson({ error: 'Registro inválido.' }, { status: 400 });

    const { data: registro, error: registroError } = await client
      .from('conciliacao_recibos')
      .select('id, company_id')
      .eq('id', id)
      .maybeSingle();
    if (registroError) throw registroError;
    if (!registro) return adminJson({ error: 'Registro não encontrado.' }, { status: 404 });

    const companyId = String(registro.company_id || '').trim();
    if (!isUuid(companyId)) {
      return adminJson({ error: 'Registro sem empresa válida.' }, { status: 422 });
    }

    if (action === 'fix_vendor') {
      const vendedorId = String(body.vendedor_id || '').trim();
      if (!isUuid(vendedorId)) return adminJson({ error: 'Vendedor inválido.' }, { status: 400 });

      const equipeVturVendedor = await findEquipeVturVendedor(client, companyId);
      if (equipeVturVendedor?.id && vendedorId === equipeVturVendedor.id) {
        return adminJson(
          { error: 'Não é permitido atribuir "Equipe vtur" como vendedor de um recibo.' },
          { status: 422 }
        );
      }

      const { data: vendedor, error: vendedorError } = await client
        .from('users')
        .select('id, nome_completo, email, company_id, active, uso_individual, participa_ranking, user_types(name)')
        .eq('id', vendedorId)
        .maybeSingle();
      if (vendedorError) throw vendedorError;
      if (!vendedor || vendedor.company_id !== companyId || !isRankingEligibleUser(vendedor)) {
        return adminJson(
          { error: 'Vendedor fora da empresa do recibo ou inelegível para ranking.' },
          { status: 422 }
        );
      }

      const { data, error } = await client
        .from('conciliacao_recibos')
        .update({ ranking_vendedor_id: vendedorId })
        .eq('id', id)
        .select('id, documento, ranking_vendedor_id');
      if (error) throw error;

      invalidateSalesReadModels({ companyIds: [companyId], userId: user.id });
      return adminJson({ ok: true, updated: data });
    }

    if (action === 'fix_valor') {
      const updates: Record<string, number> = {};
      if (body.valor_lancamentos != null && body.valor_lancamentos !== '') {
        const value = Number(body.valor_lancamentos);
        if (!Number.isFinite(value)) return adminJson({ error: 'valor_lancamentos inválido.' }, { status: 400 });
        updates.valor_lancamentos = value;
      }
      if (body.valor_venda_real != null && body.valor_venda_real !== '') {
        const value = Number(body.valor_venda_real);
        if (!Number.isFinite(value)) return adminJson({ error: 'valor_venda_real inválido.' }, { status: 400 });
        updates.valor_venda_real = value;
      }
      if (Object.keys(updates).length === 0) {
        return adminJson({ error: 'Nenhum valor informado para atualizar.' }, { status: 400 });
      }

      const { data, error } = await client
        .from('conciliacao_recibos')
        .update(updates)
        .eq('id', id)
        .select('id, documento, valor_lancamentos, valor_venda_real');
      if (error) throw error;

      invalidateSalesReadModels({ companyIds: [companyId], userId: user.id });
      return adminJson({ ok: true, updated: data });
    }

    return adminJson({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao aplicar correção de recibos.');
  }
}

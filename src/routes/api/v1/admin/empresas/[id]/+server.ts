import { json } from '@sveltejs/kit';
import {
  ensureCanManageCompanies,
  getAccessibleCompanyIds,
  loadManagedCompanies
} from '$lib/server/admin';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const companyId = String(event.params.id || '').trim();

    ensureCanManageCompanies(scope);

    if (!scope.isAdmin && !getAccessibleCompanyIds(scope).includes(companyId)) {
      return new Response('Empresa fora do escopo permitido.', { status: 403 });
    }

    const { data: companyRow, error: companyError } = await client
      .from('companies')
      .select('id, nome_empresa, nome_fantasia, cnpj, telefone, endereco, cidade, estado, active')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError || !companyRow) {
      return new Response('Empresa nao encontrada.', { status: 404 });
    }

    let billing = null;
    let plans: any[] = [];
    try {
      const [billingRes, plansRes] = await Promise.all([
        client
          .from('company_billing')
          .select('id, status, plan_id, valor_mensal, ultimo_pagamento, proximo_vencimento')
          .eq('company_id', companyId)
          .maybeSingle(),
        client.from('plans').select('id, nome, ativo').order('nome', { ascending: true })
      ]);
      if (!billingRes.error) billing = billingRes.data || null;
      if (!plansRes.error) plans = plansRes.data || [];
    } catch {
      billing = null;
      plans = [];
    }

    const [linksRes, mastersRes] = await Promise.all([
      client
        .from('master_empresas')
        .select('id, master_id, company_id, status, created_at, approved_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      client
        .from('users')
        .select('id, nome_completo, email, user_types(name)')
        .order('nome_completo', { ascending: true })
    ]);

    if (linksRes.error) throw linksRes.error;
    if (mastersRes.error) throw mastersRes.error;

    const masterRows = (mastersRes.data || []).filter((row: any) =>
      String(Array.isArray(row.user_types) ? row.user_types[0]?.name || '' : row.user_types?.name || '')
        .toUpperCase()
        .includes('MASTER')
    );

    const mastersMap = new Map(
      masterRows.map((row: any) => [
        String(row.id),
        {
          id: row.id,
          nome_completo: row.nome_completo || row.email || 'Usuario sem nome',
          email: row.email || null
        }
      ])
    );

    return json({
      empresa: companyRow,
      billing,
      plans,
      master_links: (linksRes.data || []).map((row: any) => ({
        ...row,
        master: mastersMap.get(String(row.master_id)) || null
      })),
      masters_disponiveis: Array.from(mastersMap.values())
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar detalhe da empresa.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const companyId = String(event.params.id || '').trim();

    ensureCanManageCompanies(scope);

    if (!scope.isAdmin && !getAccessibleCompanyIds(scope).includes(companyId)) {
      return json({ error: 'Empresa fora do escopo permitido.' }, { status: 403 });
    }

    const body = await event.request.json();

    // Apenas campos que existem na tabela companies
    const ALLOWED = [
      'nome_empresa', 'nome_fantasia', 'cnpj', 'telefone',
      'endereco', 'cidade', 'estado', 'active'
    ] as const;

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const typedBody = body as Record<string, unknown>;
    for (const field of ALLOWED) {
      if (typedBody[field] !== undefined) updatePayload[field] = typedBody[field];
    }

    if (Object.keys(updatePayload).length === 1) {
      return json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const { data, error } = await client
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId)
      .select('id, nome_empresa, nome_fantasia, cnpj, telefone, endereco, cidade, estado, active')
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: 'Empresa não encontrada.' }, { status: 404 });

    return json({ ok: true, empresa: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar empresa.');
  }
}

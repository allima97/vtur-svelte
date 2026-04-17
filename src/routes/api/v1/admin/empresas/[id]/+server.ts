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

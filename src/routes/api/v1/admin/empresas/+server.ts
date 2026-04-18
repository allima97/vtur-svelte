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

async function loadCompaniesWithBilling(client: ReturnType<typeof getAdminClient>, companyIds: string[] | null) {
  const queryWithBilling = client
    .from('companies')
    .select(
      `
        id,
        nome,
        cnpj,
        telefone,
        endereco,
        cidade,
        estado,
        ativo,
        billing:company_billing (
          id,
          status,
          valor_mensal,
          ultimo_pagamento,
          proximo_vencimento,
          plan:plans (id, name)
        )
      `
    )
    .order('nome', { ascending: true });

  const scopedQuery =
    companyIds && companyIds.length > 0 ? queryWithBilling.in('id', companyIds) : queryWithBilling;

  const withBilling = await scopedQuery;
  if (!withBilling.error) return withBilling.data || [];

  const message = String(withBilling.error.message || '').toLowerCase();
  if (!message.includes('company_billing') && !message.includes('plans')) {
    throw withBilling.error;
  }

  const fallback = await client
    .from('companies')
    .select('id, nome, cnpj, telefone, endereco, cidade, estado, ativo')
    .order('nome', { ascending: true });

  if (fallback.error) throw fallback.error;
  const rows = fallback.data || [];
  if (!companyIds || !companyIds.length) return rows;
  return rows.filter((row: any) => companyIds.includes(String(row.id)));
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureCanManageCompanies(scope);

    const accessibleCompanyIds = scope.isAdmin ? null : getAccessibleCompanyIds(scope);
    const rows = await loadCompaniesWithBilling(client, accessibleCompanyIds);

    const companyIds = rows.map((row: any) => row.id);
    let masterLinkCounts = new Map<string, number>();

    try {
      const masterLinksRes =
        companyIds.length > 0
          ? await client.from('master_empresas').select('company_id').in('company_id', companyIds)
          : { data: [], error: null };
      if (masterLinksRes.error) throw masterLinksRes.error;

      (masterLinksRes.data || []).forEach((row: any) => {
        const companyId = String(row.company_id || '').trim();
        if (!companyId) return;
        masterLinkCounts.set(companyId, Number(masterLinkCounts.get(companyId) || 0) + 1);
      });
    } catch {
      masterLinkCounts = new Map<string, number>();
    }

    return json({
      items: rows.map((row: any) => ({
        id: row.id,
        nome: row.nome || '',
        cnpj: row.cnpj || '',
        cidade: row.cidade || '',
        estado: row.estado || '',
        telefone: row.telefone || '',
        endereco: row.endereco || '',
        ativo: row.ativo !== false,
        billing: Array.isArray(row.billing) ? row.billing[0] || null : row.billing || null,
        master_links: Number(masterLinkCounts.get(String(row.id)) || 0)
      }))
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar empresas.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    ensureCanManageCompanies(scope);

    const id = String(body.id || '').trim();
    const payload = {
      nome: String(body.nome || '').trim() || null,
      cnpj: String(body.cnpj || '').trim() || null,
      telefone: String(body.telefone || '').trim() || null,
      endereco: String(body.endereco || '').trim() || null,
      cidade: String(body.cidade || '').trim() || null,
      estado: String(body.estado || '').trim() || null,
      ativo: body.ativo !== false
    };

    if (!payload.nome) {
      return new Response('Informe o nome da empresa.', { status: 400 });
    }

    let companyId = id;
    if (companyId) {
      if (!scope.isAdmin && !getAccessibleCompanyIds(scope).includes(companyId)) {
        return new Response('Empresa fora do escopo permitido.', { status: 403 });
      }
      const { error: updateError } = await client.from('companies').update(payload).eq('id', companyId);
      if (updateError) throw updateError;
    } else {
      if (!scope.isAdmin) {
        return new Response('Somente ADMIN pode criar empresas.', { status: 403 });
      }
      const { data, error: insertError } = await client
        .from('companies')
        .insert(payload)
        .select('id')
        .single();
      if (insertError) throw insertError;
      companyId = data.id;
    }

    if ('billing_status' in body || 'billing_plan_id' in body || 'billing_valor_mensal' in body) {
      try {
        const billingPayload = {
          company_id: companyId,
          status: String(body.billing_status || 'active').trim() || 'active',
          plan_id: String(body.billing_plan_id || '').trim() || null,
          valor_mensal:
            body.billing_valor_mensal === '' || body.billing_valor_mensal == null
              ? null
              : Number(body.billing_valor_mensal),
          ultimo_pagamento: String(body.billing_ultimo_pagamento || '').trim() || null,
          proximo_vencimento: String(body.billing_proximo_vencimento || '').trim() || null
        };

        const existingBilling = await client
          .from('company_billing')
          .select('id')
          .eq('company_id', companyId)
          .maybeSingle();

        if (existingBilling.error) throw existingBilling.error;

        if (existingBilling.data?.id) {
          const { error: billingUpdateError } = await client
            .from('company_billing')
            .update(billingPayload)
            .eq('id', existingBilling.data.id);
          if (billingUpdateError) throw billingUpdateError;
        } else {
          const { error: billingInsertError } = await client.from('company_billing').insert(billingPayload);
          if (billingInsertError) throw billingInsertError;
        }
      } catch {
        // Billing is optional in environments where the table is not present.
      }
    }

    return json({ id: companyId, saved: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar empresa.');
  }
}

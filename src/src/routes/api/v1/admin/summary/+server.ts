import { json } from '@sveltejs/kit';
import {
  canManageCompanies,
  canManageUsers,
  loadAvisoTemplates,
  loadEmailSettings,
  loadManagedCompanies,
  loadManagedUserTypes,
  listManagedUsers
} from '$lib/server/admin';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { chunkArray, SUPABASE_IN_BATCH_SIZE } from '$lib/utils/array';

const TEXT_NO_STORE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  ...NO_STORE_HEADERS
};

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!canManageUsers(scope) && !canManageCompanies(scope)) {
      return new Response('Sem acesso ao resumo administrativo.', { status: 403, headers: TEXT_NO_STORE_HEADERS });
    }

    const loadPlanos = async () => {
      if (!scope.isAdmin) return [];
      try {
        const { data, error } = await client.from('plans').select('id, ativo');
        if (error) throw error;
        return data || [];
      } catch {
        return [];
      }
    };

    const [usuarios, empresas, tipos, templates, emailSettings, planos] = await Promise.all([
      listManagedUsers(client, scope),
      loadManagedCompanies(client, scope).catch(() => []),
      loadManagedUserTypes(client, scope).catch(() => []),
      loadAvisoTemplates(client).catch(() => []),
      loadEmailSettings(client).catch(() => null),
      loadPlanos()
    ]);

    let pendingMasterLinks = 0;
    try {
      if (!scope.isAdmin) {
        const companyIds = (scope.companyIds || []).filter(Boolean);
        if (scope.companyId) companyIds.push(scope.companyId);
        const uniqueIds = Array.from(new Set(companyIds));
        if (!uniqueIds.length) {
          pendingMasterLinks = 0;
        } else {
          for (const batch of chunkArray(uniqueIds)) {
            const { count } = await client
              .from('master_empresas')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
              .in('company_id', batch);
            pendingMasterLinks += Number(count || 0);
          }
        }
      } else {
        const { count } = await client
          .from('master_empresas')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingMasterLinks = Number(count || 0);
      }
    } catch {
      pendingMasterLinks = 0;
    }

    const usuariosRows = usuarios as any[];
    const empresasRows = empresas as any[];
    const planosRows = planos as any[];

    const usuariosAtivos = usuariosRows.filter((item: any) => item.active !== false).length;
    const usuariosInativos = usuariosRows.length - usuariosAtivos;
    const empresasAtivas = empresasRows.filter((item: any) => item.active !== false).length;
    const empresasInativas = empresasRows.length - empresasAtivas;
    const planosAtivos = planosRows.filter((item: any) => item.ativo !== false).length;
    const planosInativos = planosRows.length - planosAtivos;
    const templatesAtivos = templates.filter((item: any) => item.ativo !== false).length;
    const emailConfigured = Boolean(
      emailSettings?.resend_api_key ||
        (emailSettings?.smtp_host && emailSettings?.smtp_user && emailSettings?.smtp_pass)
    );

    const companyIds = empresasRows.map((empresa: any) => String(empresa.id || '').trim()).filter(Boolean);
    let billingRows: any[] = [];
    if (companyIds.length > 0) {
      try {
        if (scope.isAdmin) {
          const { data, error } = await client
            .from('company_billing')
            .select('company_id, status, valor_mensal, proximo_vencimento');
          if (error) throw error;
          billingRows = data || [];
        } else {
          const rows: any[] = [];
          for (const batch of chunkArray(companyIds)) {
            const { data, error } = await client
              .from('company_billing')
              .select('company_id, status, valor_mensal, proximo_vencimento')
              .in('company_id', batch);
            if (error) throw error;
            rows.push(...(data || []));
          }
          billingRows = rows;
        }
      } catch {
        billingRows = [];
      }
    }

    const billingStatusByCompany = new Map<string, string>();
    billingRows.forEach((row) => {
      const companyId = String(row.company_id || '').trim();
      if (!companyId) return;
      billingStatusByCompany.set(companyId, String(row.status || 'trial').trim().toLowerCase() || 'trial');
    });

    const billingCounts = {
      active: 0,
      trial: 0,
      past_due: 0,
      suspended: 0,
      canceled: 0
    };

    companyIds.forEach((companyId: string) => {
      const status = billingStatusByCompany.get(companyId) || 'trial';
      if (status in billingCounts) {
        billingCounts[status as keyof typeof billingCounts] += 1;
      }
    });

    return json(
      {
        counts: {
          usuarios_total: usuariosRows.length,
          usuarios_ativos: usuariosAtivos,
          usuarios_inativos: usuariosInativos,
          empresas_total: empresasRows.length,
          empresas_ativas: empresasAtivas,
          empresas_inativas: empresasInativas,
          tipos_total: tipos.length,
          planos_total: planosRows.length,
          planos_ativos: planosAtivos,
          planos_inativos: planosInativos,
          cobrancas_ativas: billingCounts.active,
          cobrancas_trial: billingCounts.trial,
          cobrancas_atrasadas: billingCounts.past_due,
          cobrancas_suspensas: billingCounts.suspended,
          cobrancas_canceladas: billingCounts.canceled,
          avisos_ativos: templatesAtivos,
          vinculos_master_pendentes: pendingMasterLinks
        },
        indicators: {
          email_configurado: emailConfigured,
          escopo: scope.papel,
          scope_company_ids: scope.companyIds
        }
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar resumo administrativo.');
  }
}

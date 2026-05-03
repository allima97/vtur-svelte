import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { parseISODateParts, todayISODateLocal } from '$lib/date';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1);
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));

    let query = client
      .from('users')
      .select('id, nome_completo, email, data_nascimento, company_id, user_types(name), companies:companies!company_id(nome_fantasia)')
      .eq('active', true)
      .not('data_nascimento', 'is', null)
      .limit(500);

    if (companyIds.length > 0) query = query.in('company_id', companyIds);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    const hoje = parseISODateParts(todayISODateLocal());
    const items = (data || [])
      .filter((u: any) => {
        if (!u.data_nascimento) return false;
        const d = parseISODateParts(u.data_nascimento);
        return d?.month === month;
      })
      .map((u: any) => ({
        id: u.id,
        nome_completo: u.nome_completo,
        email: u.email,
        data_nascimento: u.data_nascimento,
        role: (u.user_types as any)?.name || '',
        company_id: u.company_id,
        company_nome: (u.companies as any)?.nome_fantasia || null,
        aniversario_hoje: (() => {
          const d = parseISODateParts(u.data_nascimento);
          return Boolean(d && hoje && d.month === hoje.month && d.day === hoje.day);
        })()
      }))
      .sort((a: any, b: any) => {
        const da = parseISODateParts(a.data_nascimento)?.day || 0;
        const db = parseISODateParts(b.data_nascimento)?.day || 0;
        return da - db;
      });

    return json({ items, month });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar aniversariantes de colaboradores.');
  }
}

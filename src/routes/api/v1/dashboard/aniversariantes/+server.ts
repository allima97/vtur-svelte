import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

/** Extrai mês (1–12) e dia (1–31) de uma string "YYYY-MM-DD" sem criar Date,
 *  evitando qualquer problema de timezone/DST. */
function extractMonthDay(nascimento: string | null): { month: number; day: number } | null {
  if (!nascimento) return null;
  const m = String(nascimento).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { month: Number(m[2]), day: Number(m[3]) };
}

function isBirthdayInRange(nascimento: string | null, diasAfrente = 30): boolean {
  const parts = extractMonthDay(nascimento);
  if (!parts) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (let i = 0; i <= diasAfrente; i++) {
    const check = new Date(hoje);
    check.setDate(hoje.getDate() + i);
    if (parts.month === check.getMonth() + 1 && parts.day === check.getDate()) {
      return true;
    }
  }
  return false;
}

function isToday(nascimento: string | null): boolean {
  const parts = extractMonthDay(nascimento);
  if (!parts) return false;
  const hoje = new Date();
  return parts.month === hoje.getMonth() + 1 && parts.day === hoje.getDate();
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const diasAfrente = Math.min(90, Math.max(1, Number(searchParams.get('dias') || 30)));
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));

    // Busca clientes com aniversário
    let clientesQuery = client
      .from('clientes')
      .select('id, nome, nascimento, telefone, whatsapp, email')
      .not('nascimento', 'is', null)
      .limit(2000);

    if (companyIds.length > 0) clientesQuery = clientesQuery.in('company_id', companyIds);

    const { data: clientes } = await clientesQuery;

    const aniversariantes = (clientes || [])
      .filter((c: any) => isBirthdayInRange(c.nascimento, diasAfrente))
      .map((c: any) => ({
        id: c.id,
        nome: c.nome,
        nascimento: c.nascimento,
        telefone: c.telefone,
        whatsapp: c.whatsapp,
        email: c.email,
        aniversario_hoje: isToday(c.nascimento),
        pessoa_tipo: 'cliente' as const
      }))
      .sort((a: any, b: any) => {
        const hoje = new Date();
        // Normaliza para meia-noite para que aniversários de hoje não sejam
        // enviados para o próximo ano pela comparação com horário atual
        hoje.setHours(0, 0, 0, 0);
        const getNextBirthday = (nascimento: string) => {
          const d = new Date(nascimento + 'T00:00:00');
          const next = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
          if (next < hoje) next.setFullYear(hoje.getFullYear() + 1);
          return next.getTime();
        };
        return getNextBirthday(a.nascimento) - getNextBirthday(b.nascimento);
      });

    return json({
      items: aniversariantes,
      hoje: aniversariantes.filter((a: any) => a.aniversario_hoje).length,
      proximos: aniversariantes.length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar aniversariantes.');
  }
}

import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { addDaysISODate, parseISODateParts, todayISODateLocal } from '$lib/date';

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

  const hojeIso = todayISODateLocal();

  for (let i = 0; i <= diasAfrente; i++) {
    const check = parseISODateParts(addDaysISODate(hojeIso, i));
    if (check && parts.month === check.month && parts.day === check.day) {
      return true;
    }
  }
  return false;
}

function isToday(nascimento: string | null): boolean {
  const parts = extractMonthDay(nascimento);
  if (!parts) return false;
  const hoje = parseISODateParts(todayISODateLocal());
  return Boolean(hoje && parts.month === hoje.month && parts.day === hoje.day);
}

function clampIntParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const { searchParams } = event.url;
    const diasAfrente = Math.min(90, Math.max(1, Number(searchParams.get('dias') || 30)));
    const hasExplicitLimit = searchParams.has('limit');
    const outputLimit = clampIntParam(searchParams.get('limit'), 500, 1, 500);
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get('company_id'));

    // Busca clientes com aniversário
    let clientesQuery = client
      .from('clientes')
      .select('id, nome, nascimento, telefone, whatsapp, email')
      .not('nascimento', 'is', null)
      .limit(2000);

    if (companyIds.length > 0) clientesQuery = clientesQuery.in('company_id', companyIds);

    const { data: clientes } = await clientesQuery;

    const aniversariantesFiltrados = (clientes || [])
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
        const hoje = parseISODateParts(todayISODateLocal());
        if (!hoje) return 0;
        const hojeMs = Date.UTC(hoje.year, hoje.month - 1, hoje.day);
        const getNextBirthday = (nascimento: string) => {
          const birth = parseISODateParts(nascimento);
          if (!birth) return Number.POSITIVE_INFINITY;
          let nextMs = Date.UTC(hoje.year, birth.month - 1, birth.day);
          if (nextMs < hojeMs) nextMs = Date.UTC(hoje.year + 1, birth.month - 1, birth.day);
          return nextMs;
        };
        return getNextBirthday(a.nascimento) - getNextBirthday(b.nascimento);
      });
    const aniversariantes = hasExplicitLimit
      ? aniversariantesFiltrados.slice(0, outputLimit)
      : aniversariantesFiltrados;

    return json({
      items: aniversariantes,
      hoje: aniversariantesFiltrados.filter((a: any) => a.aniversario_hoje).length,
      proximos: aniversariantesFiltrados.length
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar aniversariantes.');
  }
}

import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rebuildReadModelForCompanyMonth } from '$lib/server/readModelRebuild';

/**
 * POST /api/v1/read-model/rebuild
 *
 * Reconstrói o read model de ranking/KPIs para empresas e meses específicos.
 * Chamado:
 *   1. Após salvar/editar venda (fire-and-forget assíncrono)
 *   2. Pelo Cloudflare Cron Trigger a cada 5 minutos (via GET /api/v1/read-model/rebuild)
 *   3. Manualmente por admins
 *
 * Body: { company_ids?: string[], month_keys?: string[] }
 *       Se omitidos, processa todos os dirty da(s) empresa(s) do scope.
 *
 * GET (usado pelo cron — não requer auth, valida via secret header)
 */

const CRON_SECRET_HEADER = 'x-cron-secret';

type RebuildRequestBody = {
  company_ids?: unknown;
  month_keys?: unknown;
};

type CronEnv = {
  CRON_SECRET?: string | null;
};

type PlatformWithEnv = {
  env?: CronEnv | null;
};

type GlobalWithEnv = typeof globalThis & {
  __env__?: CronEnv | null;
};

function getCronEnv(event: RequestEvent): CronEnv {
  return (event.platform as PlatformWithEnv | undefined)?.env ?? (globalThis as GlobalWithEnv).__env__ ?? {};
}

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isFinanceiro) {
      return json({ error: 'Sem permissão.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    let body: RebuildRequestBody = {};
    try {
      const parsedBody = await event.request.json();
      body = parsedBody && typeof parsedBody === 'object' ? (parsedBody as RebuildRequestBody) : {};
    } catch {
      body = {};
    }

    const requestedCompanyIds: string[] = Array.isArray(body.company_ids)
      ? body.company_ids.filter(isUuid)
      : scope.isAdmin
        ? []
        : scope.companyIds.filter(isUuid);

    const monthKeys: string[] = Array.isArray(body.month_keys)
      ? body.month_keys.filter((k: unknown) => typeof k === 'string' && /^\d{4}-\d{2}$/.test(k))
      : [];

    const result = await rebuildReadModelForCompanyMonth(client, {
      companyIds: requestedCompanyIds,
      monthKeys,
      rebuildAll: requestedCompanyIds.length === 0 && scope.isAdmin,
    });

    return json({ ok: true, ...result }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao reconstruir read model.');
  }
}

/**
 * GET — usado pelo Cloudflare Cron Trigger.
 * Valida via header secret configurado em wrangler.toml (CRON_SECRET).
 * Processa todos os status dirty encontrados no banco.
 */
export async function GET(event: RequestEvent) {
  try {
    // Validar secret do cron para evitar execuções não autorizadas
    const privateEnv = getCronEnv(event);
    const cronSecret = String(privateEnv.CRON_SECRET || '').trim();
    const providedSecret = String(event.request.headers.get(CRON_SECRET_HEADER) || '').trim();

    if (cronSecret && providedSecret !== cronSecret) {
      return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const client = getAdminClient();
    const result = await rebuildReadModelForCompanyMonth(client, {
      companyIds: [],
      monthKeys: [],
      rebuildAll: true,
    });

    return json({ ok: true, cron: true, ...result }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logServerError('[read-model/rebuild] cron rebuild falhou', err);
    return toErrorResponse(err, 'Erro no cron rebuild.');
  }
}

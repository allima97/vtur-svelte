import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logServerError } from '$lib/server/v1';
import { env } from '$env/dynamic/private';

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const MAX_CRON_BODY_BYTES = 4 * 1024;

function secretMatches(expected: string, received: string | null) {
  const actual = String(received || "");
  if (!expected || actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return diff === 0;
}

export const POST: RequestHandler = async ({ request }) => {
  const CRON_SECRET = env.CRON_SECRET_CONSULTORIA || env.CRON_SECRET;
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || !secretMatches(CRON_SECRET, secret)) {
    return json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_CRON_BODY_BYTES) {
    return json({ error: "Payload muito grande." }, { status: 413, headers: NO_STORE_HEADERS });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = !!body.dryRun;

    if (dryRun) {
      return json({ status: "ok", dryRun: true, pendentes: 0 }, { headers: NO_STORE_HEADERS });
    }

    return json(
      { status: "ok", message: "Cron lembretes-consultoria placeholder - implementar quando necessario" },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    logServerError("[cron/lembretes-consultoria] falha na execução", error);
    return json({ error: "Erro interno ao executar rotina." }, { status: 500, headers: NO_STORE_HEADERS });
  }
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited } from '$lib/server/requestGuards';
import { env } from '$env/dynamic/private';

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

function disabledCronResponse(dryRun: boolean) {
  return json(
    {
      status: "disabled",
      implemented: false,
      dryRun,
      action: "none",
      alertsSent: 0,
      message:
        "Cron alerta-comissao esta desativado: endpoint reservado, sem execucao operacional."
    },
    { headers: NO_STORE_HEADERS }
  );
}

export const POST: RequestHandler = async ({ request }) => {
  const CRON_SECRET = env.CRON_SECRET_COMISSAO || env.CRON_SECRET;
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || !secretMatches(CRON_SECRET, secret)) {
    return json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const bodyResult = await readJsonBodyLimited(request, MAX_CRON_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;

  const body =
    bodyResult.data && typeof bodyResult.data === 'object'
      ? (bodyResult.data as Record<string, unknown>)
      : {};
  return disabledCronResponse(Boolean(body.dryRun));
};

export const GET: RequestHandler = async ({ request }) => {
  return POST({ request } as any);
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminClient } from '$lib/server/v1';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  const CRON_SECRET = env.CRON_SECRET_COMISSAO || env.CRON_SECRET;
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient();
    const body = await request.json().catch(() => ({}));
    const dryRun = !!body.dryRun;

    if (dryRun) {
      return json({ status: "ok", dryRun: true, message: "Cron alerta-comissao placeholder" });
    }

    return json({ status: "ok", message: "Cron alerta-comissao placeholder - implementar quando necessario" });
  } catch (error: any) {
    console.error("[cron/alerta-comissao] falha na execução", error);
    return json({ error: "Erro interno ao executar rotina." }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ request }) => {
  return POST({ request } as any);
};

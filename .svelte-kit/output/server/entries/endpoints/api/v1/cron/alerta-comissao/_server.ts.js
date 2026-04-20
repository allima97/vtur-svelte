import { json } from "@sveltejs/kit";
import { g as getAdminClient } from "../../../../../../chunks/v1.js";
import { p as private_env } from "../../../../../../chunks/shared-server.js";
const POST = async ({ request }) => {
  const CRON_SECRET = private_env.CRON_SECRET_COMISSAO || private_env.CRON_SECRET;
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
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
const GET = async ({ request }) => {
  return POST({ request });
};
export {
  GET,
  POST
};

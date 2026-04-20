import { json } from "@sveltejs/kit";
import { g as getAdminClient } from "../../../../../../chunks/v1.js";
import { p as private_env } from "../../../../../../chunks/shared-server.js";
const POST = async ({ request }) => {
  const CRON_SECRET = private_env.CRON_SECRET_CONSULTORIA || private_env.CRON_SECRET;
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const adminClient = getAdminClient();
    const body = await request.json().catch(() => ({}));
    const dryRun = !!body.dryRun;
    if (dryRun) {
      return json({ status: "ok", dryRun: true, pendentes: 0 });
    }
    return json({ status: "ok", message: "Cron lembretes-consultoria placeholder - implementar quando necessario" });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  POST
};

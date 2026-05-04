import { isUuid, logServerError } from "$lib/server/v1";
import {
  assertCompanyAccess,
  noStoreJsonResponse,
  noStoreTextResponse,
  requireMuralScope,
} from "../_shared";
import { invalidateMuralReadModels } from "$lib/server/readModelCache";

export async function POST(event) {
  try {
    const { client, user, scope } = await requireMuralScope(event);
    const body = await event.request.json();
    const id = String(body?.id || "").trim();
    if (!isUuid(id)) return noStoreTextResponse("ID inválido.", 400);

    const { data: recado, error: recadoError } = await client
      .from("mural_recados")
      .select("id, company_id, receiver_id")
      .eq("id", id)
      .maybeSingle();
    if (recadoError) throw recadoError;
    if (!recado) return noStoreTextResponse("Recado não encontrado.", 404);

    const denied = await assertCompanyAccess(
      client,
      scope,
      String(recado.company_id || "").trim(),
    );
    if (denied) return denied;

    if (recado.receiver_id && recado.receiver_id !== user.id) {
      return noStoreTextResponse("Sem permissão para marcar este recado.", 403);
    }

    const { error } = await client.from("mural_recados_leituras").upsert(
      {
        company_id: recado.company_id,
        recado_id: id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "recado_id,user_id" },
    );
    if (error) throw error;

    invalidateMuralReadModels({
      companyIds: [String(recado.company_id || "")],
      userId: user.id,
    });
    return noStoreJsonResponse({ ok: true });
  } catch (e: any) {
    logServerError("[mural/read] falha ao marcar recado como lido", e);
    return noStoreTextResponse("Erro ao marcar recado como lido.", 500);
  }
}

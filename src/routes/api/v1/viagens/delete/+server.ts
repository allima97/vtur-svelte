import { json, type RequestEvent } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import { invalidateTripReadModels } from "$lib/server/readModelCache";
import { rejectCrossOriginRequest, rejectLargePayload } from "$lib/server/requestGuards";

const MAX_VIAGEM_DELETE_BODY_BYTES = 64 * 1024;

function vendedorOwnsViagem(userId: string, viagem: any) {
  const responsavelId = String(viagem?.responsavel_user_id || "").trim();
  const vendedorId = String(viagem?.venda?.vendedor_id || "").trim();
  return responsavelId === userId || vendedorId === userId;
}

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_VIAGEM_DELETE_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["operacao_viagens", "viagens", "operacao"],
        4,
        "Sem acesso a Viagens.",
      );
    }

    const body = await event.request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const vendaId = String(body?.venda_id || "").trim();

    if (!id && !vendaId) {
      return json({ error: "Parametros invalidos." }, { status: 400 });
    }

    // Valida formato dos IDs
    if (id && !isUuid(id))
      return json({ error: "ID de viagem inválido." }, { status: 400 });
    if (vendaId && !isUuid(vendaId))
      return json({ error: "ID de venda inválido." }, { status: 400 });

    const companyIds = resolveScopedCompanyIds(
      scope,
      body?.company_id || body?.empresa_id,
    );

    // ✅ Guard: admin sem company_id explícito não pode deletar sem escopo
    if (companyIds.length === 0) {
      return json(
        { error: "Informe company_id para excluir viagem." },
        { status: 400 },
      );
    }

    let affectedQuery = client
      .from("viagens")
      .select(
        "id, company_id, responsavel_user_id, venda_id, venda:vendas!venda_id(id, vendedor_id)",
      )
      .in("company_id", companyIds);
    const { data: affectedRows } = vendaId
      ? await affectedQuery.eq("venda_id", vendaId)
      : await affectedQuery.eq("id", id);

    const scopedAffectedRows = scope.isVendedor
      ? (affectedRows || []).filter((row: any) =>
          vendedorOwnsViagem(user.id, row),
        )
      : affectedRows || [];

    if ((affectedRows || []).length > 0 && scopedAffectedRows.length === 0) {
      return json({ error: "Sem acesso a esta viagem." }, { status: 403 });
    }

    let query = client.from("viagens").delete().in("company_id", companyIds);
    if (scope.isVendedor) {
      const allowedIds = scopedAffectedRows
        .map((row: any) => String(row?.id || "").trim())
        .filter(Boolean);
      if (allowedIds.length === 0) {
        return json({ error: "Viagem nao encontrada." }, { status: 404 });
      }
      query = query.in("id", allowedIds);
    }

    const result = vendaId
      ? await query.eq("venda_id", vendaId)
      : await query.eq("id", id);

    if (result.error) throw result.error;

    invalidateTripReadModels({
      companyIds: Array.from(
        new Set(
          scopedAffectedRows
            .map((row: any) => String(row?.company_id || ""))
            .filter(Boolean),
        ),
      ),
      vendedorIds: Array.from(
        new Set(
          scopedAffectedRows
            .map((row: any) => String(row?.responsavel_user_id || ""))
            .filter(Boolean),
        ),
      ),
      userId: user.id,
    });

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir viagem.");
  }
}

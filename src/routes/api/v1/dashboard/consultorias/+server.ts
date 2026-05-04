import { json, type RequestEvent } from "@sveltejs/kit";
import {
  getAdminClient,
  logServerError,
  requireAuthenticatedUser,
  resolveAccessibleClientIds,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
} from "$lib/server/v1";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

const MAX_FILTER_IDS = 300;
const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30",
  Vary: "Cookie",
};
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Vary: "Cookie",
};
const NO_STORE_TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  Vary: "Cookie",
};

function clampIntParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function isRpcMissing(error: any, fnName: string) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  const needle = String(fnName || "").toLowerCase();
  return (
    code === "42883" ||
    (needle &&
      message.includes(needle) &&
      (message.includes("does not exist") ||
        message.includes("could not find")))
  );
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const canConsultoria =
      scope.isAdmin ||
      scope.isMaster ||
      scope.isGestor ||
      ["consultoria_online", "consultoria", "dashboard"].some((modulo) =>
        Object.entries(scope.permissoes).some(([key, nivel]) => {
          const normalized = String(key || "")
            .trim()
            .toLowerCase();
          return (
            normalized === modulo &&
            ["view", "create", "edit", "delete", "admin"].includes(
              String(nivel),
            )
          );
        }),
      );

    if (!canConsultoria) {
      // Retorna lista vazia em vez de 403 — o dashboard apenas não mostrará o widget
      return json({ items: [] }, { headers: NO_STORE_HEADERS });
    }

    const mode = String(event.url.searchParams.get("mode") || "geral")
      .trim()
      .toLowerCase();
    const noCache =
      String(event.url.searchParams.get("no_cache") || "").trim() === "1";
    const limit = clampIntParam(event.url.searchParams.get("limit"), 50, 1, 50);

    if (mode !== "geral" && mode !== "gestor") {
      return new Response("mode invalido (use mode=geral ou mode=gestor).", {
        status: 400,
        headers: NO_STORE_TEXT_HEADERS,
      });
    }

    const companyIds =
      mode === "gestor"
        ? resolveScopedCompanyIds(
            scope,
            event.url.searchParams.get("company_id"),
          )
        : [];
    let vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_ids"),
    );

    if (scope.isMaster && mode !== "gestor") {
      vendedorIds = [scope.userId];
    }

    const companyId = companyIds[0] || null;
    const agoraIso = new Date().toISOString();
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);
    const limiteIso = limite.toISOString();

    const cacheKey = buildReadModelCacheKey("dashboard:consultorias", {
      mode,
      userId: user.id,
      papel: scope.papel,
      companyId,
      vendedorIds,
      limit,
      inicio: agoraIso.slice(0, 10),
      fim: limiteIso.slice(0, 10),
    });
    const loadPayload = async () => {
      try {
        const { data: rpcData, error: rpcErr } = await client.rpc(
          "rpc_dashboard_consultorias",
          {
            p_company_id: companyId,
            p_vendedor_ids: vendedorIds.length > 0 ? vendedorIds : null,
            p_inicio: agoraIso,
            p_fim: limiteIso,
          },
        );
        if (rpcErr) throw rpcErr;
        return { items: (rpcData || []).slice(0, limit) };
      } catch (rpcError: any) {
        if (!isRpcMissing(rpcError, "rpc_dashboard_consultorias"))
          throw rpcError;
      }

      const clientIds = companyId
        ? await resolveAccessibleClientIds(client, {
            companyIds: [companyId],
            vendedorIds: [],
          })
        : [];

      if (companyId && vendedorIds.length === 0 && clientIds.length === 0) {
        return { items: [] };
      }

      let consultoriasQuery = client
        .from("consultorias_online")
        .select("id, cliente_nome, data_hora, lembrete, destino, orcamento_id")
        .eq("fechada", false)
        .gte("data_hora", agoraIso)
        .lte("data_hora", limiteIso)
        .order("data_hora", { ascending: true })
        .limit(limit);

      if (companyId && clientIds.length > 0 && vendedorIds.length > 0) {
        const clienteSlice = clientIds.slice(0, MAX_FILTER_IDS).join(",");
        const vendedorSlice = vendedorIds.slice(0, MAX_FILTER_IDS).join(",");
        consultoriasQuery = consultoriasQuery.or(
          `created_by.in.(${vendedorSlice}),cliente_id.in.(${clienteSlice})`,
        );
      } else if (clientIds.length > 0) {
        consultoriasQuery = consultoriasQuery.in(
          "cliente_id",
          clientIds.slice(0, MAX_FILTER_IDS),
        );
      } else if (vendedorIds.length > 0) {
        consultoriasQuery = consultoriasQuery.in(
          "created_by",
          vendedorIds.slice(0, MAX_FILTER_IDS),
        );
      }

      const { data, error } = await consultoriasQuery;
      if (error) throw error;
      return { items: data || [] };
    };
    const payload = noCache
      ? await loadPayload()
      : await getCachedReadModel({
          key: cacheKey,
          tags: [
            READ_MODEL_TAGS.consultorias,
            READ_MODEL_TAGS.dashboard,
            READ_MODEL_TAGS.clients,
            READ_MODEL_TAGS.users,
            ...scopeCacheTags({
              companyIds: companyId ? [companyId] : companyIds,
              vendedorIds,
              userId: user.id,
            }),
          ],
          ttlMs: 30_000,
          staleTtlMs: 120_000,
          loader: loadPayload,
        });

    return json(payload, {
      headers: noCache ? NO_STORE_HEADERS : PRIVATE_CACHE_HEADERS,
    });
  } catch (error: any) {
    logServerError(
      "[dashboard/consultorias] falha ao carregar consultorias",
      error,
    );
    return json(
      { error: "Erro interno ao carregar consultorias." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

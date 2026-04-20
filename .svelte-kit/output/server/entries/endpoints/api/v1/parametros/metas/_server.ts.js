import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse, h as fetchGestorEquipeIdsComGestor } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["metas", "parametros"], 1, "Sem acesso a Metas.");
    }
    const { searchParams } = event.url;
    const vendedorId = String(searchParams.get("vendedor_id") || "").trim();
    const periodo = String(searchParams.get("periodo") || "").trim();
    let vendedorIds = [];
    if (scope.isAdmin) {
      if (vendedorId) vendedorIds = [vendedorId];
    } else if (scope.isGestor) {
      const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
      vendedorIds = vendedorId && equipeIds.includes(vendedorId) ? [vendedorId] : equipeIds;
    } else {
      vendedorIds = [scope.userId];
    }
    let query = client.from("metas_vendedor").select("id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, vendedor:users!vendedor_id(nome_completo)").order("periodo", { ascending: false });
    if (vendedorIds.length > 0) query = query.in("vendedor_id", vendedorIds);
    if (periodo) {
      const periodoDate = periodo.length === 7 ? `${periodo}-01` : periodo;
      query = query.eq("periodo", periodoDate);
    }
    const { data, error: queryError } = await query.limit(500);
    if (queryError) {
      if (String(queryError.code || "").includes("42P01") || String(queryError.message || "").includes("does not exist")) {
        return json({ items: [], vendedores: [] });
      }
      throw queryError;
    }
    let vendedores = [];
    if (scope.isAdmin || scope.isGestor) {
      const ids = scope.isGestor ? await fetchGestorEquipeIdsComGestor(client, scope.userId) : [];
      let vQuery = client.from("users").select("id, nome_completo, uso_individual").eq("active", true);
      if (ids.length > 0 && !scope.isAdmin) vQuery = vQuery.in("id", ids);
      if (scope.companyId && !scope.isAdmin) vQuery = vQuery.eq("company_id", scope.companyId);
      const { data: vData } = await vQuery.order("nome_completo").limit(200);
      vendedores = (vData || []).filter((v) => v.uso_individual !== false);
    }
    return json({ items: data || [], vendedores });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar metas.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["metas", "parametros"], 2, "Sem permissão para salvar metas.");
    }
    const body = await event.request.json();
    const { id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo, scope: metaScope } = body;
    const targetVendedorId = String(vendedor_id || scope.userId).trim();
    if (!isUuid(targetVendedorId)) return json({ error: "Vendedor inválido." }, { status: 400 });
    if (!scope.isAdmin) {
      if (scope.isGestor) {
        const equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
        if (!equipeIds.includes(targetVendedorId)) {
          return json({ error: "Vendedor não pertence à sua equipe." }, { status: 403 });
        }
      } else if (targetVendedorId !== scope.userId) {
        return json({ error: "Sem permissão." }, { status: 403 });
      }
    }
    const periodoDate = String(periodo || "").trim();
    if (!periodoDate) return json({ error: "Período inválido." }, { status: 400 });
    const periodoFull = periodoDate.length === 7 ? `${periodoDate}-01` : periodoDate;
    const payload = {
      vendedor_id: targetVendedorId,
      periodo: periodoFull,
      meta_geral: Number(meta_geral || 0),
      meta_diferenciada: Number(meta_diferenciada || 0),
      ativo: ativo !== false,
      scope: "vendedor"
    };
    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from("metas_vendedor").update(payload).eq("id", id).select("id").single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from("metas_vendedor").insert(payload).select("id").single();
      if (insertError) throw insertError;
      result = data;
    }
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar meta.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["metas", "parametros"], 3, "Sem permissão para excluir metas.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { error: deleteError } = await client.from("metas_vendedor").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir meta.");
  }
}
export {
  DELETE,
  GET,
  POST
};

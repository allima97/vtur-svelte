import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, t as toErrorResponse, e as ensureModuloAccess } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 1, "Sem acesso a Roteiros.");
    }
    const { data, error: queryError } = await client.from("roteiro_personalizado").select("id, nome, duracao, inicio_cidade, fim_cidade, created_at, updated_at").eq("created_by", scope.userId).order("updated_at", { ascending: false }).limit(200);
    if (queryError) throw queryError;
    return json({ roteiros: data || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar roteiros.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 2, "Sem permissão para salvar roteiros.");
    }
    const body = await event.request.json();
    const { id, nome, duracao, inicio_cidade, fim_cidade, dias, itinerario_config } = body;
    if (!String(nome || "").trim()) return json({ error: "Nome obrigatório." }, { status: 400 });
    const payload = {
      nome: String(nome).trim(),
      duracao: Number(duracao || 0) || null,
      inicio_cidade: String(inicio_cidade || "").trim() || null,
      fim_cidade: String(fim_cidade || "").trim() || null,
      created_by: scope.userId,
      company_id: scope.companyId,
      itinerario_config: itinerario_config || null
    };
    let roteiroId;
    if (id && isUuid(id)) {
      const { error: updateError } = await client.from("roteiro_personalizado").update(payload).eq("id", id).eq("created_by", scope.userId);
      if (updateError) throw updateError;
      roteiroId = id;
    } else {
      const { data: inserted, error: insertError } = await client.from("roteiro_personalizado").insert(payload).select("id").single();
      if (insertError) throw insertError;
      roteiroId = inserted.id;
    }
    if (Array.isArray(dias) && dias.length > 0) {
      await client.from("roteiro_dia").delete().eq("roteiro_id", roteiroId);
      const diasRows = dias.map((dia, index) => ({
        roteiro_id: roteiroId,
        ordem: index + 1,
        cidade: String(dia.cidade || "").trim(),
        data: dia.data || null,
        descricao: String(dia.descricao || "").trim() || null
      }));
      if (diasRows.length > 0) {
        const { error: diasError } = await client.from("roteiro_dia").insert(diasRows);
        if (diasError && !String(diasError.code || "").includes("42P01")) throw diasError;
      }
    }
    return json({ ok: true, id: roteiroId });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar roteiro.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { error: deleteError } = await client.from("roteiro_personalizado").delete().eq("id", id).eq("created_by", scope.userId);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir roteiro.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await request.json();
    const { action } = body;
    if (action === "sugestoes-busca") {
      const termo = String(body.termo || "").trim();
      const tipo = String(body.tipo || "").trim();
      if (!termo && !tipo) {
        return json({ sugestoes: [] });
      }
      let query = client.from("roteiro_sugestoes").select("*").order("uso_count", { ascending: false }).limit(50);
      if (termo) query = query.ilike("valor", `%${termo}%`);
      if (tipo) query = query.eq("tipo", tipo);
      const { data, error } = await query;
      if (error) throw error;
      return json({ sugestoes: data || [] });
    }
    if (action === "sugestoes-salvar") {
      const { tipo, valor } = body;
      if (!tipo || !valor) return json({ error: "tipo e valor obrigatorios." }, { status: 400 });
      const normalizedValor = String(valor).trim().toLowerCase();
      const { data: existing } = await client.from("roteiro_sugestoes").select("id, uso_count").eq("tipo", tipo).eq("valor_normalizado", normalizedValor).maybeSingle();
      if (existing) {
        await client.from("roteiro_sugestoes").update({ uso_count: (existing.uso_count || 0) + 1 }).eq("id", existing.id);
        return json({ ok: true, id: existing.id });
      }
      const { data: inserted, error: insertError } = await client.from("roteiro_sugestoes").insert({ tipo, valor: String(valor).trim(), company_id: scope.companyId, valor_normalizado: normalizedValor }).select("id").single();
      if (insertError) throw insertError;
      return json({ ok: true, id: inserted?.id });
    }
    if (action === "sugestoes-remover") {
      const { id } = body;
      if (!isUuid(id)) return json({ error: "ID invalido." }, { status: 400 });
      await client.from("roteiro_sugestoes").delete().eq("id", id);
      return json({ ok: true });
    }
    return json({ error: "Acao invalida." }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao processar sugestoes.");
  }
}
export {
  DELETE,
  GET,
  PATCH,
  POST
};

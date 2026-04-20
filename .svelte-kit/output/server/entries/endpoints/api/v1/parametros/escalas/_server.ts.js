import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, h as fetchGestorEquipeIdsComGestor, t as toErrorResponse, i as isUuid } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["escalas", "parametros"], 1, "Sem acesso a Escalas.");
    }
    const { searchParams } = event.url;
    const periodo = String(searchParams.get("periodo") || "").trim();
    let equipeIds = [];
    if (scope.isGestor) {
      equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    } else if (scope.isAdmin || scope.isMaster) {
      const { data: usersData } = await client.from("users").select("id").eq("active", true).eq("company_id", scope.companyId || "").limit(200);
      equipeIds = (usersData || []).map((u) => u.id);
    } else {
      equipeIds = [scope.userId];
    }
    let mesQuery = client.from("escala_mes").select("id, periodo, status, company_id").order("periodo", { ascending: false }).limit(24);
    if (scope.companyId && !scope.isAdmin) mesQuery = mesQuery.eq("company_id", scope.companyId);
    if (periodo) mesQuery = mesQuery.eq("periodo", periodo + "-01");
    const { data: meses, error: mesError } = await mesQuery;
    if (mesError) {
      if (String(mesError.code || "").includes("42P01") || String(mesError.message || "").includes("does not exist")) {
        return json({ meses: [], dias: [], usuarios: [], feriados: [] });
      }
      throw mesError;
    }
    let dias = [];
    if (periodo && meses && meses.length > 0) {
      const mesIds = meses.map((m) => m.id);
      let diasQuery = client.from("escala_dia").select("id, escala_mes_id, usuario_id, data, tipo, hora_inicio, hora_fim, observacao, usuario:users!usuario_id(id, nome_completo)").in("escala_mes_id", mesIds).order("data");
      if (equipeIds.length > 0) diasQuery = diasQuery.in("usuario_id", equipeIds);
      const { data: diasData } = await diasQuery.limit(2e3);
      dias = diasData || [];
    }
    let usuarios = [];
    if (equipeIds.length > 0) {
      const { data: usersData } = await client.from("users").select("id, nome_completo, email").in("id", equipeIds).eq("active", true).order("nome_completo").limit(100);
      usuarios = usersData || [];
    }
    let feriadosQuery = client.from("feriados").select("id, data, nome, tipo").order("data").limit(100);
    if (scope.companyId && !scope.isAdmin) feriadosQuery = feriadosQuery.eq("company_id", scope.companyId);
    const { data: feriados } = await feriadosQuery;
    let horariosUsuario = [];
    const { data: horariosData } = await client.from("escala_horario_usuario").select("*").eq("usuario_id", scope.userId).maybeSingle();
    if (horariosData) {
      horariosUsuario = [horariosData];
    }
    return json({
      meses: meses || [],
      dias,
      usuarios,
      feriados: feriados || [],
      horariosUsuario
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar escalas.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["escalas", "parametros"], 2, "Sem permissão para salvar escalas.");
    }
    const body = await event.request.json();
    const { action } = body;
    if (action === "upsert_dia") {
      const { escala_mes_id, usuario_id, data, tipo, hora_inicio, hora_fim, observacao } = body;
      if (!isUuid(escala_mes_id) || !isUuid(usuario_id) || !data) {
        return json({ error: "Dados inválidos." }, { status: 400 });
      }
      const payload = {
        escala_mes_id,
        usuario_id,
        data,
        tipo: String(tipo || "").trim() || null,
        hora_inicio: String(hora_inicio || "").trim() || null,
        hora_fim: String(hora_fim || "").trim() || null,
        observacao: String(observacao || "").trim() || null
      };
      const { data: existing } = await client.from("escala_dia").select("id").eq("escala_mes_id", escala_mes_id).eq("usuario_id", usuario_id).eq("data", data).maybeSingle();
      if (existing?.id) {
        if (!tipo) {
          await client.from("escala_dia").delete().eq("id", existing.id);
        } else {
          await client.from("escala_dia").update(payload).eq("id", existing.id);
        }
      } else if (tipo) {
        await client.from("escala_dia").insert(payload);
      }
      return json({ ok: true });
    }
    if (action === "ensure_mes") {
      const { periodo } = body;
      if (!periodo) return json({ error: "Período inválido." }, { status: 400 });
      const periodoFull = periodo.length === 7 ? `${periodo}-01` : periodo;
      const { data: existing } = await client.from("escala_mes").select("id").eq("company_id", scope.companyId || "").eq("periodo", periodoFull).maybeSingle();
      if (!existing) {
        const { data: inserted, error: insertError } = await client.from("escala_mes").insert({ company_id: scope.companyId, gestor_id: scope.userId, periodo: periodoFull, status: "rascunho" }).select("id").single();
        if (insertError) throw insertError;
        return json({ ok: true, id: inserted?.id });
      }
      return json({ ok: true, id: existing.id });
    }
    if (action === "upsert_horario_usuario") {
      const horario = body.horario || {};
      const payload = {
        company_id: scope.companyId || null,
        usuario_id: scope.userId,
        seg_inicio: horario.seg_inicio || null,
        seg_fim: horario.seg_fim || null,
        ter_inicio: horario.ter_inicio || null,
        ter_fim: horario.ter_fim || null,
        qua_inicio: horario.qua_inicio || null,
        qua_fim: horario.qua_fim || null,
        qui_inicio: horario.qui_inicio || null,
        qui_fim: horario.qui_fim || null,
        sex_inicio: horario.sex_inicio || null,
        sex_fim: horario.sex_fim || null,
        sab_inicio: horario.sab_inicio || null,
        sab_fim: horario.sab_fim || null,
        dom_inicio: horario.dom_inicio || null,
        dom_fim: horario.dom_fim || null,
        feriado_inicio: horario.feriado_inicio || null,
        feriado_fim: horario.feriado_fim || null,
        auto_aplicar: Boolean(horario.auto_aplicar || false)
      };
      const { data: existing } = await client.from("escala_horario_usuario").select("id").eq("usuario_id", scope.userId).maybeSingle();
      if (existing?.id) {
        await client.from("escala_horario_usuario").update(payload).eq("id", existing.id);
        return json({ ok: true, id: existing.id });
      } else {
        const { data: inserted, error: insertError } = await client.from("escala_horario_usuario").insert(payload).select("id").single();
        if (insertError) throw insertError;
        return json({ ok: true, id: inserted?.id });
      }
    }
    return json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar escala.");
  }
}
export {
  GET,
  POST
};

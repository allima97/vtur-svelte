import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
const SYSTEM_MODULES_CATALOG = [
  "dashboard",
  "vendas",
  "vendas_consulta",
  "vendas_importar",
  "orcamentos",
  "clientes",
  "consultoria_online",
  "cadastros",
  "cadastros_paises",
  "cadastros_estados",
  "cadastros_cidades",
  "cadastros_destinos",
  "cadastros_produtos",
  "circuitos",
  "cadastros_lote",
  "cadastros_fornecedores",
  "relatorios",
  "relatorios_vendas",
  "relatorios_destinos",
  "relatorios_produtos",
  "relatorios_clientes",
  "parametros",
  "parametros_tipo_produtos",
  "parametros_tipo_pacotes",
  "parametros_metas",
  "parametros_regras_comissao",
  "parametros_equipe",
  "parametros_escalas",
  "parametros_cambios",
  "parametros_orcamentos",
  "parametros_formas_pagamento",
  "operacao",
  "operacao_agenda",
  "operacao_todo",
  "operacao_chat",
  "operacao_documentos_viagens",
  "operacao_vouchers",
  "operacao_viagens",
  "operacao_controle_sac",
  "operacao_campanhas",
  "operacao_conciliacao",
  "comissionamento",
  "agenda",
  "todo",
  "chat",
  "vouchers",
  "viagens",
  "controle de sac",
  "campanhas",
  "conciliacao",
  "ranking de vendas",
  "importar contratos",
  "relatoriovendas",
  "relatoriodestinos",
  "relatorioprodutos",
  "relatorioclientes",
  "vendas",
  "orcamentos",
  "consultoria online",
  "paises",
  "subdivisoes",
  "cidades",
  "destinos",
  "produtos",
  "produtoslote",
  "fornecedores",
  "tipoprodutos",
  "tipopacotes",
  "metas",
  "regrascomissao",
  "equipe",
  "escalas",
  "cambios",
  "orcamentos (pdf)",
  "formas de pagamento"
];
function normalizeModuleKey(key) {
  const raw = String(key || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const GET = async ({ locals }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      return json({ error: "Sem acesso aos modulos do sistema." }, { status: 403 });
    }
    const { data, error } = await client.from("system_module_settings").select("module_key, enabled, reason, updated_at").order("module_key", { ascending: true });
    if (error) {
      const code = String(error.code || "").toLowerCase();
      const message = String(error.message || "").toLowerCase();
      const tableMissing = code === "42P01" || message.includes("does not exist") || code === "42501";
      if (tableMissing) {
        return json({
          table_missing: true,
          disabled: [],
          rows: [],
          catalog: SYSTEM_MODULES_CATALOG,
          setup_error: error.message
        });
      }
      throw error;
    }
    const rows = data || [];
    const disabled = rows.filter((r) => !r.enabled).map((r) => r.module_key);
    return json({
      table_missing: false,
      disabled,
      rows,
      catalog: SYSTEM_MODULES_CATALOG
    });
  } catch (err) {
    console.error("Erro admin/system-modules GET", err);
    return toErrorResponse(err, "Erro ao carregar modulos globais.");
  }
};
const POST = async ({ locals, request }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      return json({ error: "Sem acesso aos modulos do sistema." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const disabledList = Array.isArray(body?.disabled) ? body.disabled : [];
    const normalized = Array.from(
      new Map(
        disabledList.map((item) => ({
          module_key: normalizeModuleKey(item?.module_key),
          reason: String(item?.reason || "").trim() || null
        })).filter((item) => Boolean(item.module_key)).map((item) => [item.module_key, item])
      ).values()
    );
    const { error: deleteError } = await client.from("system_module_settings").delete().neq("module_key", "");
    if (deleteError) {
      const code = String(deleteError.code || "").toLowerCase();
      const message = String(deleteError.message || "").toLowerCase();
      const tableMissing = code === "42P01" || message.includes("does not exist");
      if (tableMissing) {
        return json({ error: "Tabela system_module_settings nao existe. Aplique a migration." }, { status: 400 });
      }
      throw deleteError;
    }
    if (normalized.length > 0) {
      const payload = normalized.map((item) => ({
        module_key: item.module_key,
        enabled: false,
        reason: item.reason,
        updated_by: user.id
      }));
      const { error: insertError } = await client.from("system_module_settings").insert(payload);
      if (insertError) throw insertError;
    }
    return json({ ok: true, disabled: normalized.map((item) => item.module_key) });
  } catch (err) {
    console.error("Erro admin/system-modules POST", err);
    return toErrorResponse(err, "Erro ao salvar modulos globais.");
  }
};
export {
  GET,
  POST
};

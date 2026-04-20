import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { c as createDefaultConciliacaoBandRules, s as sanitizeConciliacaoTiers, n as normalizeConciliacaoTipo, a as sanitizeConciliacaoBandRules } from "../../../../../../chunks/conciliacao.js";
const DEFAULT_PARAMS = {
  company_id: null,
  owner_user_id: null,
  owner_user_nome: null,
  usar_taxas_na_meta: false,
  foco_valor: "bruto",
  modo_corporativo: false,
  politica_cancelamento: "cancelar_venda",
  foco_faturamento: "bruto",
  conciliacao_sobrepoe_vendas: false,
  conciliacao_regra_ativa: false,
  conciliacao_tipo: "GERAL",
  conciliacao_meta_nao_atingida: null,
  conciliacao_meta_atingida: null,
  conciliacao_super_meta: null,
  conciliacao_tiers: [],
  conciliacao_faixas_loja: createDefaultConciliacaoBandRules({
    conciliacao_regra_ativa: false,
    conciliacao_tipo: "GERAL",
    conciliacao_meta_nao_atingida: null,
    conciliacao_meta_atingida: null,
    conciliacao_super_meta: null,
    conciliacao_tiers: []
  }),
  mfa_obrigatorio: false,
  exportacao_pdf: false,
  exportacao_excel: false
};
function isMissingColumn(error) {
  const message = String(error?.message || "");
  const match = message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i) || message.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
  return match?.[1] || null;
}
async function upsertWithFallback(client, payload) {
  let currentPayload = { ...payload };
  const removableKeys = /* @__PURE__ */ new Set([
    "conciliacao_sobrepoe_vendas",
    "conciliacao_regra_ativa",
    "conciliacao_tipo",
    "conciliacao_meta_nao_atingida",
    "conciliacao_meta_atingida",
    "conciliacao_super_meta",
    "conciliacao_tiers",
    "conciliacao_faixas_loja",
    "mfa_obrigatorio",
    "exportacao_pdf",
    "exportacao_excel",
    "modo_corporativo",
    "politica_cancelamento",
    "foco_faturamento"
  ]);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await client.from("parametros_comissao").upsert(currentPayload, { onConflict: "company_id" }).select("id").single();
    if (!response.error) return response.data;
    const missingColumn = isMissingColumn(response.error);
    if (!missingColumn || !removableKeys.has(missingColumn) || !(missingColumn in currentPayload)) {
      throw response.error;
    }
    delete currentPayload[missingColumn];
  }
  throw new Error("Nao foi possivel salvar parametros com fallback de schema.");
}
function canAccessParametros(scope) {
  return scope.isAdmin || Boolean(scope.permissoes.parametros) || Boolean(scope.permissoes.admin) || Boolean(scope.permissoes.admin_financeiro);
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!canAccessParametros(scope)) {
      return new Response("Sem acesso aos parametros do sistema.", {
        status: 403
      });
    }
    const { data: userRow, error: userError } = await client.from("users").select("company_id, nome_completo").eq("id", user.id).maybeSingle();
    if (userError) throw userError;
    const companyId = String(userRow?.company_id || "").trim() || null;
    const ownerNome = String(userRow?.nome_completo || "").trim() || null;
    const { data, error: queryError } = await client.from("parametros_comissao").select("*").eq("company_id", companyId).maybeSingle();
    if (queryError) throw queryError;
    const ownerUserId = String(data?.owner_user_id || "").trim();
    let ownerUserNome = ownerNome;
    if (ownerUserId) {
      const { data: ownerRow } = await client.from("users").select("nome_completo").eq("id", ownerUserId).maybeSingle();
      ownerUserNome = String(
        ownerRow?.nome_completo || ownerUserNome || ""
      ).trim() || ownerUserNome;
    }
    if (!data) {
      return json({
        params: {
          ...DEFAULT_PARAMS,
          company_id: companyId,
          owner_user_id: user.id,
          owner_user_nome: ownerNome
        },
        ultima_atualizacao: null,
        origem: "default",
        owner_nome: ownerNome
      });
    }
    const conciliacaoContext = {
      usar_taxas_na_meta: Boolean(data.usar_taxas_na_meta),
      foco_valor: String(data.foco_valor || "bruto") === "liquido" ? "liquido" : "bruto",
      foco_faturamento: String(data.foco_faturamento || "bruto") === "liquido" ? "liquido" : "bruto",
      conciliacao_sobrepoe_vendas: Boolean(
        data.conciliacao_sobrepoe_vendas
      ),
      conciliacao_regra_ativa: Boolean(data.conciliacao_regra_ativa),
      conciliacao_tipo: normalizeConciliacaoTipo(
        data.conciliacao_tipo
      ),
      conciliacao_meta_nao_atingida: data.conciliacao_meta_nao_atingida != null ? Number(data.conciliacao_meta_nao_atingida) : null,
      conciliacao_meta_atingida: data.conciliacao_meta_atingida != null ? Number(data.conciliacao_meta_atingida) : null,
      conciliacao_super_meta: data.conciliacao_super_meta != null ? Number(data.conciliacao_super_meta) : null,
      conciliacao_tiers: sanitizeConciliacaoTiers(
        data.conciliacao_tiers
      )
    };
    const normalizedParams = {
      id: data.id || null,
      company_id: companyId,
      owner_user_id: ownerUserId || user.id,
      owner_user_nome: ownerUserNome,
      usar_taxas_na_meta: conciliacaoContext.usar_taxas_na_meta,
      foco_valor: conciliacaoContext.foco_valor,
      modo_corporativo: Boolean(data.modo_corporativo),
      politica_cancelamento: String(data.politica_cancelamento || "cancelar_venda") === "estornar_recibos" ? "estornar_recibos" : "cancelar_venda",
      foco_faturamento: conciliacaoContext.foco_faturamento,
      conciliacao_sobrepoe_vendas: conciliacaoContext.conciliacao_sobrepoe_vendas,
      conciliacao_regra_ativa: conciliacaoContext.conciliacao_regra_ativa,
      conciliacao_tipo: conciliacaoContext.conciliacao_tipo,
      conciliacao_meta_nao_atingida: conciliacaoContext.conciliacao_meta_nao_atingida,
      conciliacao_meta_atingida: conciliacaoContext.conciliacao_meta_atingida,
      conciliacao_super_meta: conciliacaoContext.conciliacao_super_meta,
      conciliacao_tiers: conciliacaoContext.conciliacao_tiers,
      mfa_obrigatorio: Boolean(data.mfa_obrigatorio),
      exportacao_pdf: Boolean(data.exportacao_pdf),
      exportacao_excel: Boolean(data.exportacao_excel)
    };
    return json({
      params: {
        ...normalizedParams,
        conciliacao_faixas_loja: sanitizeConciliacaoBandRules(
          data.conciliacao_faixas_loja,
          conciliacaoContext
        )
      },
      ultima_atualizacao: data.updated_at || data.created_at || null,
      origem: "banco",
      owner_nome: ownerUserNome
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar parametros do sistema.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    if (!canAccessParametros(scope) || !scope.isAdmin && body.readonly === true) {
      return new Response("Sem permissao para editar parametros do sistema.", {
        status: 403
      });
    }
    const { data: userRow, error: userError } = await client.from("users").select("company_id, nome_completo").eq("id", user.id).maybeSingle();
    if (userError) throw userError;
    const companyId = String(userRow?.company_id || "").trim() || null;
    const ownerNome = String(userRow?.nome_completo || "").trim() || null;
    const normalizedBody = {
      usar_taxas_na_meta: Boolean(body.usar_taxas_na_meta),
      foco_valor: String(body.foco_valor || "bruto") === "liquido" ? "liquido" : "bruto",
      foco_faturamento: String(body.foco_faturamento || "bruto") === "liquido" ? "liquido" : "bruto",
      conciliacao_sobrepoe_vendas: Boolean(body.conciliacao_sobrepoe_vendas),
      conciliacao_regra_ativa: Boolean(body.conciliacao_regra_ativa),
      conciliacao_tipo: normalizeConciliacaoTipo(body.conciliacao_tipo),
      conciliacao_meta_nao_atingida: body.conciliacao_meta_nao_atingida === "" || body.conciliacao_meta_nao_atingida == null ? null : Number(body.conciliacao_meta_nao_atingida),
      conciliacao_meta_atingida: body.conciliacao_meta_atingida === "" || body.conciliacao_meta_atingida == null ? null : Number(body.conciliacao_meta_atingida),
      conciliacao_super_meta: body.conciliacao_super_meta === "" || body.conciliacao_super_meta == null ? null : Number(body.conciliacao_super_meta),
      conciliacao_tiers: sanitizeConciliacaoTiers(body.conciliacao_tiers),
      mfa_obrigatorio: Boolean(body.mfa_obrigatorio),
      exportacao_pdf: Boolean(body.exportacao_pdf),
      exportacao_excel: Boolean(body.exportacao_excel)
    };
    const payload = {
      company_id: companyId,
      owner_user_id: user.id,
      ...normalizedBody,
      modo_corporativo: Boolean(body.modo_corporativo),
      politica_cancelamento: String(body.politica_cancelamento || "cancelar_venda") === "estornar_recibos" ? "estornar_recibos" : "cancelar_venda",
      conciliacao_faixas_loja: sanitizeConciliacaoBandRules(
        body.conciliacao_faixas_loja,
        normalizedBody
      ),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const result = await upsertWithFallback(client, payload);
    return json({
      id: result?.id || null,
      owner_nome: ownerNome
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar parametros do sistema.");
  }
}
export {
  GET,
  POST
};

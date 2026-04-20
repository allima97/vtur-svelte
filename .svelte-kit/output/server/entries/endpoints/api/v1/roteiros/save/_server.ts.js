import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function normalizeDiaKey(d) {
  const cidade = String(d.cidade || "").trim().toLocaleLowerCase();
  const percurso = String(d.percurso || "").trim().toLocaleLowerCase();
  const data = String(d.data || "").trim();
  const descricao = String(d.descricao || "").trim().toLocaleLowerCase();
  return `${data}__${cidade}__${percurso}__${descricao}`;
}
function stripPercursoField(list) {
  return (list || []).map((d) => {
    const { percurso: _percurso, ...rest } = d || {};
    return rest;
  });
}
function isMissingPercursoColumn(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return code === "42703" || /percurso/i.test(msg) && /does not exist|nao existe|não existe|unknown column|column/i.test(msg);
}
function isMissingOnConflictConstraint(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return code === "42P10" || /unique or exclusion constraint/i.test(msg);
}
function isDuplicateOrdensUnique(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  const details = String(error?.details || "");
  return code === "23505" || /duplicate key value violates unique constraint/i.test(msg) || /roteiro_dia_roteiro_ordem_uniq/i.test(msg) || /roteiro_dia_roteiro_ordem_uniq/i.test(details);
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["orcamentos", "vendas"], 2, "Sem acesso para salvar Roteiros.");
    const body = await event.request.json().catch(() => null);
    if (!body) return new Response("Body invalido.", { status: 400 });
    const nome = String(body.nome || "").trim();
    if (!nome) return new Response("Nome obrigatorio.", { status: 400 });
    const companyId = scope.companyId;
    const isNew = !body.id;
    const incluiTexto = typeof body.inclui_texto === "string" ? body.inclui_texto : null;
    const naoIncluiTexto = typeof body.nao_inclui_texto === "string" ? body.nao_inclui_texto : null;
    const informacoesImportantes = typeof body.informacoes_importantes === "string" ? body.informacoes_importantes : null;
    let roteiroId;
    if (isNew) {
      const insertPayload = {
        created_by: user.id,
        company_id: companyId,
        nome,
        duracao: body.duracao || null,
        inicio_cidade: body.inicio_cidade || null,
        fim_cidade: body.fim_cidade || null,
        inclui_texto: incluiTexto,
        nao_inclui_texto: naoIncluiTexto,
        informacoes_importantes: informacoesImportantes
      };
      const { data: roteiro, error: roteiroErr } = await client.from("roteiro_personalizado").insert(insertPayload).select("id").single();
      if (roteiroErr || !roteiro) throw roteiroErr || new Error("Falha ao criar roteiro.");
      roteiroId = roteiro.id;
    } else {
      roteiroId = String(body.id).trim();
      const updatePayload = {
        nome,
        duracao: body.duracao || null,
        inicio_cidade: body.inicio_cidade || null,
        fim_cidade: body.fim_cidade || null,
        inclui_texto: incluiTexto,
        nao_inclui_texto: naoIncluiTexto,
        informacoes_importantes: informacoesImportantes,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { error: updateErr } = await client.from("roteiro_personalizado").update(updatePayload).eq("id", roteiroId).eq("created_by", user.id);
      if (updateErr) throw updateErr;
    }
    if (Array.isArray(body.hoteis)) {
      await client.from("roteiro_hotel").delete().eq("roteiro_id", roteiroId);
      if (body.hoteis.length > 0) {
        const hoteis = body.hoteis.map((h, idx) => ({
          roteiro_id: roteiroId,
          cidade: h.cidade || null,
          hotel: h.hotel || null,
          endereco: h.endereco || null,
          data_inicio: h.data_inicio || null,
          data_fim: h.data_fim || null,
          noites: h.noites || null,
          qtd_apto: h.qtd_apto || null,
          apto: h.apto || null,
          categoria: h.categoria || null,
          regime: h.regime || null,
          tipo_tarifa: h.tipo_tarifa || null,
          qtd_adultos: h.qtd_adultos || null,
          qtd_criancas: h.qtd_criancas || null,
          valor_original: h.valor_original || null,
          valor_final: h.valor_final || null,
          ordem: typeof h.ordem === "number" ? h.ordem : idx
        })).filter(
          (h) => Boolean(
            String(h.cidade || "").trim() || String(h.hotel || "").trim() || String(h.endereco || "").trim() || String(h.data_inicio || "").trim() || String(h.data_fim || "").trim() || String(h.apto || "").trim() || String(h.regime || "").trim() || String(h.categoria || "").trim() || String(h.tipo_tarifa || "").trim() || Number.isFinite(Number(h.noites)) || Number.isFinite(Number(h.qtd_apto)) || Number.isFinite(Number(h.qtd_adultos)) || Number.isFinite(Number(h.qtd_criancas)) || Number.isFinite(Number(h.valor_original)) || Number.isFinite(Number(h.valor_final))
          )
        );
        if (hoteis.length > 0) {
          const { error } = await client.from("roteiro_hotel").insert(hoteis);
          if (error) throw error;
        }
      }
    }
    if (Array.isArray(body.passeios)) {
      await client.from("roteiro_passeio").delete().eq("roteiro_id", roteiroId);
      if (body.passeios.length > 0) {
        const passeios = body.passeios.map((p, idx) => ({
          roteiro_id: roteiroId,
          cidade: p.cidade || null,
          passeio: p.passeio || null,
          fornecedor: p.fornecedor || null,
          data_inicio: p.data_inicio || null,
          data_fim: p.data_fim || null,
          tipo: p.tipo || null,
          ingressos: p.ingressos || null,
          qtd_adultos: p.qtd_adultos || null,
          qtd_criancas: p.qtd_criancas || null,
          valor_original: p.valor_original || null,
          valor_final: p.valor_final || null,
          ordem: typeof p.ordem === "number" ? p.ordem : idx
        })).filter(
          (p) => Boolean(
            String(p.cidade || "").trim() || String(p.passeio || "").trim() || String(p.fornecedor || "").trim() || String(p.data_inicio || "").trim() || String(p.data_fim || "").trim() || String(p.tipo || "").trim() || String(p.ingressos || "").trim() || Number.isFinite(Number(p.qtd_adultos)) || Number.isFinite(Number(p.qtd_criancas)) || Number.isFinite(Number(p.valor_original)) || Number.isFinite(Number(p.valor_final))
          )
        );
        if (passeios.length > 0) {
          const { error } = await client.from("roteiro_passeio").insert(passeios);
          if (error) throw error;
        }
      }
    }
    if (Array.isArray(body.transportes)) {
      await client.from("roteiro_transporte").delete().eq("roteiro_id", roteiroId);
      if (body.transportes.length > 0) {
        const transportes = body.transportes.map((t, idx) => ({
          roteiro_id: roteiroId,
          trecho: t.trecho || null,
          cia_aerea: t.cia_aerea || null,
          data_voo: t.data_voo || null,
          classe_reserva: t.classe_reserva || null,
          hora_saida: t.hora_saida || null,
          aeroporto_saida: t.aeroporto_saida || null,
          duracao_voo: t.duracao_voo || null,
          tipo_voo: t.tipo_voo || null,
          hora_chegada: t.hora_chegada || null,
          aeroporto_chegada: t.aeroporto_chegada || null,
          tarifa_nome: t.tarifa_nome || null,
          reembolso_tipo: t.reembolso_tipo || null,
          qtd_adultos: t.qtd_adultos || null,
          qtd_criancas: t.qtd_criancas || null,
          taxas: t.taxas || null,
          valor_total: t.valor_total || null,
          tipo: t.tipo || null,
          fornecedor: t.fornecedor || null,
          descricao: t.descricao || null,
          data_inicio: t.data_inicio || t.data_voo || null,
          data_fim: t.data_fim || t.data_voo || null,
          categoria: t.categoria || null,
          observacao: t.observacao || null,
          ordem: typeof t.ordem === "number" ? t.ordem : idx
        })).filter(
          (t) => Boolean(
            String(t.trecho || "").trim() || String(t.cia_aerea || "").trim() || String(t.data_voo || "").trim() || String(t.classe_reserva || "").trim() || String(t.hora_saida || "").trim() || String(t.aeroporto_saida || "").trim() || String(t.duracao_voo || "").trim() || String(t.tipo_voo || "").trim() || String(t.hora_chegada || "").trim() || String(t.aeroporto_chegada || "").trim() || String(t.tarifa_nome || "").trim() || String(t.reembolso_tipo || "").trim() || Number.isFinite(Number(t.qtd_adultos)) || Number.isFinite(Number(t.qtd_criancas)) || Number.isFinite(Number(t.taxas)) || Number.isFinite(Number(t.valor_total)) || String(t.tipo || "").trim() || String(t.fornecedor || "").trim() || String(t.descricao || "").trim() || String(t.data_inicio || "").trim() || String(t.data_fim || "").trim() || String(t.categoria || "").trim() || String(t.observacao || "").trim()
          )
        );
        if (transportes.length > 0) {
          const { error } = await client.from("roteiro_transporte").insert(transportes);
          if (error) throw error;
        }
      }
    }
    if (Array.isArray(body.dias)) {
      const { error: delDiasErr } = await client.from("roteiro_dia").delete().eq("roteiro_id", roteiroId);
      if (delDiasErr) throw delDiasErr;
      if (body.dias.length > 0) {
        const sorted = body.dias.slice().sort(
          (a, b) => (Number.isFinite(a?.ordem) ? a.ordem : 0) - (Number.isFinite(b?.ordem) ? b.ordem : 0)
        );
        const normalized = sorted.map((d, idx) => {
          const cidade = String(d?.cidade || "").trim();
          const percurso = String(d?.percurso || "").trim();
          const dataRaw = String(d?.data || "").trim();
          const data = dataRaw ? dataRaw : null;
          const descricao = String(d?.descricao || "").trim();
          return {
            created_by: user.id,
            company_id: companyId,
            roteiro_id: roteiroId,
            cidade,
            percurso,
            data,
            descricao,
            ordem: idx
          };
        }).filter(
          (d) => Boolean(
            (d.cidade || "").trim() || (d.percurso || "").trim() || (d.data || "").trim() || (d.descricao || "").trim()
          )
        );
        const seen = /* @__PURE__ */ new Set();
        const unique = [];
        for (const d of normalized) {
          const key = normalizeDiaKey({
            cidade: d.cidade,
            percurso: d.percurso,
            data: d.data,
            descricao: d.descricao
          });
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(d);
        }
        const dias = unique.map((d, idx) => ({ ...d, ordem: idx }));
        let payload = dias;
        let triedStrip = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await client.from("roteiro_dia").upsert(payload, { onConflict: "roteiro_id,ordem" });
          if (!error) break;
          if (!triedStrip && isMissingPercursoColumn(error)) {
            payload = stripPercursoField(payload);
            triedStrip = true;
            continue;
          }
          if (isMissingOnConflictConstraint(error)) {
            let { error: insertErr } = await client.from("roteiro_dia").insert(payload);
            if (insertErr) {
              if (!triedStrip && isMissingPercursoColumn(insertErr)) {
                payload = stripPercursoField(payload);
                triedStrip = true;
                ({ error: insertErr } = await client.from("roteiro_dia").insert(payload));
              } else {
                if (isDuplicateOrdensUnique(insertErr)) {
                  await client.from("roteiro_dia").delete().eq("roteiro_id", roteiroId);
                  const { error: retryErr } = await client.from("roteiro_dia").insert(payload);
                  if (retryErr) throw retryErr;
                } else {
                  throw insertErr;
                }
              }
            }
            break;
          }
          throw error;
        }
      }
    }
    if (Array.isArray(body.investimentos)) {
      await client.from("roteiro_investimento").delete().eq("roteiro_id", roteiroId);
      if (body.investimentos.length > 0) {
        const investimentos = body.investimentos.map((i, idx) => {
          const tipo = String(i.tipo || "").trim() || null;
          const valorPorPessoa = Number(i.valor_por_pessoa);
          const qtdApto = Number(i.qtd_apto);
          const valorPorApto = Number(i.valor_por_apto);
          return {
            roteiro_id: roteiroId,
            tipo,
            valor_por_pessoa: Number.isFinite(valorPorPessoa) ? valorPorPessoa : 0,
            qtd_apto: Number.isFinite(qtdApto) ? qtdApto : 0,
            valor_por_apto: Number.isFinite(valorPorApto) ? valorPorApto : 0,
            ordem: typeof i.ordem === "number" ? i.ordem : idx
          };
        }).filter(
          (i) => Boolean(
            i.tipo || Number(i.valor_por_pessoa) > 0 || Number(i.qtd_apto) > 0 || Number(i.valor_por_apto) > 0
          )
        );
        if (investimentos.length > 0) {
          const { error } = await client.from("roteiro_investimento").insert(investimentos);
          if (error) throw error;
        }
      }
    }
    if (Array.isArray(body.pagamentos)) {
      await client.from("roteiro_pagamento").delete().eq("roteiro_id", roteiroId);
      if (body.pagamentos.length > 0) {
        const pagamentos = body.pagamentos.map((p, idx) => {
          const servico = String(p.servico || "").trim() || null;
          const formaPagamento = String(p.forma_pagamento || "").trim() || null;
          const valorTotal = Number(p.valor_total_com_taxas);
          const taxas = Number(p.taxas);
          return {
            roteiro_id: roteiroId,
            servico,
            valor_total_com_taxas: Number.isFinite(valorTotal) ? valorTotal : 0,
            taxas: Number.isFinite(taxas) ? taxas : 0,
            forma_pagamento: formaPagamento,
            ordem: typeof p.ordem === "number" ? p.ordem : idx
          };
        }).filter(
          (p) => Boolean(
            p.servico || p.forma_pagamento || Number(p.valor_total_com_taxas) > 0 || Number(p.taxas) > 0
          )
        );
        if (pagamentos.length > 0) {
          const { error } = await client.from("roteiro_pagamento").insert(pagamentos);
          if (error) throw error;
        }
      }
    }
    return json({ ok: true, id: roteiroId });
  } catch (err) {
    const code = String(err?.code || "");
    const msg = String(err?.message || "");
    if (/row-level security/i.test(msg)) {
      return new Response("Sem permissão para salvar os dias do roteiro (RLS).", { status: 403 });
    }
    if (code === "23505" || /duplicate key value violates unique constraint/i.test(msg)) {
      return new Response(
        "Conflito ao salvar (provável save duplo/concorrência). Tente novamente.",
        { status: 409 }
      );
    }
    return toErrorResponse(err, "Erro ao salvar roteiro.");
  }
}
export {
  POST
};

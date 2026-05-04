import { json } from "@sveltejs/kit";
import { readJsonBodyLimited, rejectCrossOriginRequest } from "$lib/server/requestGuards";
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  invalidatePreferenceReadModels,
  READ_MODEL_TAGS,
  scopeCacheTags,
} from "$lib/server/readModelCache";

const MAX_OPERACAO_PREFERENCIA_BODY_BYTES = 64 * 1024;

function ensurePreferenciasAccess(
  scope: Awaited<ReturnType<typeof resolveUserScope>>,
  minLevel: number,
) {
  if (!scope.isAdmin) {
    ensureModuloAccess(
      scope,
      ["operacao_preferencias"],
      minLevel,
      minLevel >= 3
        ? "Sem permissão para gerenciar preferências."
        : "Sem acesso a Minhas Preferências.",
    );
  }
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensurePreferenciasAccess(scope, 1);

    const result = await getCachedReadModel({
      key: buildReadModelCacheKey("operacao:preferencias", {
        userId: scope.userId,
        companyId: scope.companyId,
      }),
      tags: [
        READ_MODEL_TAGS.preferences,
        READ_MODEL_TAGS.catalog,
        ...scopeCacheTags({
          userId: scope.userId,
          companyIds: scope.companyId ? [scope.companyId] : [],
        }),
      ],
      ttlMs: 20_000,
      staleTtlMs: 120_000,
      loader: async () => {
        const { data, error: queryError } = await client
          .from("minhas_preferencias")
          .select(
            `
            id, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao, created_at,
            cidade:cidades!cidade_id(id, nome),
            tipo_produto:tipo_produtos!tipo_produto_id(id, nome)
          `,
          )
          .eq("created_by", scope.userId)
          .order("nome")
          .limit(200);

        if (queryError) throw queryError;

        const { data: tipos, error: tiposError } = await client
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .eq("ativo", true)
          .order("nome")
          .limit(100);

        if (tiposError) throw tiposError;

        return { items: data || [], tipos: tipos || [] };
      },
    });

    return json(result);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar preferências.");
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_OPERACAO_PREFERENCIA_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const {
      id,
      tipo_produto_id,
      cidade_id,
      nome,
      localizacao,
      classificacao,
      observacao,
    } = body;
    ensurePreferenciasAccess(scope, id && isUuid(id) ? 3 : 2);

    if (!String(nome || "").trim())
      return json({ error: "Nome obrigatório." }, { status: 400 });

    const payload = {
      created_by: scope.userId,
      company_id: scope.companyId,
      tipo_produto_id:
        tipo_produto_id && isUuid(tipo_produto_id) ? tipo_produto_id : null,
      cidade_id: cidade_id && isUuid(cidade_id) ? cidade_id : null,
      nome: String(nome).trim(),
      localizacao: String(localizacao || "").trim() || null,
      classificacao: String(classificacao || "").trim() || null,
      observacao: String(observacao || "").trim() || null,
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client
        .from("minhas_preferencias")
        .update(payload)
        .eq("id", id)
        .eq("created_by", scope.userId)
        .select("id")
        .single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client
        .from("minhas_preferencias")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) throw insertError;
      result = data;
    }

    invalidatePreferenceReadModels({
      companyIds: scope.companyId ? [scope.companyId] : [],
      userId: scope.userId,
    });
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar preferência.");
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensurePreferenciasAccess(scope, 4);

    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });

    const { error: deleteError } = await client
      .from("minhas_preferencias")
      .delete()
      .eq("id", id)
      .eq("created_by", scope.userId);
    if (deleteError) throw deleteError;

    invalidatePreferenceReadModels({
      companyIds: scope.companyId ? [scope.companyId] : [],
      userId: scope.userId,
    });
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir preferência.");
  }
}

export async function PATCH(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_OPERACAO_PREFERENCIA_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const { action } = body;
    ensurePreferenciasAccess(scope, action === "accept" ? 1 : 3);

    if (action === "share") {
      const { preferencia_id, shared_with_email } = body;
      if (!isUuid(preferencia_id))
        return json({ error: "preferencia_id invalido." }, { status: 400 });
      if (!shared_with_email)
        return json(
          { error: "shared_with_email obrigatorio." },
          { status: 400 },
        );
      if (!scope.companyId)
        return json({ error: "Empresa inválida." }, { status: 400 });

      const { data: preferencia, error: preferenciaError } = await client
        .from("minhas_preferencias")
        .select("id")
        .eq("id", preferencia_id)
        .eq("company_id", scope.companyId)
        .eq("created_by", scope.userId)
        .maybeSingle();

      if (preferenciaError) throw preferenciaError;
      if (!preferencia)
        return json({ error: "Preferência não encontrada." }, { status: 404 });

      const { data: targetUser } = await client
        .from("users")
        .select("id")
        .eq("email", shared_with_email.toLowerCase())
        .eq("company_id", scope.companyId)
        .eq("active", true)
        .maybeSingle();
      if (!targetUser)
        return json({ error: "Usuario nao encontrado." }, { status: 404 });
      if (String(targetUser.id) === scope.userId)
        return json(
          { error: "Não é possível compartilhar com você mesmo." },
          { status: 400 },
        );

      const payload = {
        company_id: scope.companyId,
        preferencia_id,
        shared_by: scope.userId,
        shared_with: targetUser.id,
        status: "pending",
      };

      const { error: shareError } = await client
        .from("minhas_preferencias_shares")
        .insert(payload);
      if (shareError) throw shareError;

      invalidatePreferenceReadModels({
        companyIds: [scope.companyId],
        userId: scope.userId,
      });
      return json({ ok: true });
    }

    if (action === "accept") {
      const { share_id } = body;
      if (!isUuid(share_id))
        return json({ error: "share_id invalido." }, { status: 400 });

      const { data, error } = await client
        .from("minhas_preferencias_shares")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", share_id)
        .eq("shared_with", scope.userId)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data)
        return json({ error: "Convite não encontrado." }, { status: 404 });

      invalidatePreferenceReadModels({
        companyIds: scope.companyId ? [scope.companyId] : [],
        userId: scope.userId,
      });
      return json({ ok: true });
    }

    if (action === "revoke") {
      const { share_id } = body;
      if (!isUuid(share_id))
        return json({ error: "share_id invalido." }, { status: 400 });

      const { data, error } = await client
        .from("minhas_preferencias_shares")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", share_id)
        .eq("shared_by", scope.userId)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data)
        return json(
          { error: "Compartilhamento não encontrado." },
          { status: 404 },
        );

      invalidatePreferenceReadModels({
        companyIds: scope.companyId ? [scope.companyId] : [],
        userId: scope.userId,
      });
      return json({ ok: true });
    }

    return json({ error: "Acao invalida." }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao gerenciar compartilhamento.");
  }
}

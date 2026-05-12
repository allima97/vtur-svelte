import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminClient, isUuid, logServerError, requireAuthenticatedUser } from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_CONVITE_ACCEPT_BODY_BYTES = 32 * 1024;

function isTableMissing(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42P01" || message.includes("does not exist");
}

function isMissingColumn(error: any, column: string) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42703" && message.includes(column.toLowerCase());
}

function errorJson(message: string, status: number) {
  return json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;

    const user = await requireAuthenticatedUser({ locals } as any);
    const adminClient = getAdminClient();

    const bodyResult = await readJsonBodyLimited(request, MAX_CONVITE_ACCEPT_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.data && typeof bodyResult.data === 'object'
      ? (bodyResult.data as Record<string, any>)
      : {};
    const inviteId = String(body.invite_id || "").trim();
    if (!inviteId) return errorJson("invite_id e obrigatorio.", 400);
    if (!isUuid(inviteId)) return errorJson("invite_id invalido.", 400);

    const email = String(user.email || "").trim().toLowerCase();
    if (!email) return errorJson("Conta sem e-mail.", 400);

    const { data: convite, error: conviteErr } = await adminClient
      .from("user_convites")
      .select(
        "id, status, invited_email, invited_user_id, company_id, user_type_id, invited_by_role, expires_at, uso_individual"
      )
      .eq("id", inviteId)
      .limit(1)
      .maybeSingle();

    if (conviteErr) {
      if (isTableMissing(conviteErr)) {
        return errorJson("Tabela public.user_convites nao existe. Aplique a migration.", 500);
      }
      if (isMissingColumn(conviteErr, "expires_at")) {
        return errorJson("Coluna public.user_convites.expires_at ausente. Aplique a migration.", 500);
      }
      throw conviteErr;
    }

    if (!convite?.id) return errorJson("Convite nao encontrado.", 404);

    const status = String((convite as any)?.status || "").toLowerCase();
    if (status !== "pending") {
      return errorJson("Convite nao esta pendente.", 409);
    }

    const invitedEmail = String((convite as any)?.invited_email || "").trim().toLowerCase();
    if (invitedEmail !== email) {
      return errorJson("Convite nao corresponde a este e-mail.", 403);
    }

    const expiresAtRaw = String((convite as any)?.expires_at || "");
    if (expiresAtRaw) {
      const expiresAt = new Date(expiresAtRaw);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        await adminClient
          .from("user_convites")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", inviteId);
        return errorJson("Convite expirado. Solicite um novo convite.", 410);
      }
    }

    const alreadyBoundId = (convite as any)?.invited_user_id as string | null;
    if (alreadyBoundId && alreadyBoundId !== user.id) {
      return errorJson("Convite ja foi associado a outro usuario.", 409);
    }

    const companyId = String((convite as any)?.company_id || "").trim();
    const userTypeId = String((convite as any)?.user_type_id || "").trim();
    const usoIndividual = Boolean((convite as any)?.uso_individual);
    if ((!usoIndividual && !companyId) || !userTypeId) {
      return errorJson("Convite invalido (empresa/cargo ausente).", 400);
    }

    const { data: perfilExistente, error: perfilErr } = await adminClient
      .from("users")
      .select("id, company_id, uso_individual")
      .eq("id", user.id)
      .maybeSingle();
    if (perfilErr) throw perfilErr;

    const companyAtual = String((perfilExistente as any)?.company_id || "").trim();
    const usoAtual = (perfilExistente as any)?.uso_individual as boolean | null | undefined;

    if (!usoIndividual && companyAtual && companyAtual !== companyId && usoAtual === false) {
      return errorJson("Usuario ja vinculado a outra empresa.", 409);
    }

    const createdByGestor = String((convite as any)?.invited_by_role || "").toUpperCase() === "GESTOR";

    if (!perfilExistente?.id) {
      const { error: insertErr } = await adminClient.from("users").insert({
        id: user.id,
        email,
        uso_individual: usoIndividual,
        company_id: usoIndividual ? null : companyId,
        user_type_id: userTypeId,
        active: true,
        created_by_gestor: createdByGestor,
      } as any);
      if (insertErr) throw insertErr;
    } else {
      const { error: updateErr } = await adminClient
        .from("users")
        .update({
          email,
          uso_individual: usoIndividual,
          company_id: usoIndividual ? null : companyId,
          user_type_id: userTypeId,
          active: true,
          created_by_gestor: createdByGestor,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
      if (updateErr) throw updateErr;
    }

    await adminClient
      .from("user_convites")
      .update({ invited_user_id: user.id } as any)
      .eq("id", inviteId);

    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    logServerError("[convites/accept] falha ao aceitar convite", error);
    return errorJson("Erro interno ao aceitar convite.", 500);
  }
};

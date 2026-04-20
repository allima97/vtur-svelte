import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
const GET = async ({ locals }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const scope = await resolveUserScope(client, user.id);
    const [{ data: userRow, error: userErr }, { data: settingsRow, error: settingsErr }] = await Promise.all([
      client.from("users").select("id, nome_completo, company_id").eq("id", user.id).maybeSingle(),
      client.from("quote_print_settings").select("consultor_nome").eq("owner_user_id", user.id).maybeSingle()
    ]);
    if (userErr) throw userErr;
    if (settingsErr) throw settingsErr;
    const signature = String(settingsRow?.consultor_nome || userRow?.nome_completo || "").trim();
    return json({
      signature,
      assinatura: signature,
      fallbackName: String(userRow?.nome_completo || "").trim(),
      companyId: String(userRow?.company_id || "").trim() || null,
      nome_completo: userRow?.nome_completo || "",
      cargo: ""
    });
  } catch (err) {
    console.error("Erro ao carregar assinatura do perfil:", err);
    return toErrorResponse(err, "Erro ao carregar assinatura.");
  }
};
const PATCH = async ({ locals, request }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const scope = await resolveUserScope(client, user.id);
    const body = await request.json();
    const signature = String(body?.signature || body?.assinatura || "").trim();
    const { data: userRow, error: userErr } = await client.from("users").select("company_id").eq("id", user.id).maybeSingle();
    if (userErr) throw userErr;
    const { error } = await client.from("quote_print_settings").upsert(
      {
        owner_user_id: user.id,
        company_id: userRow?.company_id || null,
        consultor_nome: signature
      },
      { onConflict: "owner_user_id" }
    );
    if (error) throw error;
    return json({ ok: true, signature });
  } catch (err) {
    console.error("Erro ao salvar assinatura do perfil:", err);
    return toErrorResponse(err, "Erro ao salvar assinatura.");
  }
};
export {
  GET,
  PATCH
};

import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
const GET = async ({ locals }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      return json({ error: "Sem acesso." }, { status: 403 });
    }
    const { data, error } = await client.from("admin_system_settings").select("maintenance_enabled, maintenance_message, updated_at").eq("singleton", true).maybeSingle();
    if (error) throw error;
    return json({
      maintenance_enabled: Boolean(data?.maintenance_enabled),
      maintenance_message: data?.maintenance_message ?? null,
      updated_at: data?.updated_at ?? null
    });
  } catch (err) {
    console.error("Erro admin maintenance GET", err);
    return toErrorResponse(err, "Erro ao carregar manutencao.");
  }
};
const POST = async ({ locals, request }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      return json({ error: "Sem acesso." }, { status: 403 });
    }
    const body = await request.json();
    const payload = {
      singleton: true,
      maintenance_enabled: Boolean(body?.maintenance_enabled ?? body?.enabled),
      maintenance_message: body?.maintenance_message ?? body?.message ?? null,
      updated_by: user.id
    };
    const { error } = await client.from("admin_system_settings").upsert(payload, { onConflict: "singleton" });
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error("Erro admin maintenance POST", err);
    return toErrorResponse(err, "Erro ao salvar manutencao.");
  }
};
export {
  GET,
  POST
};

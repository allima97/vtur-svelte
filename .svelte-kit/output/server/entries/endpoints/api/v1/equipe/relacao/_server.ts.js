import { json } from "@sveltejs/kit";
import { r as requireAuthenticatedUser, i as isUuid } from "../../../../../../chunks/v1.js";
const POST = async ({ request, locals }) => {
  try {
    await requireAuthenticatedUser({ locals });
    const client = locals.supabase;
    const body = await request.json().catch(() => ({}));
    const gestorId = String(body.gestor_id || "").trim();
    const vendedorId = String(body.vendedor_id || "").trim();
    const ativo = body.ativo === true;
    if (!isUuid(gestorId) || !isUuid(vendedorId)) {
      return json({ error: "Gestor ou vendedor invalido." }, { status: 400 });
    }
    const { data, error } = await client.rpc("set_gestor_vendedor_relacao", {
      p_gestor_id: gestorId,
      p_vendedor_id: vendedorId,
      p_ativo: ativo
    });
    if (error) {
      return json({ error: error.message || "Erro ao atualizar equipe." }, { status: 400 });
    }
    return json(data || { ok: true, ativo });
  } catch (error) {
    console.error("Erro equipe/relacao", error);
    return json({ error: error?.message || "Erro ao atualizar equipe." }, { status: 500 });
  }
};
export {
  POST
};

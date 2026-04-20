import { i as isUuid } from "../../../../../../chunks/v1.js";
import { r as requirePreferenciasScope, s as safeJsonParse } from "../../../../../../chunks/_shared2.js";
async function POST(event) {
  try {
    const { client } = await requirePreferenciasScope(event, 4);
    const body = safeJsonParse(await event.request.text());
    const id = String(body?.id || "").trim();
    if (!isUuid(id)) return new Response("id invalido.", { status: 400 });
    const { error } = await client.from("minhas_preferencias").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Erro preferencias/delete", err);
    return new Response("Erro ao excluir preferência.", { status: 500 });
  }
}
export {
  POST
};

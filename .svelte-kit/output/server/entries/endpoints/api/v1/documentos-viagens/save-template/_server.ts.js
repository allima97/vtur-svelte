import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function clampText(value, max = 12e4) {
  const s = String(value ?? "");
  return s.length <= max ? s : s.slice(0, max);
}
function normalizeTitle(value) {
  return clampText(value, 160).trim().replace(/\s+/g, " ");
}
function normalizeFields(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of raw) {
    const key = String(item?.key || "").trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64);
    if (!key || seen.has(key)) continue;
    const typeRaw = String(item?.type || "text");
    const type = typeRaw === "date" || typeRaw === "signature" ? typeRaw : "text";
    const label = String(item?.label || key).trim().replace(/\s+/g, " ").slice(0, 80);
    seen.add(key);
    out.push({ key, label: label || key, type });
  }
  return out.slice(0, 80);
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["documentos_viagens", "operacao"], 3, "Sem permissao para editar documentos.");
    }
    const body = await event.request.json();
    const id = String(body?.id || "").trim();
    if (!isUuid(id)) return json({ error: "id invalido." }, { status: 400 });
    const title = normalizeTitle(body?.title);
    const templateText = clampText(body?.template_text, 2e5);
    const templateFields = normalizeFields(body?.template_fields);
    if (!title) return json({ error: "title obrigatorio." }, { status: 400 });
    if (!templateText.trim()) return json({ error: "template_text obrigatorio." }, { status: 400 });
    const { data, error } = await client.from("documentos_viagens").update({
      title,
      template_text: templateText,
      template_fields: templateFields,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_by: user.id
    }).eq("id", id).select("id, file_name, display_name, title, template_text, template_fields, storage_bucket, storage_path, mime_type, size_bytes, created_at, updated_at").maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Documento nao encontrado." }, { status: 404 });
    return json({ ok: true, doc: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar modelo.");
  }
}
export {
  POST
};

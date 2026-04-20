import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["financeiro"], 2, "Sem permissão para anexar comprovantes.");
    const formData = await event.request.formData();
    const file = formData.get("file");
    const pagamentoId = formData.get("pagamento_id");
    if (!file || !pagamentoId) {
      return json({ success: false, error: "Arquivo e ID do pagamento são obrigatórios." }, { status: 400 });
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return json({ success: false, error: "Tipo de arquivo não permitido. Use JPG, PNG, WebP ou PDF." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return json({ success: false, error: "Arquivo muito grande. Tamanho máximo: 5MB." }, { status: 400 });
    }
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `comprovantes/${pagamentoId}/${timestamp}.${extension}`;
    const { data: uploadData, error: uploadError } = await client.storage.from("viagens-documentos").upload(fileName, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = client.storage.from("viagens-documentos").getPublicUrl(fileName);
    const comprovanteUrl = urlData?.publicUrl || null;
    const { data: pagamento, error: updateError } = await client.from("vendas_pagamentos").update({ observacoes: comprovanteUrl, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", pagamentoId).select().single();
    if (updateError) throw updateError;
    return json({ success: true, item: pagamento, comprovante_url: comprovanteUrl });
  } catch (err) {
    return toErrorResponse(err, "Erro ao fazer upload do comprovante.");
  }
}
export {
  POST
};

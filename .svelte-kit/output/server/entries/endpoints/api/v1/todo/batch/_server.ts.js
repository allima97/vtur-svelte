import { json } from "@sveltejs/kit";
import { c as ensureTodoAccess, f as normalizeTodoStatus } from "../../../../../../chunks/agenda.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse, i as isUuid } from "../../../../../../chunks/v1.js";
function normalizeUpdates(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const id = String(item?.id || "").trim();
    if (!isUuid(id)) return null;
    const statusRaw = item?.status;
    const categoriaRaw = item?.categoria_id;
    const doneRaw = item?.done;
    const normalized = { id };
    if (statusRaw !== void 0) {
      normalized.status = normalizeTodoStatus(statusRaw);
    }
    if (categoriaRaw === null) {
      normalized.categoria_id = null;
    } else if (categoriaRaw !== void 0) {
      const categoriaId = String(categoriaRaw || "").trim();
      if (isUuid(categoriaId)) normalized.categoria_id = categoriaId;
    }
    if (typeof doneRaw === "boolean") {
      normalized.done = doneRaw;
    }
    if (!normalized.status && normalized.categoria_id === void 0 && normalized.done === void 0) {
      return null;
    }
    return normalized;
  }).filter(Boolean);
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 2, "Sem permissao para atualizar tarefas.");
    const body = await event.request.json();
    const updates = normalizeUpdates(body?.updates).slice(0, 120);
    if (updates.length === 0) {
      return json({ error: "updates obrigatorio." }, { status: 400 });
    }
    const ids = updates.map((item) => item.id);
    const { data: existingRows, error: existingError } = await client.from("agenda_itens").select("id, user_id, tipo").in("id", ids);
    if (existingError) throw existingError;
    const existingMap = new Map((existingRows || []).map((row) => [String(row.id), row]));
    const errors = [];
    let updated = 0;
    for (const update of updates) {
      const existing = existingMap.get(update.id);
      if (!existing || existing.tipo !== "todo") {
        errors.push({ id: update.id, message: "Tarefa nao encontrada." });
        continue;
      }
      if (!scope.isAdmin && String(existing.user_id || "") !== user.id) {
        errors.push({ id: update.id, message: "Sem acesso a esta tarefa." });
        continue;
      }
      const payload = {};
      if (update.status) {
        payload.status = update.status;
        if (update.done === void 0) {
          payload.done = update.status === "em_andamento" || update.status === "concluido";
        }
      }
      if (update.categoria_id !== void 0) payload.categoria_id = update.categoria_id;
      if (update.done !== void 0) payload.done = update.done;
      const { error } = await client.from("agenda_itens").update(payload).eq("id", update.id);
      if (error) {
        errors.push({ id: update.id, message: String(error.message || error) });
        continue;
      }
      updated += 1;
    }
    return json(
      {
        ok: errors.length === 0,
        updated,
        errors
      },
      { status: errors.length > 0 ? 207 : 200 }
    );
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar tarefas.");
  }
}
export {
  POST
};

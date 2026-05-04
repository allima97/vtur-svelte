import { json } from "@sveltejs/kit";
import { ensureTodoAccess, normalizeTodoStatus } from "$lib/server/agenda";
import { readJsonBodyLimited, rejectCrossOriginRequest } from "$lib/server/requestGuards";
import { NO_STORE_HEADERS } from "$lib/server/httpCache";
import { invalidateTodoReadModels } from "$lib/server/readModelCache";
import {
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";

type UpdateInput = {
  id: string;
  status?: string;
  categoria_id?: string | null;
  done?: boolean;
};

const MAX_TODO_BATCH_BODY_BYTES = 128 * 1024;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function normalizeUpdates(raw: unknown): UpdateInput[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const id = String((item as any)?.id || "").trim();
      if (!isUuid(id)) return null;

      const statusRaw = (item as any)?.status;
      const categoriaRaw = (item as any)?.categoria_id;
      const doneRaw = (item as any)?.done;

      const normalized: UpdateInput = { id };

      if (statusRaw !== undefined) {
        normalized.status = normalizeTodoStatus(statusRaw);
      }
      if (categoriaRaw === null) {
        normalized.categoria_id = null;
      } else if (categoriaRaw !== undefined) {
        const categoriaId = String(categoriaRaw || "").trim();
        if (isUuid(categoriaId)) normalized.categoria_id = categoriaId;
      }
      if (typeof doneRaw === "boolean") {
        normalized.done = doneRaw;
      }

      if (
        !normalized.status &&
        normalized.categoria_id === undefined &&
        normalized.done === undefined
      ) {
        return null;
      }

      return normalized;
    })
    .filter(Boolean) as UpdateInput[];
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_TODO_BATCH_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureTodoAccess(scope, 2, "Sem permissao para atualizar tarefas.");

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const updates = normalizeUpdates(body?.updates).slice(0, 120);
    if (updates.length === 0) {
      return json({ error: "updates obrigatorio." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const ids = updates.map((item) => item.id);
    const existingRows: any[] = [];
    for (const batch of chunkArray(ids)) {
      const { data, error: existingError } = await client
        .from("agenda_itens")
        .select("id, user_id, tipo")
        .in("id", batch);

      if (existingError) throw existingError;
      existingRows.push(...(data || []));
    }

    const existingMap = new Map(
      (existingRows || []).map((row: any) => [String(row.id), row]),
    );
    const errors: Array<{ id: string; message: string }> = [];
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

      const payload: Record<string, unknown> = {};
      if (update.status) {
        payload.status = update.status;
        if (update.done === undefined) {
          payload.done =
            update.status === "em_andamento" || update.status === "concluido";
        }
      }
      if (update.categoria_id !== undefined)
        payload.categoria_id = update.categoria_id;
      if (update.done !== undefined) payload.done = update.done;

      const { error } = await client
        .from("agenda_itens")
        .update(payload)
        .eq("id", update.id);
      if (error) {
        logServerError("[todo/batch] Falha ao atualizar tarefa", error);
        errors.push({
          id: update.id,
          message: "Erro ao atualizar esta tarefa.",
        });
        continue;
      }
      updated += 1;
    }

    if (updated > 0) {
      invalidateTodoReadModels({
        companyIds: scope.companyIds,
        userId: user.id,
      });
    }

    return json(
      {
        ok: errors.length === 0,
        updated,
        errors,
      },
      { status: errors.length > 0 ? 207 : 200, headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar tarefas.");
  }
}

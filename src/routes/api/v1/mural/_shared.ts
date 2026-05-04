import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  type UserScope,
} from "$lib/server/v1";

export const PRIVATE_JSON_SHORT_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, max-age=5",
  Vary: "Cookie",
};

export const NO_STORE_JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  Vary: "Cookie",
};

export const NO_STORE_TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  Vary: "Cookie",
};

export function privateJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: PRIVATE_JSON_SHORT_HEADERS,
  });
}

export function noStoreJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: NO_STORE_JSON_HEADERS,
  });
}

export function noStoreTextResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: NO_STORE_TEXT_HEADERS,
  });
}

export async function requireMuralScope(event: any, minLevel = 1) {
  const client = getAdminClient();
  const user = await requireAuthenticatedUser(event);
  const scope = await resolveUserScope(client, user.id);

  if (!scope.isAdmin) {
    ensureModuloAccess(
      scope,
      ["operacao_recados"],
      minLevel,
      minLevel >= 2
        ? "Sem permissão para gerenciar recados."
        : "Sem acesso ao Mural de Recados.",
    );
  }

  return { client, user, scope };
}

export async function assertCompanyAccess(
  client: any,
  scope: UserScope,
  companyId: string,
) {
  if (scope.isAdmin) return null;

  if (!scope.isMaster) {
    if (!scope.companyId || scope.companyId !== companyId) {
      return noStoreTextResponse("Sem acesso a empresa.", 403);
    }
    return null;
  }

  const { data: vinculos, error } = await client
    .from("master_empresas")
    .select("company_id, status")
    .eq("master_id", scope.userId)
    .eq("status", "approved");
  if (error) throw error;

  const allowed = (vinculos || []).some(
    (row: any) => String(row.company_id || "") === companyId,
  );
  if (!allowed) return noStoreTextResponse("Sem acesso a empresa.", 403);
  return null;
}

export async function fetchRecados(client: any, companyId: string) {
  const baseSelect =
    "id, company_id, sender_id, receiver_id, assunto, conteudo, created_at, sender_deleted, receiver_deleted, sender:sender_id(id, nome_completo, email), receiver:receiver_id(id, nome_completo, email), leituras:mural_recados_leituras(read_at, user_id, user:user_id(id, nome_completo, email))";
  const selectWithAttachments = `${baseSelect}, arquivos:mural_recados_arquivos(id, company_id, recado_id, uploaded_by, file_name, storage_bucket, storage_path, mime_type, size_bytes, created_at)`;

  const fetchRows = async (select: string) =>
    client
      .from("mural_recados")
      .select(select)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);

  let supportsAttachments = true;
  let resp = await fetchRows(selectWithAttachments);
  if (resp.error) {
    const msg = String(resp.error.message || "").toLowerCase();
    if (msg.includes("mural_recados_arquivos")) {
      supportsAttachments = false;
      resp = await fetchRows(baseSelect);
    }
  }
  if (resp.error) throw resp.error;

  return {
    recados: await withSignedAttachmentUrls(client, resp.data || []),
    supportsAttachments,
  };
}

async function withSignedAttachmentUrls(client: any, recados: any[]) {
  const files = recados.flatMap((recado) =>
    (recado.arquivos || [])
      .filter(
        (arquivo: any) => arquivo?.storage_bucket && arquivo?.storage_path,
      )
      .map((arquivo: any) => ({ recado, arquivo })),
  );

  await Promise.all(
    files.map(async ({ arquivo }) => {
      try {
        const { data } = await client.storage
          .from(arquivo.storage_bucket)
          .createSignedUrl(arquivo.storage_path, 15 * 60);
        arquivo.download_url = data?.signedUrl || null;
      } catch {
        arquivo.download_url = null;
      }
    }),
  );

  return recados;
}

export async function fetchUsuariosEmpresa(client: any, companyId: string) {
  const { data, error } = await client
    .from("users")
    .select("id, nome_completo, email, user_types(name)")
    .eq("company_id", companyId)
    .eq("uso_individual", false)
    .eq("active", true)
    .order("nome_completo", { ascending: true });
  if (error) throw error;
  return data || [];
}

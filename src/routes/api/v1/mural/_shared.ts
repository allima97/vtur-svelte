import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope, type UserScope } from '$lib/server/v1';

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const cache = new Map<string, CacheEntry>();

export function readCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

export function writeCache(key: string, payload: unknown, ttlMs: number) {
  cache.set(key, { expiresAt: Date.now() + ttlMs, payload });
}

export async function requireMuralScope(event: any) {
  const client = getAdminClient();
  const user = await requireAuthenticatedUser(event);
  const scope = await resolveUserScope(client, user.id);

  if (!scope.isAdmin) {
    ensureModuloAccess(scope, ['operacao_recados'], 1, 'Sem acesso ao Mural de Recados.');
  }

  return { client, user, scope };
}

export async function assertCompanyAccess(client: any, scope: UserScope, companyId: string) {
  if (scope.isAdmin) return null;

  if (!scope.isMaster) {
    if (!scope.companyId || scope.companyId !== companyId) {
      return new Response('Sem acesso a empresa.', { status: 403 });
    }
    return null;
  }

  const { data: vinculos, error } = await client
    .from('master_empresas')
    .select('company_id, status')
    .eq('master_id', scope.userId)
    .eq('status', 'approved');
  if (error) throw error;

  const allowed = (vinculos || []).some((row: any) => String(row.company_id || '') === companyId);
  if (!allowed) return new Response('Sem acesso a empresa.', { status: 403 });
  return null;
}

export async function fetchRecados(client: any, companyId: string) {
  const baseSelect =
    'id, company_id, sender_id, receiver_id, assunto, conteudo, created_at, sender_deleted, receiver_deleted, sender:sender_id(id, nome_completo, email), receiver:receiver_id(id, nome_completo, email), leituras:mural_recados_leituras(read_at, user_id, user:user_id(id, nome_completo, email))';
  const selectWithAttachments = `${baseSelect}, arquivos:mural_recados_arquivos(id, company_id, recado_id, uploaded_by, file_name, storage_bucket, storage_path, mime_type, size_bytes, created_at)`;

  const fetchRows = async (select: string) =>
    client.from('mural_recados').select(select).eq('company_id', companyId).order('created_at', { ascending: false }).limit(100);

  let supportsAttachments = true;
  let resp = await fetchRows(selectWithAttachments);
  if (resp.error) {
    const msg = String(resp.error.message || '').toLowerCase();
    if (msg.includes('mural_recados_arquivos')) {
      supportsAttachments = false;
      resp = await fetchRows(baseSelect);
    }
  }
  if (resp.error) throw resp.error;

  return { recados: resp.data || [], supportsAttachments };
}

export async function fetchUsuariosEmpresa(client: any, companyId: string) {
  const { data, error } = await client
    .from('users')
    .select('id, nome_completo, email, user_types(name)')
    .eq('company_id', companyId)
    .eq('uso_individual', false)
    .eq('active', true)
    .order('nome_completo', { ascending: true });
  if (error) throw error;
  return data || [];
}


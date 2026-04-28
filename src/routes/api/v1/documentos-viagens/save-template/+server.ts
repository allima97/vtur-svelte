import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

type TemplateField = {
  key: string;
  label: string;
  type: 'text' | 'date' | 'signature';
};

function clampText(value: unknown, max = 120_000) {
  const s = String(value ?? '');
  return s.length <= max ? s : s.slice(0, max);
}

function normalizeTitle(value: unknown) {
  return clampText(value, 160).trim().replace(/\s+/g, ' ');
}

function normalizeFields(raw: unknown): TemplateField[] {
  if (!Array.isArray(raw)) return [];
  const out: TemplateField[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const key = String((item as any)?.key || '')
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 64);
    if (!key || seen.has(key)) continue;
    const typeRaw = String((item as any)?.type || 'text');
    const type: TemplateField['type'] = typeRaw === 'date' || typeRaw === 'signature' ? typeRaw : 'text';
    const label = String((item as any)?.label || key).trim().replace(/\s+/g, ' ').slice(0, 80);
    seen.add(key);
    out.push({ key, label: label || key, type });
  }
  return out.slice(0, 80);
}

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_documentos_viagens', 'documentos_viagens', 'operacao'], 3, 'Sem permissao para editar documentos.');
    }

    const body = await event.request.json();
    const id = String(body?.id || '').trim();
    if (!isUuid(id)) return json({ error: 'id invalido.' }, { status: 400 });

    const title = normalizeTitle(body?.title);
    const templateText = clampText(body?.template_text, 200_000);
    const templateFields = normalizeFields(body?.template_fields);

    if (!title) return json({ error: 'title obrigatorio.' }, { status: 400 });
    if (!templateText.trim()) return json({ error: 'template_text obrigatorio.' }, { status: 400 });

    const { data, error } = await client
      .from('documentos_viagens')
      .update({
        title,
        template_text: templateText,
        template_fields: templateFields as any,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', id)
      .select('id, file_name, display_name, title, template_text, template_fields, storage_bucket, storage_path, mime_type, size_bytes, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'Documento nao encontrado.' }, { status: 404 });

    return json({ ok: true, doc: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar modelo.');
  }
}

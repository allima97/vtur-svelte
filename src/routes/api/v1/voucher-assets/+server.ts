import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const VOUCHER_ASSET_BUCKET = 'voucher-assets';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function canAccessVoucherAssets(scope: any, level: number) {
  if (scope.isAdmin) return true;
  ensureModuloAccess(scope, ['parametros', 'vouchers', 'operacao'], level, 'Sem acesso a Voucher Assets.');
  return true;
}

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  return String(value || '').trim();
}

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeBoolean(value: FormDataEntryValue | string | null | undefined, fallback = true) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'on', 'yes', 'sim'].includes(normalized);
}

function normalizeOrder(value: FormDataEntryValue | string | null | undefined) {
  const parsed = Number.parseInt(normalizeText(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateProvider(provider: string) {
  if (!['cvc', 'special_tours', 'europamundo', 'generic'].includes(provider)) {
    throw new Error('Provider inválido para voucher asset.');
  }
  return provider;
}

function validateAssetKind(assetKind: string) {
  if (!['logo', 'image', 'app_icon'].includes(assetKind)) {
    throw new Error('Tipo de asset inválido para voucher asset.');
  }
  return assetKind;
}

function buildStoragePath(params: {
  companyId: string;
  provider: string;
  assetKind: string;
  fileName: string;
}) {
  const extension = params.fileName.split('.').pop()?.toLowerCase() || 'bin';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'bin';
  return `${params.companyId}/${params.provider}/${params.assetKind}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
}

async function withPreviewUrl(client: any, asset: any) {
  try {
    const { data: signed } = await client.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, 3600);
    return { ...asset, preview_url: signed?.signedUrl || null };
  } catch {
    return { ...asset, preview_url: null };
  }
}

async function resolveTargetCompanyId(scope: any, requestedCompanyId?: string | null) {
  const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
  if (companyIds.length === 1) return companyIds[0];

  const normalizedRequested = normalizeText(requestedCompanyId);
  if (normalizedRequested && companyIds.includes(normalizedRequested)) {
    return normalizedRequested;
  }

  if (normalizedRequested && scope.isAdmin) {
    return normalizedRequested;
  }

  throw new Error('Selecione uma empresa válida para o voucher asset.');
}

function validateFile(file: File | null, required = true) {
  if (!file || file.size <= 0) {
    if (required) throw new Error('Arquivo é obrigatório.');
    return null;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Use JPG, PNG, WebP ou SVG.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 8MB.');
  }

  return file;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    canAccessVoucherAssets(scope, 1);

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));

    let query = client
      .from('voucher_assets')
      .select('id, company_id, provider, asset_kind, label, storage_bucket, storage_path, mime_type, size_bytes, ativo, ordem, created_at, updated_at')
      .order('asset_kind')
      .order('ordem');

    if (companyIds.length > 0) query = query.in('company_id', companyIds);

    const { data, error } = await query;
    if (error) throw error;

    // Gera URLs assinadas para preview
    const withUrls = await Promise.all((data || []).map((asset: any) => withPreviewUrl(client, asset)));

    return json({ success: true, items: withUrls });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar voucher assets.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    canAccessVoucherAssets(scope, 2);

    const formData = await event.request.formData();
    const provider = validateProvider(normalizeText(formData.get('provider')));
    const assetKind = validateAssetKind(normalizeText(formData.get('asset_kind')));
    const label = normalizeOptionalText(formData.get('label'));
    const ordem = normalizeOrder(formData.get('ordem'));
    const ativo = normalizeBoolean(formData.get('ativo'), true);
    const companyId = await resolveTargetCompanyId(scope, normalizeText(formData.get('company_id')));
    const file = validateFile(formData.get('file') as File | null, true);
    if (!file) {
      throw new Error('Arquivo é obrigatório.');
    }

    const storagePath = buildStoragePath({
      companyId,
      provider,
      assetKind,
      fileName: file.name
    });

    const { error: uploadError } = await client.storage
      .from(VOUCHER_ASSET_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data, error } = await client
      .from('voucher_assets')
      .insert({
        company_id: companyId,
        created_by: user.id,
        updated_by: user.id,
        provider,
        asset_kind: assetKind,
        label,
        storage_bucket: VOUCHER_ASSET_BUCKET,
        storage_path: storagePath,
        mime_type: file.type || null,
        size_bytes: file.size || null,
        ativo,
        ordem
      })
      .select('id, company_id, provider, asset_kind, label, storage_bucket, storage_path, mime_type, size_bytes, ativo, ordem, created_at, updated_at')
      .single();

    if (error) {
      await client.storage.from(VOUCHER_ASSET_BUCKET).remove([storagePath]).catch(() => undefined);
      throw error;
    }

    return json({ success: true, item: await withPreviewUrl(client, data) });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao criar voucher asset.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    canAccessVoucherAssets(scope, 2);

    const formData = await event.request.formData();
    const id = normalizeText(formData.get('id'));
    if (!id) {
      return json({ success: false, error: 'ID do asset é obrigatório.' }, { status: 400 });
    }

    let assetQuery = client
      .from('voucher_assets')
      .select('id, company_id, provider, asset_kind, label, storage_bucket, storage_path, mime_type, size_bytes, ativo, ordem, created_at, updated_at')
      .eq('id', id);

    const scopedCompanyIds = resolveScopedCompanyIds(scope, normalizeText(formData.get('company_id')));
    if (!scope.isAdmin || scopedCompanyIds.length > 0) {
      assetQuery = assetQuery.in('company_id', scopedCompanyIds);
    }

    const { data: existing, error: existingError } = await assetQuery.maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return json({ success: false, error: 'Voucher asset não encontrado.' }, { status: 404 });
    }

    const provider = validateProvider(normalizeText(formData.get('provider')) || existing.provider);
    const assetKind = validateAssetKind(normalizeText(formData.get('asset_kind')) || existing.asset_kind);
    const label = formData.has('label') ? normalizeOptionalText(formData.get('label')) : existing.label;
    const ordem = formData.has('ordem') ? normalizeOrder(formData.get('ordem')) : existing.ordem || 0;
    const ativo = formData.has('ativo') ? normalizeBoolean(formData.get('ativo'), Boolean(existing.ativo)) : Boolean(existing.ativo);
    const file = validateFile(formData.get('file') as File | null, false);

    let nextStoragePath = existing.storage_path;
    let nextMimeType = existing.mime_type;
    let nextSizeBytes = existing.size_bytes;

    if (file) {
      nextStoragePath = buildStoragePath({
        companyId: existing.company_id,
        provider,
        assetKind,
        fileName: file.name
      });

      const { error: uploadError } = await client.storage
        .from(VOUCHER_ASSET_BUCKET)
        .upload(nextStoragePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      nextMimeType = file.type || null;
      nextSizeBytes = file.size || null;
    }

    const { data: updated, error: updateError } = await client
      .from('voucher_assets')
      .update({
        provider,
        asset_kind: assetKind,
        label,
        storage_bucket: existing.storage_bucket,
        storage_path: nextStoragePath,
        mime_type: nextMimeType,
        size_bytes: nextSizeBytes,
        ativo,
        ordem,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select('id, company_id, provider, asset_kind, label, storage_bucket, storage_path, mime_type, size_bytes, ativo, ordem, created_at, updated_at')
      .single();

    if (updateError) {
      if (file) {
        await client.storage.from(VOUCHER_ASSET_BUCKET).remove([nextStoragePath]).catch(() => undefined);
      }
      throw updateError;
    }

    if (file && existing.storage_path && existing.storage_path !== nextStoragePath) {
      await client.storage.from(existing.storage_bucket).remove([existing.storage_path]).catch(() => undefined);
    }

    return json({ success: true, item: await withPreviewUrl(client, updated) });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao atualizar voucher asset.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    canAccessVoucherAssets(scope, 3);

    const id = normalizeText(event.url.searchParams.get('id'));
    const requestedCompanyId = normalizeText(event.url.searchParams.get('company_id'));
    if (!id) {
      return json({ success: false, error: 'ID do asset é obrigatório.' }, { status: 400 });
    }

    let assetQuery = client
      .from('voucher_assets')
      .select('id, company_id, storage_bucket, storage_path')
      .eq('id', id);

    const scopedCompanyIds = resolveScopedCompanyIds(scope, requestedCompanyId);
    if (!scope.isAdmin || scopedCompanyIds.length > 0) {
      assetQuery = assetQuery.in('company_id', scopedCompanyIds);
    }

    const { data: existing, error: existingError } = await assetQuery.maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return json({ success: false, error: 'Voucher asset não encontrado.' }, { status: 404 });
    }

    const { error: deleteError } = await client.from('voucher_assets').delete().eq('id', existing.id);
    if (deleteError) throw deleteError;

    if (existing.storage_bucket && existing.storage_path) {
      await client.storage.from(existing.storage_bucket).remove([existing.storage_path]).catch(() => undefined);
    }

    return json({ success: true, id: existing.id });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao excluir voucher asset.');
  }
}

import { env as publicEnv } from '$env/dynamic/public';

const THEME_BUCKET = 'message-template-themes';

export type ThemeAssetMeta = {
  nome?: string | null;
  asset_url?: string | null;
  storage_path?: string | null;
  width_px?: number | null;
  height_px?: number | null;
};

function cleanStoragePath(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\/message-template-themes\//, '')
    .replace(/^message-template-themes\//, '');
}

function buildSupabaseStorageUrl(path?: string | null) {
  const storagePath = cleanStoragePath(path);
  const supabaseUrl = String(publicEnv.PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!storagePath || !supabaseUrl) return '';
  return `${supabaseUrl}/storage/v1/object/public/${THEME_BUCKET}/${storagePath}`;
}

function resolveAssetUrl(theme?: ThemeAssetMeta | null) {
  const rawAssetUrl = String(theme?.asset_url || '').trim();
  const storagePath = String(theme?.storage_path || '').trim();
  const assetLooksLikeStoredPath =
    rawAssetUrl &&
    !/^https?:\/\//i.test(rawAssetUrl) &&
    !rawAssetUrl.startsWith('/') &&
    !rawAssetUrl.startsWith('data:');

  const storageUrl = buildSupabaseStorageUrl(storagePath || (assetLooksLikeStoredPath ? rawAssetUrl : ''));
  const isLegacySupabaseStorageUrl = /\/storage\/v1\/object\/public\/message-template-themes\//i.test(rawAssetUrl);
  if (storageUrl && (isLegacySupabaseStorageUrl || assetLooksLikeStoredPath || !rawAssetUrl)) return storageUrl;
  return rawAssetUrl;
}

export function resolveThemeAssetMeta(theme?: ThemeAssetMeta | null) {
  return {
    asset_url: resolveAssetUrl(theme),
    width_px: Number(theme?.width_px || 0),
    height_px: Number(theme?.height_px || 0),
  };
}

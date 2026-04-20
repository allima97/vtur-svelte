import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["vouchers", "operacao"], 1, "Sem acesso a Voucher Assets.");
    }
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("company_id"));
    let query = client.from("voucher_assets").select("id, company_id, provider, asset_kind, label, storage_bucket, storage_path, mime_type, size_bytes, ativo, ordem, created_at, updated_at").order("asset_kind").order("ordem");
    if (companyIds.length > 0) query = query.in("company_id", companyIds);
    const { data, error } = await query;
    if (error) throw error;
    const withUrls = await Promise.all(
      (data || []).map(async (asset) => {
        try {
          const { data: signed } = await client.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_path, 3600);
          return { ...asset, preview_url: signed?.signedUrl || null };
        } catch {
          return { ...asset, preview_url: null };
        }
      })
    );
    return json({ success: true, items: withUrls });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar voucher assets.");
  }
}
export {
  GET
};

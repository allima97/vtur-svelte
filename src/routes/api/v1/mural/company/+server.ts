import {
  assertCompanyAccess,
  fetchRecados,
  fetchUsuariosEmpresa,
  noStoreTextResponse,
  privateJsonResponse,
  requireMuralScope
} from '../_shared';
import { logServerError } from '$lib/server/v1';

export async function GET(event) {
  try {
    const companyId = String(event.url.searchParams.get('company_id') || '').trim();
    if (!companyId) return noStoreTextResponse('company_id obrigatorio.', 400);

    const { client, scope } = await requireMuralScope(event);
    const denied = await assertCompanyAccess(client, scope, companyId);
    if (denied) return denied;

    const [usuariosEmpresa, recadosResp] = await Promise.all([fetchUsuariosEmpresa(client, companyId), fetchRecados(client, companyId)]);

    return privateJsonResponse({
      usuariosEmpresa,
      recados: recadosResp.recados,
      supportsAttachments: recadosResp.supportsAttachments
    });
  } catch (e: any) {
    logServerError('[mural/company] falha ao carregar mural', e);
    return noStoreTextResponse('Erro ao carregar mural.', 500);
  }
}

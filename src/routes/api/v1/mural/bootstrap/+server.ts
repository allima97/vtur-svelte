import { readCache, requireMuralScope, writeCache, fetchRecados, fetchUsuariosEmpresa } from '../_shared';

export async function GET(event) {
  try {
    const { client, user, scope } = await requireMuralScope(event);
    const queryCompanyId = String(event.url.searchParams.get('company_id') || '').trim();

    let empresas: Array<{ id: string; nome_fantasia: string; status: string }> = [];
    let selectedCompanyId = String(scope.companyId || '').trim();

    if (scope.isMaster) {
      const { data: vinculos, error } = await client
        .from('master_empresas')
        .select('company_id, status, companies(id, nome_fantasia)')
        .eq('master_id', user.id);
      if (error) throw error;

      empresas = (vinculos || [])
        .map((v: any) => ({
          id: String(v?.companies?.id || v?.company_id || ''),
          nome_fantasia: String(v?.companies?.nome_fantasia || 'Empresa'),
          status: String(v?.status || 'pending')
        }))
        .filter((e: any) => e.id && e.status === 'approved');

      const approvedIds = new Set(empresas.map((e) => e.id));
      if (queryCompanyId && approvedIds.has(queryCompanyId)) {
        selectedCompanyId = queryCompanyId;
      } else if (!selectedCompanyId || !approvedIds.has(selectedCompanyId)) {
        selectedCompanyId = empresas[0]?.id || '';
      }
    }

    const cacheKey = ['v1', 'muralBootstrap', user.id, selectedCompanyId].join('|');
    const cached = readCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=5', Vary: 'Cookie' }
      });
    }

    let usuariosEmpresa: any[] = [];
    let recados: any[] = [];
    let supportsAttachments = true;

    if (selectedCompanyId) {
      const [usuarios, recadosResp] = await Promise.all([
        fetchUsuariosEmpresa(client, selectedCompanyId),
        fetchRecados(client, selectedCompanyId)
      ]);
      usuariosEmpresa = usuarios;
      recados = recadosResp.recados;
      supportsAttachments = recadosResp.supportsAttachments;
    }

    const payload = {
      userId: user.id,
      userTypeName: scope.tipoNome,
      companyId: selectedCompanyId || null,
      empresas,
      usuariosEmpresa,
      recados,
      supportsAttachments
    };

    writeCache(cacheKey, payload, 5_000);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=5', Vary: 'Cookie' }
    });
  } catch (e: any) {
    console.error('Erro mural bootstrap:', e);
    return new Response('Erro ao carregar mural.', { status: 500 });
  }
}


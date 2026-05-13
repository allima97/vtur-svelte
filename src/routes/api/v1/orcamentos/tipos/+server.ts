import { json, type RequestEvent } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS } from '$lib/server/httpCache';
import {
  buildReadModelCacheKey,
  getCachedReadModel,
  READ_MODEL_TAGS
} from '$lib/server/readModelCache';

type OrcamentoTipoProdutoRow = {
  id?: string | null;
  nome?: string | null;
  tipo?: string | null;
};

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        scope.isFinanceiro ? ['orcamentos'] : ['orcamentos', 'vendas'],
        1,
        'Sem acesso a Orcamentos.'
      );
    }

    const data = await getCachedReadModel<OrcamentoTipoProdutoRow[]>({
      key: buildReadModelCacheKey('orcamentos:tipos-produtos', {}),
      tags: [READ_MODEL_TAGS.catalog],
      ttlMs: 60_000,
      staleTtlMs: 300_000,
      loader: async () => {
        const { data, error } = await client
          .from('tipo_produtos')
          .select('id, nome, tipo')
          .order('nome', { ascending: true })
          .limit(500);
        if (error) throw error;
        return (data || []) as OrcamentoTipoProdutoRow[];
      }
    });

    return json(data, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar tipos.');
  }
}

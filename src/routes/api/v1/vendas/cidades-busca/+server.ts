import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  const intVal = Math.trunc(parsed);
  if (intVal <= 0) return 20;
  return Math.min(50, intVal);
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mapCidade(row: any) {
  const nome = String(row?.nome || '').trim();
  const subdivisaoNome = String(row?.subdivisao_nome || '').trim();
  const subdivisao = Array.isArray(row?.subdivisao) ? row.subdivisao[0] : row?.subdivisao;
  const subdivisaoSigla = String(subdivisao?.codigo_admin1 || '').trim();
  const subdivisaoLabel = subdivisaoNome || subdivisaoSigla || String(subdivisao?.nome || '').trim();
  const paisNome = String(row?.pais_nome || '').trim();

  return {
    id: String(row?.id || ''),
    nome,
    subdivisao_nome: subdivisaoNome || null,
    pais_nome: paisNome || null,
    estado: subdivisaoLabel || null,
    label: subdivisaoLabel ? `${nome} (${subdivisaoLabel})` : nome
  };
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ['vendas_consulta', 'vendas', 'vendas_cadastro', 'vendas_importar'],
        1,
        'Sem acesso a Vendas.'
      );
    }

    const cidadeId = String(event.url.searchParams.get('id') || '').trim();
    const query = String(event.url.searchParams.get('q') || event.url.searchParams.get('search') || '').trim();
    const limite = parseLimit(event.url.searchParams.get('limite'));

    if (cidadeId) {
      let data: any = null;
      const detailed = await client
        .from('cidades')
        .select('id, nome, subdivisao:subdivisoes(nome, codigo_admin1)')
        .eq('id', cidadeId)
        .maybeSingle();

      if (detailed.error) {
        const fallback = await client.from('cidades').select('id, nome').eq('id', cidadeId).maybeSingle();
        if (fallback.error) throw fallback.error;
        data = fallback.data;
      } else {
        data = detailed.data;
      }

      if (!data) return json(null);

      return json(mapCidade(data));
    }

    if (query.length < 2) {
      return json([]);
    }

    let rows: any[] = [];

    try {
      const { data, error } = await client.rpc('buscar_cidades', { q: query, limite });
      if (error) throw error;
      rows = Array.isArray(data) ? data : [];
    } catch {
      const fallbackWithSubdivisao = await client
        .from('cidades')
        .select('id, nome, subdivisao:subdivisoes(nome, codigo_admin1)')
        .ilike('nome', `%${query}%`)
        .order('nome', { ascending: true })
        .limit(limite);

      if (fallbackWithSubdivisao.error) {
        const fallbackBase = await client
          .from('cidades')
          .select('id, nome')
          .ilike('nome', `%${query}%`)
          .order('nome', { ascending: true })
          .limit(limite);
        if (fallbackBase.error) throw fallbackBase.error;
        rows = fallbackBase.data || [];
      } else {
        rows = fallbackWithSubdivisao.data || [];
      }
    }

    if (!rows.length) return json([]);

    const normalizedQuery = normalizeText(query);
    const dedup = new Map<string, ReturnType<typeof mapCidade>>();

    rows.forEach((row) => {
      const mapped = mapCidade(row);
      if (!mapped.id || !mapped.nome) return;
      if (!dedup.has(mapped.id)) {
        dedup.set(mapped.id, mapped);
      }
    });

    const filtered = Array.from(dedup.values())
      .filter((item) => normalizeText(`${item.nome} ${item.subdivisao_nome || ''} ${item.pais_nome || ''}`).includes(normalizedQuery))
      .slice(0, limite);

    return json(filtered);
  } catch (err) {
    return toErrorResponse(err, 'Erro ao buscar cidades.');
  }
}

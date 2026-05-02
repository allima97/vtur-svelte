import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  fetchVendedorIdsByCompanyIds,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { monthRangeFromKey } from '$lib/date';

function normalizePeriod(value: unknown) {
  const raw = String(value || '').trim();
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
  return '';
}

function normalizeDate(value: unknown) {
  const raw = String(value || '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(raw) ? raw : '';
}

function normalizeTime(value: unknown) {
  const raw = String(value || '').trim();
  return /^\d{2}:\d{2}/.test(raw) ? raw.slice(0, 5) : null;
}

async function fetchFeriadosNacionais(ano: number, periodo: string) {
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) return [];

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (Array.isArray(data) ? data : [])
      .map((item: any) => ({
        id: `nacional-${String(item?.date || '').trim()}`,
        data: String(item?.date || '').trim(),
        nome: String(item?.name || '').trim(),
        tipo: 'nacional'
      }))
      .filter((item) => item.data.startsWith(periodo) && item.nome);
  } catch (err) {
    console.warn('[parametros/escalas] falha ao carregar feriados nacionais', err);
    return [];
  }
}

async function resolveEquipeIds(client: any, scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (scope.isGestor) {
    return fetchGestorEquipeIdsComGestor(client, scope.userId);
  }

  if (scope.isMaster || scope.isAdmin) {
    if (scope.isAdmin) {
      const { data } = await client.from('users').select('id').eq('active', true).limit(1000);
      return (data || []).map((u: any) => String(u?.id || '')).filter(Boolean);
    }

    return fetchVendedorIdsByCompanyIds(client, scope.companyIds);
  }

  if (scope.companyIds.length > 0) {
    const { data } = await client
      .from('users')
      .select('id')
      .eq('active', true)
      .in('company_id', scope.companyIds)
      .limit(500);
    return (data || []).map((u: any) => String(u?.id || '')).filter(Boolean);
  }

  return [scope.userId];
}

async function ensureEscalaMes(client: any, scope: Awaited<ReturnType<typeof resolveUserScope>>, periodo: string) {
  const periodoFull = normalizePeriod(periodo);
  if (!periodoFull) throw new Error('Período inválido.');

  const companyId = scope.companyId || scope.companyIds[0] || null;
  if (!companyId) throw new Error('Empresa não definida para a escala.');

  let gestorId = scope.userId;
  if (scope.isGestor) {
    try {
      const { data } = await client.rpc('gestor_equipe_base_id', { uid: scope.userId });
      if (isUuid(String(data || ''))) gestorId = String(data);
    } catch {
      gestorId = scope.userId;
    }
  }

  const { data: existing, error: existingError } = await client
    .from('escala_mes')
    .select('id')
    .eq('company_id', companyId)
    .eq('gestor_id', gestorId)
    .eq('periodo', periodoFull)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return String(existing.id);

  const { data: inserted, error: insertError } = await client
    .from('escala_mes')
    .insert({ company_id: companyId, gestor_id: gestorId, periodo: periodoFull, status: 'rascunho' })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return String(inserted?.id || '');
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    // Vendedor pode visualizar escala (incluindo equipe) em modo leitura.
    // Edicao continua bloqueada no POST.
    if (!scope.isAdmin && !scope.isVendedor) {
      ensureModuloAccess(scope, ['parametros_escalas', 'escalas', 'parametros'], 1, 'Sem acesso a Escalas.');
    }

    const { searchParams } = event.url;
    const periodo = String(searchParams.get('periodo') || '').trim(); // YYYY-MM
    const periodoRange = monthRangeFromKey(periodo);

    const equipeIds = await resolveEquipeIds(client, scope);

    // Busca escala_mes
    let mesQuery = client
      .from('escala_mes')
      .select('id, periodo, status, company_id')
      .order('periodo', { ascending: false })
      .limit(24);

    if (!scope.isAdmin) {
      if (scope.companyIds.length > 0) mesQuery = mesQuery.in('company_id', scope.companyIds);
      else if (scope.companyId) mesQuery = mesQuery.eq('company_id', scope.companyId);
    }
    if (periodo) mesQuery = mesQuery.eq('periodo', periodo + '-01');

    const { data: meses, error: mesError } = await mesQuery;
    if (mesError) {
      // Tabelas de escala podem não existir
      if (String(mesError.code || '').includes('42P01') || String(mesError.message || '').includes('does not exist')) {
        return json({ meses: [], dias: [], usuarios: [], feriados: [] });
      }
      throw mesError;
    }

    // Busca dias da escala para o período selecionado
    let dias: any[] = [];
    if (periodo && meses && meses.length > 0) {
      const mesIds = meses.map((m: any) => m.id);
      let diasQuery = client
        .from('escala_dia')
        .select('id, escala_mes_id, usuario_id, data, tipo, hora_inicio, hora_fim, observacao, usuario:users!usuario_id(id, nome_completo)')
        .in('escala_mes_id', mesIds)
        .order('data');

      if (equipeIds.length > 0) diasQuery = diasQuery.in('usuario_id', equipeIds);
      const { data: diasData } = await diasQuery.limit(2000);
      dias = diasData || [];
    }

    // Busca usuários da equipe
    let usuarios: any[] = [];
    if (equipeIds.length > 0) {
      const { data: usersData } = await client
        .from('users')
        .select('id, nome_completo, email')
        .in('id', equipeIds)
        .eq('active', true)
        .order('nome_completo')
        .limit(100);
      usuarios = usersData || [];
    }

    // Feriados nacionais + locais do mês
    const anoFeriados = Number(periodo.slice(0, 4));
    const feriadosNacionais = periodoRange ? await fetchFeriadosNacionais(anoFeriados, periodo) : [];
    let feriadosQuery = client
      .from('feriados')
      .select('id, data, nome, tipo')
      .order('data')
      .limit(100);
    if (periodoRange) {
      feriadosQuery = feriadosQuery
        .gte('data', periodoRange.inicio)
        .lte('data', periodoRange.fim);
    }
    if (!scope.isAdmin) {
      if (scope.companyIds.length > 0) feriadosQuery = feriadosQuery.in('company_id', scope.companyIds);
      else if (scope.companyId) feriadosQuery = feriadosQuery.eq('company_id', scope.companyId);
    }
    const { data: feriadosLocais } = await feriadosQuery;
    const feriados = [...feriadosNacionais, ...(feriadosLocais || [])];

    // Busca horarios do usuario logado
    let horariosUsuario: any[] = [];
    if (equipeIds.length > 0) {
      const { data: horariosData } = await client
        .from('escala_horario_usuario')
        .select('*')
        .in('usuario_id', equipeIds)
        .limit(500);
      horariosUsuario = horariosData || [];
    }

    return json({
      meses: meses || [],
      dias,
      usuarios,
      feriados: feriados || [],
      horariosUsuario
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar escalas.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_escalas', 'escalas', 'parametros'], 2, 'Sem permissão para salvar escalas.');
    }

    const body = await event.request.json();
    const { action } = body;

    if (action === 'upsert_dia') {
      const { escala_mes_id, usuario_id, data, tipo, hora_inicio, hora_fim, observacao } = body;

      if (!isUuid(escala_mes_id) || !isUuid(usuario_id) || !data) {
        return json({ error: 'Dados inválidos.' }, { status: 400 });
      }

      const equipeIds = await resolveEquipeIds(client, scope);
      if (!scope.isAdmin && !equipeIds.includes(usuario_id)) {
        return json({ error: 'Usuário fora do seu escopo.' }, { status: 403 });
      }

      const payload = {
        escala_mes_id,
        usuario_id,
        data: normalizeDate(data),
        tipo: String(tipo || '').trim() || null,
        hora_inicio: normalizeTime(hora_inicio),
        hora_fim: normalizeTime(hora_fim),
        observacao: String(observacao || '').trim() || null
      };

      // Verifica se já existe
      const { data: existing } = await client
        .from('escala_dia')
        .select('id')
        .eq('escala_mes_id', escala_mes_id)
        .eq('usuario_id', usuario_id)
        .eq('data', data)
        .maybeSingle();

      if (existing?.id) {
        if (!tipo) {
          // Remove o registro se tipo vazio
          await client.from('escala_dia').delete().eq('id', existing.id);
        } else {
          await client.from('escala_dia').update(payload).eq('id', existing.id);
        }
      } else if (tipo) {
        await client.from('escala_dia').insert(payload);
      }

      return json({ ok: true });
    }

    if (action === 'apply_batch') {
      const usuarioId = String(body.usuario_id || '').trim();
      const datas: string[] = Array.from(
        new Set((body.datas || []).map((data: unknown) => normalizeDate(data)).filter(Boolean))
      ) as string[];
      const tipo = String(body.tipo || '').trim() || null;
      const horaInicio = normalizeTime(body.hora_inicio);
      const horaFim = normalizeTime(body.hora_fim);
      const observacao = String(body.observacao || '').trim() || null;

      if (!isUuid(usuarioId) || datas.length === 0) {
        return json({ error: 'Seleção inválida.' }, { status: 400 });
      }

      const equipeIds = await resolveEquipeIds(client, scope);
      if (!scope.isAdmin && !equipeIds.includes(usuarioId)) {
        return json({ error: 'Usuário fora do seu escopo.' }, { status: 403 });
      }

      const periodo = normalizePeriod(body.periodo || datas[0]?.slice(0, 7));
      if (!periodo) return json({ error: 'Período inválido.' }, { status: 400 });

      const escalaMesId = String(body.escala_mes_id || '').trim();
      const mesId = isUuid(escalaMesId) ? escalaMesId : await ensureEscalaMes(client, scope, periodo);

      if (!tipo) {
        const { error: deleteError } = await client
          .from('escala_dia')
          .delete()
          .eq('escala_mes_id', mesId)
          .eq('usuario_id', usuarioId)
          .in('data', datas);
        if (deleteError) throw deleteError;
        return json({ ok: true, removed: datas.length, id: mesId });
      }

      const rows = datas.map((data) => ({
        escala_mes_id: mesId,
        usuario_id: usuarioId,
        data,
        tipo,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        observacao
      }));

      const { data: saved, error: upsertError } = await client
        .from('escala_dia')
        .upsert(rows, { onConflict: 'escala_mes_id,usuario_id,data' })
        .select('id, escala_mes_id, usuario_id, data, tipo, hora_inicio, hora_fim, observacao');
      if (upsertError) throw upsertError;

      return json({ ok: true, id: mesId, items: saved || [] });
    }

    if (action === 'ensure_mes') {
      const { periodo } = body; // YYYY-MM
      if (!periodo) return json({ error: 'Período inválido.' }, { status: 400 });

      const id = await ensureEscalaMes(client, scope, periodo);
      return json({ ok: true, id });
    }

    if (action === 'upsert_horario_usuario') {
      const horario = body.horario || {};
      const payload = {
        company_id: scope.companyId || null,
        usuario_id: scope.userId,
        seg_inicio: horario.seg_inicio || null,
        seg_fim: horario.seg_fim || null,
        ter_inicio: horario.ter_inicio || null,
        ter_fim: horario.ter_fim || null,
        qua_inicio: horario.qua_inicio || null,
        qua_fim: horario.qua_fim || null,
        qui_inicio: horario.qui_inicio || null,
        qui_fim: horario.qui_fim || null,
        sex_inicio: horario.sex_inicio || null,
        sex_fim: horario.sex_fim || null,
        sab_inicio: horario.sab_inicio || null,
        sab_fim: horario.sab_fim || null,
        dom_inicio: horario.dom_inicio || null,
        dom_fim: horario.dom_fim || null,
        feriado_inicio: horario.feriado_inicio || null,
        feriado_fim: horario.feriado_fim || null,
        auto_aplicar: Boolean(horario.auto_aplicar || false)
      };

      // Verifica se ja existe
      const { data: existing } = await client
        .from('escala_horario_usuario')
        .select('id')
        .eq('usuario_id', scope.userId)
        .maybeSingle();

      if (existing?.id) {
        await client.from('escala_horario_usuario').update(payload).eq('id', existing.id);
        return json({ ok: true, id: existing.id });
      } else {
        const { data: inserted, error: insertError } = await client
          .from('escala_horario_usuario')
          .insert(payload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        return json({ ok: true, id: inserted?.id });
      }
    }

    return json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar escala.');
  }
}

import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  fetchGestorEquipeIdsComGestor,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

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

    // Resolve equipe visivel. Vendedores podem visualizar a escala da equipe,
    // mas continuam sem permissao de edicao no POST.
    let equipeIds: string[] = [];
    if (scope.isGestor) {
      equipeIds = await fetchGestorEquipeIdsComGestor(client, scope.userId);
    } else {
      let usersQuery = client
        .from('users')
        .select('id')
        .eq('active', true)
        .limit(500);

      if (!scope.isAdmin) {
        if (scope.companyIds.length > 0) usersQuery = usersQuery.in('company_id', scope.companyIds);
        else if (scope.companyId) usersQuery = usersQuery.eq('company_id', scope.companyId);
      }

      const { data: usersData } = await usersQuery;
      equipeIds = (usersData || []).map((u: any) => u.id);
    }

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

    // Feriados customizados
    let feriadosQuery = client
      .from('feriados')
      .select('id, data, nome, tipo')
      .order('data')
      .limit(100);
    if (!scope.isAdmin) {
      if (scope.companyIds.length > 0) feriadosQuery = feriadosQuery.in('company_id', scope.companyIds);
      else if (scope.companyId) feriadosQuery = feriadosQuery.eq('company_id', scope.companyId);
    }
    const { data: feriados } = await feriadosQuery;

    // Busca horarios do usuario logado
    let horariosUsuario: any[] = [];
    const { data: horariosData } = await client
      .from('escala_horario_usuario')
      .select('*')
      .eq('usuario_id', scope.userId)
      .maybeSingle();
    if (horariosData) {
      horariosUsuario = [horariosData];
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

      const payload = {
        escala_mes_id,
        usuario_id,
        data,
        tipo: String(tipo || '').trim() || null,
        hora_inicio: String(hora_inicio || '').trim() || null,
        hora_fim: String(hora_fim || '').trim() || null,
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

    if (action === 'ensure_mes') {
      const { periodo } = body; // YYYY-MM
      if (!periodo) return json({ error: 'Período inválido.' }, { status: 400 });

      const periodoFull = periodo.length === 7 ? `${periodo}-01` : periodo;

      const { data: existing } = await client
        .from('escala_mes')
        .select('id')
        .eq('company_id', scope.companyId || '')
        .eq('periodo', periodoFull)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error: insertError } = await client
          .from('escala_mes')
          .insert({ company_id: scope.companyId, gestor_id: scope.userId, periodo: periodoFull, status: 'rascunho' })
          .select('id')
          .single();
        if (insertError) throw insertError;
        return json({ ok: true, id: inserted?.id });
      }

      return json({ ok: true, id: existing.id });
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

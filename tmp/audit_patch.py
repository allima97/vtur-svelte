import sys
root = sys.argv[1] + '/src/lib/server/api/routes/'
IMPORT = "import { registrarLog } from '$lib/server/auditLog';\n"

def patch(rel, pairs, add_import=True):
    p = root + rel
    raw = open(p, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for a, b in pairs:
        n = s.count(a)
        assert n == 1, (rel, n, a[:70])
        s = s.replace(a, b)
    if add_import:
        assert IMPORT not in s
        lines = s.split('\n')
        i = next(k for k, l in enumerate(lines) if l.startswith('import '))
        lines.insert(i, IMPORT.rstrip('\n'))
        s = '\n'.join(lines)
    if crlf:
        s = s.replace('\n', '\r\n')
    open(p, 'wb').write(s.encode('utf-8'))

# --- Clientes
patch('clientes/create.ts', [(
"""    if (insertError) throw insertError;
""",
"""    if (insertError) throw insertError;

    registrarLog(event, {
      userId: user.id,
      modulo: 'Clientes',
      acao: 'cliente_criado',
      detalhes: { ...payload, created_by: user.id }
    });
""")])
patch('clientes/id.ts', [(
"""    if (updateError) throw updateError;
""",
"""    if (updateError) throw updateError;

    registrarLog(event, { userId: user.id, modulo: 'Clientes', acao: 'cliente_editado', detalhes: { id, payload } });
"""), (
"""    const { error: deleteError } = await client.from('clientes').delete().eq('id', id);
    if (deleteError) throw deleteError;
""",
"""    const { error: deleteError } = await client.from('clientes').delete().eq('id', id);
    if (deleteError) throw deleteError;

    registrarLog(event, { userId: user.id, modulo: 'Clientes', acao: 'cliente_excluido', detalhes: { id } });
""")])

# --- Cadastros (cidades)
patch('cidades/root.ts', [(
"""      const { data, error: updateError } = await client.from('cidades').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
""",
"""      const { data, error: updateError } = await client.from('cidades').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
      registrarLog(event, { userId: user.id, modulo: 'Cadastros', acao: 'cidade_editada', detalhes: { id, payload } });
"""), (
"""      const { data, error: insertError } = await client.from('cidades').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
""",
"""      const { data, error: insertError } = await client.from('cidades').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
      registrarLog(event, { userId: user.id, modulo: 'Cadastros', acao: 'cidade_criada', detalhes: { ...payload } });
"""), (
"""    const { error: deleteError } = await client.from('cidades').delete().eq('id', id);
    if (deleteError) throw deleteError;
""",
"""    const { error: deleteError } = await client.from('cidades').delete().eq('id', id);
    if (deleteError) throw deleteError;
    registrarLog(event, { userId: user.id, modulo: 'Cadastros', acao: 'cidade_excluida', detalhes: { id } });
""")])
patch('cidades/id.ts', [(
"""      .update(updateData)
      .eq('id', cidadeId)
      .select(CIDADE_SELECT_FIELDS)
      .single();

    if (error) throw error;
""",
"""      .update(updateData)
      .eq('id', cidadeId)
      .select(CIDADE_SELECT_FIELDS)
      .single();

    if (error) throw error;
    registrarLog(event, {
      userId: user.id,
      modulo: 'Cadastros',
      acao: 'cidade_editada',
      detalhes: { id: cidadeId, payload: updateData }
    });
"""), (
"""      .delete()
      .eq('id', cidadeId);

    if (error) throw error;
""",
"""      .delete()
      .eq('id', cidadeId);

    if (error) throw error;
    registrarLog(event, { userId: user.id, modulo: 'Cadastros', acao: 'cidade_excluida', detalhes: { id: cidadeId } });
""")])

# --- Parametros
patch('parametros/sistema.ts', [(
"""    const result = await upsertWithFallback(client, payload);
""",
"""    const result = await upsertWithFallback(client, payload);
    {
      // Mesmo formato do histórico: o payload salvo, sem updated_at.
      const { updated_at: _updatedAt, ...detalhes } = payload;
      registrarLog(event, { userId: user.id, modulo: 'Parametros', acao: 'parametros_sistema_salvos', detalhes });
    }
""")])
patch('parametros/orcamentos-pdf.ts', [(
"""      const { error: insertError } = await client.from('quote_print_settings').insert(payload);
      if (insertError) throw insertError;
    }
""",
"""      const { error: insertError } = await client.from('quote_print_settings').insert(payload);
      if (insertError) throw insertError;
    }
    {
      // Mesmo formato do histórico: os campos da configuração, sem dono e empresa.
      const { owner_user_id: _owner, company_id: _company, ...detalhes } = payload;
      registrarLog(event, { userId: user.id, modulo: 'Parametros', acao: 'quote_print_settings_salvos', detalhes });
    }
""")])

# --- Escalas
patch('parametros/escalas.ts', [(
"""      if (existing?.id) {
        if (!tipo) {
          // Remove o registro se tipo vazio
          await client.from('escala_dia').delete().eq('id', existing.id);
        } else {
          await client.from('escala_dia').update(payload).eq('id', existing.id);
        }
      } else if (tipo) {
        await client.from('escala_dia').insert(payload);
      }
""",
"""      let operacao: 'insert' | 'update' | 'delete' | null = null;
      let escalaDiaId: string | null = existing?.id || null;
      if (existing?.id) {
        if (!tipo) {
          // Remove o registro se tipo vazio
          await client.from('escala_dia').delete().eq('id', existing.id);
          operacao = 'delete';
        } else {
          await client.from('escala_dia').update(payload).eq('id', existing.id);
          operacao = 'update';
        }
      } else if (tipo) {
        const { data: inserted } = await client.from('escala_dia').insert(payload).select('id').maybeSingle();
        escalaDiaId = inserted?.id || null;
        operacao = 'insert';
      }

      if (operacao) {
        registrarLog(event, {
          userId: user.id,
          modulo: 'Escalas',
          acao: 'escala_dia_salva',
          detalhes: async () => ({
            ...(await escalaMesAuditInfo(client, escalaMesId)),
            papel: scope.papel || null,
            operacao,
            escala_dia_id: escalaDiaId,
            ...payload
          })
        });
      }
"""), (
"""        if (deleteError) throw deleteError;
        invalidateReadModelCache({ keyPrefix: 'parametros:escalas:' });
        return json({ ok: true, removed: datas.length, id: mesId }, { headers: NO_STORE_HEADERS });
""",
"""        if (deleteError) throw deleteError;
        registrarLog(event, {
          userId: user.id,
          modulo: 'Escalas',
          acao: 'escala_dia_lote_salvo',
          detalhes: async () =>
            escalaLoteAuditDetalhes(client, scope, mesId, usuarioId, datas, tipo, horaInicio, horaFim)
        });
        invalidateReadModelCache({ keyPrefix: 'parametros:escalas:' });
        return json({ ok: true, removed: datas.length, id: mesId }, { headers: NO_STORE_HEADERS });
"""), (
"""      if (upsertError) throw upsertError;

      invalidateReadModelCache({ keyPrefix: 'parametros:escalas:' });
      return json({ ok: true, id: mesId, items: saved || [] }, { headers: NO_STORE_HEADERS });
""",
"""      if (upsertError) throw upsertError;

      registrarLog(event, {
        userId: user.id,
        modulo: 'Escalas',
        acao: 'escala_dia_lote_salvo',
        detalhes: async () =>
          escalaLoteAuditDetalhes(client, scope, mesId, usuarioId, datas, tipo, horaInicio, horaFim)
      });
      invalidateReadModelCache({ keyPrefix: 'parametros:escalas:' });
      return json({ ok: true, id: mesId, items: saved || [] }, { headers: NO_STORE_HEADERS });
"""), (
"""export async function handleParametrosEscalasPost(event: RequestEvent) {""",
"""// Auditoria (mesmo formato do histórico da tabela logs): empresa e gestor vêm do mês da escala.
// Lidos em background, depois da resposta, para não atrasar o salvamento.
async function escalaMesAuditInfo(client: SupabaseClient, escalaMesId: string) {
  const { data } = await client
    .from('escala_mes')
    .select('company_id, gestor_id')
    .eq('id', escalaMesId)
    .maybeSingle();
  const gestorId = (data?.gestor_id as string | null) || null;
  return {
    company_id: (data?.company_id as string | null) || null,
    gestor_id: gestorId,
    gestor_raw_id: gestorId,
    escala_mes_id: escalaMesId
  };
}

async function escalaLoteAuditDetalhes(
  client: SupabaseClient,
  scope: Awaited<ReturnType<typeof resolveUserScope>>,
  escalaMesId: string,
  usuarioId: string,
  datas: string[],
  tipo: string | null,
  horaInicio: string | null,
  horaFim: string | null
) {
  return {
    ...(await escalaMesAuditInfo(client, escalaMesId)),
    papel: scope.papel || null,
    usuario_id: usuarioId,
    datas,
    total: datas.length,
    tipo,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    horario_informado: Boolean(horaInicio || horaFim)
  };
}

export async function handleParametrosEscalasPost(event: RequestEvent) {""")])

# --- Admin
PERM = """    registrarLog(event, {
      userId: user.id,
      modulo: 'Admin',
      acao: 'permissoes_atualizadas',
      detalhes: {
        permissoes: Object.fromEntries(
          (permissions as Array<{ modulo?: unknown; permissao?: unknown }>).map((item) => [
            String(item?.modulo ?? ''),
            String(item?.permissao ?? '')
          ])
        ),
        usuario_alterado_id: userId
      }
    });
"""
patch('admin/permissoes.ts', [(
"""    await saveUserPermissions(client, userId, permissions);
""",
"""    await saveUserPermissions(client, userId, permissions);
""" + PERM), (
"""      await saveSystemModuleSettings(
        client,
        Array.isArray(body.settings) ? body.settings : []
      );
""",
"""      await saveSystemModuleSettings(
        client,
        Array.isArray(body.settings) ? body.settings : []
      );
      registrarLog(event, {
        userId: user.id,
        modulo: 'Admin',
        acao: 'modulos_globais_atualizados',
        detalhes: async () => ({ disabled_modules: await listDisabledModules(client) })
      });
"""), (
"""export async function handleAdminPermissoesPost(event: RequestEvent) {""",
"""// Auditoria: lista completa de módulos desligados depois de salvar (formato do histórico).
async function listDisabledModules(client: ReturnType<typeof getAdminClient>) {
  const { data } = await client.from('system_module_settings').select('module_key').eq('enabled', false);
  return ((data || []) as Array<{ module_key: string | null }>)
    .map((row) => String(row.module_key || ''))
    .filter(Boolean);
}

export async function handleAdminPermissoesPost(event: RequestEvent) {""")])
patch('admin/permissoes-id.ts', [(
"""    await saveUserPermissions(client, userId, permissions);
""",
"""    await saveUserPermissions(client, userId, permissions);
""" + PERM)])
patch('admin/system-modules.ts', [(
"""    return json({ ok: true, disabled: disabledNormalized.map((item) => item.module_key) }, { headers: NO_STORE_HEADERS });""",
"""    registrarLog(event, {
      userId: user.id,
      modulo: 'Admin',
      acao: 'modulos_globais_atualizados',
      detalhes: { disabled_modules: disabledNormalized.map((item) => item.module_key) }
    });

    return json({ ok: true, disabled: disabledNormalized.map((item) => item.module_key) }, { headers: NO_STORE_HEADERS });""")])
patch('admin/modulos-sistema.ts', [(
"""      .upsert(payload, { onConflict: 'module_key' });
    if (upsertError) throw upsertError;
""",
"""      .upsert(payload, { onConflict: 'module_key' });
    if (upsertError) throw upsertError;

    // Auditoria: lista completa de módulos desligados depois de salvar (formato do histórico).
    registrarLog(event, {
      userId: user.id,
      modulo: 'Admin',
      acao: 'modulos_globais_atualizados',
      detalhes: async () => {
        const { data } = await client.from('system_module_settings').select('module_key').eq('enabled', false);
        return {
          disabled_modules: ((data || []) as Array<{ module_key: string | null }>)
            .map((row) => String(row.module_key || ''))
            .filter(Boolean)
        };
      }
    });
""")])

# --- perfil
patch('user/profile.ts', [(
"""    const { error: updateError } = await client.from('users').update(payload).eq('id', user.id);
    if (updateError) throw updateError;
""",
"""    const { error: updateError } = await client.from('users').update(payload).eq('id', user.id);
    if (updateError) throw updateError;

    registrarLog(event, { userId: user.id, modulo: 'perfil', acao: 'perfil_atualizado', detalhes: { ...payload } });
""")])
print('ok')

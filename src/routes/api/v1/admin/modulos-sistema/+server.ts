import { json } from '@sveltejs/kit';
import {
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// Catálogo de módulos do sistema
const MODULOS_CATALOGO = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'vendas_consulta', label: 'Consulta de Vendas' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'orcamentos', label: 'Orçamentos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'comissoes', label: 'Comissões' },
  { key: 'conciliacao', label: 'Conciliação' },
  { key: 'operacao', label: 'Operação' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'viagens', label: 'Viagens' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'cadastros', label: 'Cadastros' },
  { key: 'parametros', label: 'Parâmetros' },
  { key: 'metas', label: 'Metas' },
  { key: 'escalas', label: 'Escalas' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'cambios', label: 'Câmbios' },
  { key: 'controle_sac', label: 'Controle SAC' },
  { key: 'documentos_viagens', label: 'Documentos de Viagens' },
  { key: 'admin', label: 'Administração' },
  { key: 'admin_users', label: 'Admin - Usuários' },
  { key: 'admin_financeiro', label: 'Admin - Financeiro' }
];

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      return json({ error: 'Somente administradores podem acessar módulos do sistema.' }, { status: 403 });
    }

    // Busca módulos desabilitados
    const { data, error: queryError } = await client
      .from('system_module_settings')
      .select('module_key, enabled, reason')
      .limit(200);

    if (queryError) {
      // Tabela pode não existir
      if (String(queryError.code || '').includes('42P01')) {
        return json({ table_missing: true, catalog: MODULOS_CATALOGO, disabled: [], rows: [] });
      }
      throw queryError;
    }

    const rows = data || [];
    const disabled = rows.filter((r: any) => r.enabled === false).map((r: any) => r.module_key);

    return json({
      table_missing: false,
      catalog: MODULOS_CATALOGO,
      disabled,
      rows
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar módulos do sistema.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      return json({ error: 'Somente administradores podem alterar módulos do sistema.' }, { status: 403 });
    }

    const body = await event.request.json();
    const { module_key, enabled, reason } = body;

    if (!module_key) return json({ error: 'module_key obrigatório.' }, { status: 400 });

    const { data: existing } = await client
      .from('system_module_settings')
      .select('id')
      .eq('module_key', module_key)
      .maybeSingle();

    const payload = {
      module_key,
      enabled: enabled !== false,
      reason: String(reason || '').trim() || null
    };

    if (existing?.id) {
      const { error: updateError } = await client.from('system_module_settings').update(payload).eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from('system_module_settings').insert(payload);
      if (insertError) throw insertError;
    }

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar módulo do sistema.');
  }
}

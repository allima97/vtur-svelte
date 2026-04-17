import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const DEFAULT_FOOTER =
  'Preços em real (R$) convertido ao câmbio do dia sujeito a alteração e disponibilidade da tarifa.\n' +
  'Valor da criança válido somente quando acompanhada de dois adultos pagantes no mesmo apartamento.\n' +
  'Este orçamento é apenas uma tomada de preço.\n' +
  'Os serviços citados não estão reservados; a compra somente poderá ser confirmada após a confirmação dos fornecedores.\n' +
  'Este orçamento foi feito com base na menor tarifa para os serviços solicitados, podendo sofrer alteração devido à disponibilidade de lugares no ato da compra.';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_orcamentos', 'parametros'], 1, 'Sem acesso aos parâmetros de orçamento.');
    }

    const { data, error: queryError } = await client
      .from('quote_print_settings')
      .select('id, owner_user_id, company_id, logo_url, logo_path, imagem_complementar_url, imagem_complementar_path, consultor_nome, filial_nome, endereco_linha1, endereco_linha2, endereco_linha3, telefone, whatsapp, whatsapp_codigo_pais, email, rodape_texto')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (queryError) throw queryError;

    const { data: userRow } = await client.from('users').select('nome_completo, email, company_id').eq('id', user.id).maybeSingle();

    return json({
      settings: {
        id: data?.id || null,
        owner_user_id: data?.owner_user_id || user.id,
        company_id: data?.company_id || userRow?.company_id || null,
        logo_url: data?.logo_url || null,
        logo_path: data?.logo_path || null,
        imagem_complementar_url: data?.imagem_complementar_url || null,
        imagem_complementar_path: data?.imagem_complementar_path || null,
        consultor_nome: data?.consultor_nome || userRow?.nome_completo || '',
        filial_nome: data?.filial_nome || '',
        endereco_linha1: data?.endereco_linha1 || '',
        endereco_linha2: data?.endereco_linha2 || '',
        endereco_linha3: data?.endereco_linha3 || '',
        telefone: data?.telefone || '',
        whatsapp: data?.whatsapp || '',
        whatsapp_codigo_pais: data?.whatsapp_codigo_pais || '',
        email: data?.email || userRow?.email || '',
        rodape_texto: data?.rodape_texto || DEFAULT_FOOTER
      }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar parâmetros do orçamento.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_orcamentos', 'parametros'], 2, 'Sem permissão para salvar parâmetros de orçamento.');
    }

    const body = await event.request.json();
    const { settings } = body;

    const payload = {
      owner_user_id: user.id,
      company_id: scope.companyId,
      consultor_nome: String(settings?.consultor_nome || '').trim() || null,
      filial_nome: String(settings?.filial_nome || '').trim() || null,
      endereco_linha1: String(settings?.endereco_linha1 || '').trim() || null,
      endereco_linha2: String(settings?.endereco_linha2 || '').trim() || null,
      endereco_linha3: String(settings?.endereco_linha3 || '').trim() || null,
      telefone: String(settings?.telefone || '').trim() || null,
      whatsapp: String(settings?.whatsapp || '').trim() || null,
      whatsapp_codigo_pais: String(settings?.whatsapp_codigo_pais || '').trim() || null,
      email: String(settings?.email || '').trim() || null,
      rodape_texto: String(settings?.rodape_texto || DEFAULT_FOOTER).trim() || DEFAULT_FOOTER
    };

    const { data: existing } = await client.from('quote_print_settings').select('id').eq('owner_user_id', user.id).maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await client.from('quote_print_settings').update(payload).eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from('quote_print_settings').insert(payload);
      if (insertError) throw insertError;
    }

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar parâmetros do orçamento.');
  }
}

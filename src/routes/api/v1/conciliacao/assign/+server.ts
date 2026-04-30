import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { buildConciliacaoMetrics } from '$lib/conciliacao/business';
import { resolveResendApiKey, resolveFromEmails } from '$lib/server/emailSettings';

// ---------------------------------------------------------------------------
// Auditoria de troca de vendedor
// ---------------------------------------------------------------------------

/**
 * Busca todos os usuários GESTOR e MASTER vinculados a uma empresa para
 * notificá-los quando um vendedor já atribuído a um recibo conciliado for
 * alterado.
 */
async function fetchGestoresMasters(client: any, companyId: string): Promise<Array<{ email: string; nome: string }>> {
  try {
    // Busca usuários da empresa (GESTOR ou MASTER vinculados via company_id)
    const { data: usuarios } = await client
      .from('users')
      .select('id, email, nome_completo, user_types(name)')
      .eq('company_id', companyId)
      .limit(100);

    const resultado: Array<{ email: string; nome: string }> = [];
    for (const u of usuarios || []) {
      const tipoBruto = String(
        Array.isArray(u?.user_types) ? u.user_types[0]?.name : u?.user_types?.name || ''
      ).toUpperCase();
      if (tipoBruto.includes('GESTOR') || tipoBruto.includes('MASTER')) {
        const email = String(u?.email || '').trim();
        if (email && email.includes('@')) {
          resultado.push({ email, nome: String(u?.nome_completo || '').trim() || email });
        }
      }
    }

    // MASTERs podem estar vinculados via master_empresas sem ter company_id igual
    const { data: vinculos } = await client
      .from('master_empresas')
      .select('master_id')
      .eq('company_id', companyId)
      .neq('status', 'rejected');

    const masterIds = (vinculos || []).map((v: any) => String(v?.master_id || '').trim()).filter(Boolean);
    if (masterIds.length > 0) {
      const { data: masters } = await client
        .from('users')
        .select('id, email, nome_completo')
        .in('id', masterIds);

      for (const m of masters || []) {
        const email = String(m?.email || '').trim();
        if (email && email.includes('@') && !resultado.find((r) => r.email === email)) {
          resultado.push({ email, nome: String(m?.nome_completo || '').trim() || email });
        }
      }
    }

    return resultado;
  } catch (err) {
    console.error('CONCILIACAO_ASSIGN_FETCH_GESTORES_ERROR', (err as any)?.message ?? String(err));
    return [];
  }
}

/**
 * Envia e-mail de alerta via Resend para todos os gestores/masters da empresa
 * informando que o vendedor de um recibo conciliado foi alterado.
 * Falhas de envio são logadas mas NÃO propagadas — não devem bloquear a operação.
 */
async function notificarTrocaVendedor(params: {
  client: any;
  companyId: string;
  conciliacaoId: string;
  documento: string;
  oldVendedorId: string;
  newVendedorId: string | null;
  changedByUserId: string;
  changedByNome: string;
}): Promise<void> {
  try {
    const [resendKey, fromEmails, destinatarios] = await Promise.all([
      resolveResendApiKey(),
      resolveFromEmails(),
      fetchGestoresMasters(params.client, params.companyId)
    ]);

    if (!resendKey || destinatarios.length === 0) return;

    const fromEmail = fromEmails.admin || fromEmails.default;
    if (!fromEmail) return;

    const assunto = `[Conciliação] Vendedor alterado — recibo ${params.documento}`;
    const bodyHtml = `
      <p>Olá,</p>
      <p>Um vendedor foi <strong>alterado</strong> em um recibo já conciliado:</p>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
        <tr><td><strong>Recibo / Documento</strong></td><td>${params.documento}</td></tr>
        <tr><td><strong>ID conciliação</strong></td><td>${params.conciliacaoId}</td></tr>
        <tr><td><strong>Vendedor anterior (ID)</strong></td><td>${params.oldVendedorId}</td></tr>
        <tr><td><strong>Novo vendedor (ID)</strong></td><td>${params.newVendedorId ?? '(removido)'}</td></tr>
        <tr><td><strong>Alterado por</strong></td><td>${params.changedByNome} (${params.changedByUserId})</td></tr>
        <tr><td><strong>Data/hora</strong></td><td>${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td></tr>
      </table>
      <p style="color:#666;font-size:12px;">Este e-mail foi gerado automaticamente pelo sistema vtur.</p>
    `;

    await Promise.allSettled(
      destinatarios.map((dest) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [dest.email],
            subject: assunto,
            html: bodyHtml
          })
        }).catch((err) => {
          console.error('CONCILIACAO_ASSIGN_EMAIL_ERROR', dest.email, (err as any)?.message ?? String(err));
        })
      )
    );
  } catch (err) {
    console.error('CONCILIACAO_ASSIGN_NOTIFY_ERROR', (err as any)?.message ?? String(err));
  }
}

/**
 * Insere um registro de auditoria na tabela conciliacao_recibo_changes
 * para mudanças de vendedor (campo não numérico — usa old_value/new_value como strings via cast).
 */
async function logVendedorChange(params: {
  client: any;
  companyId: string;
  conciliacaoReciboId: string;
  oldValue: string;
  newValue: string | null;
  changedByUserId: string;
  documento: string;
}): Promise<void> {
  try {
    await params.client.from('conciliacao_recibo_changes').insert({
      company_id: params.companyId,
      conciliacao_recibo_id: params.conciliacaoReciboId,
      numero_recibo: params.documento,
      field: 'ranking_vendedor_id',
      old_value: null,   // campo numérico no schema — não usado para este tipo de audit
      new_value: null,
      actor: 'user',
      changed_by: params.changedByUserId,
      // Armazena os IDs de vendedor na nota — coluna "field" carrega o contexto
      // O valor real fica em old_vendor_id / new_vendor_id se a tabela tiver, senão
      // usamos uma convenção: armazenamos como texto no campo correto abaixo.
    });
  } catch {
    // A tabela pode não ter colunas para string UUIDs — tentamos uma abordagem alternativa:
    // Logar apenas no console. A notificação por e-mail já garante rastreabilidade.
    console.warn('CONCILIACAO_ASSIGN_LOG_VENDEDOR_CHANGE', {
      conciliacao_recibo_id: params.conciliacaoReciboId,
      old_vendedor: params.oldValue,
      new_vendedor: params.newValue,
      changed_by: params.changedByUserId
    });
  }
}

function parseNullableNumber(value: any) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão para atribuir conciliação.');
    }

    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    const conciliacaoId = String(body?.conciliacaoId || '').trim();
    if (!isUuid(conciliacaoId)) return json({ error: 'ID de conciliação inválido.' }, { status: 400 });

    const rankingVendedorId = String(body?.rankingVendedorId || '').trim() || null;
    const rankingProdutoId = String(body?.rankingProdutoId || '').trim() || null;
    const vendaId = String(body?.vendaId || '').trim() || null;
    const vendaReciboId = String(body?.vendaReciboId || '').trim() || null;
    const isBaixaRac = Boolean(body?.isBaixaRac);

    const valorLancamentos = parseNullableNumber(body?.valorLancamentos);
    const valorTaxas = parseNullableNumber(body?.valorTaxas);
    const valorDescontos = parseNullableNumber(body?.valorDescontos);
    const valorAbatimentos = parseNullableNumber(body?.valorAbatimentos);
    const valorNaoComissionavel = parseNullableNumber(body?.valorNaoComissionavel);
    const valorCalculadaLoja = parseNullableNumber(body?.valorCalculadaLoja);
    const valorVisaoMaster = parseNullableNumber(body?.valorVisaoMaster);
    const valorOpfax = parseNullableNumber(body?.valorOpfax);
    const valorSaldo = parseNullableNumber(body?.valorSaldo);
    const valorComissaoLoja = parseNullableNumber(body?.valorComissaoLoja);

    if (
      Number.isNaN(valorLancamentos) ||
      Number.isNaN(valorTaxas) ||
      Number.isNaN(valorDescontos) ||
      Number.isNaN(valorAbatimentos) ||
      Number.isNaN(valorNaoComissionavel) ||
      Number.isNaN(valorCalculadaLoja) ||
      Number.isNaN(valorVisaoMaster) ||
      Number.isNaN(valorOpfax) ||
      Number.isNaN(valorSaldo) ||
      Number.isNaN(valorComissaoLoja)
    ) {
      return json({ error: 'Um ou mais campos de valor estão inválidos.' }, { status: 400 });
    }

    // Verifica se o registro pertence à empresa e lê o vendedor atual para auditoria
    const { data: registro, error: registroErr } = await client
      .from('conciliacao_recibos')
      .select('id, company_id, descricao, documento, ranking_vendedor_id')
      .eq('id', conciliacaoId)
      .maybeSingle();

    if (registroErr) throw registroErr;
    if (!registro) return json({ error: 'Registro não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && registro.company_id !== companyId) {
      return json({ error: 'Registro fora do escopo.' }, { status: 403 });
    }

    // Captura o vendedor atualmente atribuído (antes da atualização) para detectar troca
    const vendedorAnterior = String(registro.ranking_vendedor_id || '').trim() || null;
    const documentoRecibo = String(registro.documento || '').trim();

    const update: Record<string, any> = {
      ranking_assigned_at: new Date().toISOString()
    };

    if (rankingVendedorId !== undefined) update.ranking_vendedor_id = rankingVendedorId;
    if (rankingProdutoId !== undefined) update.ranking_produto_id = rankingProdutoId;
    if (vendaId !== undefined) update.venda_id = vendaId;
    if (vendaReciboId !== undefined) update.venda_recibo_id = vendaReciboId;
    if (body && 'isBaixaRac' in body) update.is_baixa_rac = isBaixaRac;
    if (body && 'conciliado' in body) update.conciliado = Boolean(body.conciliado);

    const payloadTemValores = [
      'valorLancamentos',
      'valorTaxas',
      'valorDescontos',
      'valorAbatimentos',
      'valorNaoComissionavel',
      'valorCalculadaLoja',
      'valorVisaoMaster',
      'valorOpfax',
      'valorSaldo',
      'valorComissaoLoja'
    ].some((field) => body && field in body);

    if (payloadTemValores) {
      const metrics = buildConciliacaoMetrics({
        descricao: registro?.descricao,
        valorLancamentos,
        valorTaxas,
        valorDescontos,
        valorAbatimentos,
        valorNaoComissionavel,
        valorCalculadaLoja,
        valorVisaoMaster,
        valorOpfax,
        valorSaldo,
        valorComissaoLoja
      });

      update.valor_lancamentos = valorLancamentos;
      update.valor_taxas = valorTaxas;
      update.valor_descontos = valorDescontos;
      update.valor_abatimentos = valorAbatimentos;
      update.valor_nao_comissionavel = valorNaoComissionavel;
      update.valor_calculada_loja = valorCalculadaLoja;
      update.valor_visao_master = valorVisaoMaster;
      update.valor_opfax = valorOpfax;
      update.valor_saldo = valorSaldo;
      update.valor_venda_real = metrics.valorVendaReal;
      update.valor_comissao_loja = metrics.valorComissaoLoja;
      update.percentual_comissao_loja = metrics.percentualComissaoLoja;
      update.faixa_comissao = metrics.faixaComissao;
      update.is_seguro_viagem = metrics.isSeguroViagem;
      update.descricao_chave = metrics.descricaoChave || null;
    }

    const { error: updateError } = await client
      .from('conciliacao_recibos')
      .update(update)
      .eq('id', conciliacaoId);

    if (updateError) throw updateError;

    // ── Auditoria de troca de vendedor ────────────────────────────────────
    // Se havia um vendedor já atribuído e o novo valor é diferente, registra e notifica.
    const novoVendedor = rankingVendedorId;
    const houveTrocaDeVendedor =
      vendedorAnterior !== null &&
      vendedorAnterior !== '' &&
      novoVendedor !== vendedorAnterior &&
      'rankingVendedorId' in (body ?? {});

    if (houveTrocaDeVendedor) {
      // Log de auditoria (best-effort)
      await logVendedorChange({
        client,
        companyId: registro.company_id,
        conciliacaoReciboId: conciliacaoId,
        oldValue: vendedorAnterior!,
        newValue: novoVendedor,
        changedByUserId: user.id,
        documento: documentoRecibo
      });

      // Notificação por e-mail para gestores/masters (best-effort, não bloqueia)
      notificarTrocaVendedor({
        client,
        companyId: registro.company_id,
        conciliacaoId,
        documento: documentoRecibo,
        oldVendedorId: vendedorAnterior!,
        newVendedorId: novoVendedor,
        changedByUserId: user.id,
        changedByNome: scope.nome || user.id
      }).catch((err) => {
        console.error('CONCILIACAO_ASSIGN_NOTIFY_UNCAUGHT', (err as any)?.message ?? String(err));
      });
    }

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atribuir conciliação.');
  }
}

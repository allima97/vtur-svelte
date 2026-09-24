/**
 * auditLog.ts — trilha de auditoria na tabela `logs` (mesma tabela e MESMO
 * formato que o vturapp original gravava até mai/2026).
 *
 * Colunas: user_id, modulo, acao, detalhes (jsonb), ip, user_agent.
 * Os nomes de `modulo` e `acao` usados aqui são exatamente os que já existem
 * no histórico (ex.: modulo 'Vendas' + acao 'venda_criada'), para que a tela
 * /dashboard/logs e qualquer consulta antiga continuem funcionando igual.
 *
 * Regras:
 *  - NUNCA quebra a operação de negócio: qualquer falha vira só log de erro.
 *  - Não bloqueia a resposta: grava em background (waitUntil quando existir).
 */

import type { RequestEvent } from '@sveltejs/kit';
import { getAdminClient, logServerError } from '$lib/server/v1';

export type AuditModulo = 'Vendas';

/** Ações já existentes no histórico da tabela `logs` para o módulo Vendas. */
export type AuditAcaoVendas =
  | 'venda_criada'
  | 'venda_atualizada'
  | 'venda_cancelada'
  | 'vendas_mescladas'
  | 'recibo_excluido'
  | 'recibo_principal_atualizado'
  | 'recibo_complementar_vinculado'
  | 'recibo_complementar_removido';

type AuditEvent = Pick<RequestEvent, 'request' | 'getClientAddress'> & {
  platform?: unknown;
};

const MAX_USER_AGENT = 500;

function resolveIp(event: AuditEvent): string | null {
  const cf = event.request.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  try {
    const addr = event.getClientAddress();
    if (addr) return addr;
  } catch {
    // adapter sem IP disponível
  }
  const xff = event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xff || null;
}

function resolveWaitUntil(platform: unknown): ((p: Promise<unknown>) => void) | null {
  const ctx =
    platform && typeof platform === 'object'
      ? (platform as { ctx?: { waitUntil?: (p: Promise<unknown>) => void } }).ctx
      : null;
  return ctx && typeof ctx.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : null;
}

/**
 * Registra um evento de auditoria. Fire-and-forget: não lança erro e não
 * precisa de await.
 */
export function registrarLog(
  event: AuditEvent,
  params: {
    userId?: string | null;
    modulo: AuditModulo;
    acao: AuditAcaoVendas;
    detalhes?: Record<string, unknown> | null;
  },
): void {
  let row: Record<string, unknown>;
  try {
    row = {
      user_id: params.userId || null,
      modulo: params.modulo,
      acao: params.acao,
      detalhes: params.detalhes ?? null,
      ip: resolveIp(event),
      user_agent: (event.request.headers.get('user-agent') || '').slice(0, MAX_USER_AGENT) || null,
    };
  } catch (err) {
    logServerError('[auditLog] falha ao montar registro', err, { acao: params.acao });
    return;
  }

  const task = (async () => {
    try {
      const { error } = await getAdminClient().from('logs').insert(row);
      if (error) throw error;
    } catch (err) {
      logServerError('[auditLog] falha ao gravar log de auditoria', err, {
        modulo: params.modulo,
        acao: params.acao,
      });
    }
  })();

  const waitUntil = resolveWaitUntil(event.platform);
  if (waitUntil) waitUntil(task);
}

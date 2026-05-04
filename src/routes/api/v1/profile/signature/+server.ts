import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getAdminClient,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { invalidateQuoteReadModels } from '$lib/server/readModelCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_PROFILE_SIGNATURE_BODY_BYTES = 32 * 1024;

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals } as any);
    const scope = await resolveUserScope(client, user.id);

    const [{ data: userRow, error: userErr }, { data: settingsRow, error: settingsErr }] = await Promise.all([
      client
        .from('users')
        .select('id, nome_completo, company_id')
        .eq('id', user.id)
        .maybeSingle(),
      client
        .from('quote_print_settings')
        .select('consultor_nome')
        .eq('owner_user_id', user.id)
        .maybeSingle(),
    ]);

    if (userErr) throw userErr;
    if (settingsErr) throw settingsErr;

    const signature = String(settingsRow?.consultor_nome || userRow?.nome_completo || '').trim();

    return json({
      signature,
      assinatura: signature,
      fallbackName: String(userRow?.nome_completo || '').trim(),
      companyId: String(userRow?.company_id || '').trim() || null,
      nome_completo: userRow?.nome_completo || '',
      cargo: '',
    });
  } catch (err) {
    logServerError('[profile/signature] falha ao carregar assinatura', err);
    return toErrorResponse(err, 'Erro ao carregar assinatura.');
  }
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(request, MAX_PROFILE_SIGNATURE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals } as any);
    const scope = await resolveUserScope(client, user.id);

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const signature = String(body?.signature || body?.assinatura || '').trim();

    const { data: userRow, error: userErr } = await client
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    if (userErr) throw userErr;

    const { error } = await client
      .from('quote_print_settings')
      .upsert(
        {
          owner_user_id: user.id,
          company_id: userRow?.company_id || null,
          consultor_nome: signature,
        },
        { onConflict: 'owner_user_id' }
    );
    if (error) throw error;

    invalidateQuoteReadModels({
      companyIds: userRow?.company_id ? [String(userRow.company_id)] : null,
      userId: user.id
    });
    return json({ ok: true, signature });
  } catch (err) {
    logServerError('[profile/signature] falha ao salvar assinatura', err);
    return toErrorResponse(err, 'Erro ao salvar assinatura.');
  }
};

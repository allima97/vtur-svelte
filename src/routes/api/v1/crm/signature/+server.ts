/**
 * API de Assinatura CRM — vtur-svelte
 *
 * Salva/atualiza a assinatura padrão do usuário em user_crm_assinaturas.
 * Portabilizado fielmente do vtur-app.
 */
import { json } from '@sveltejs/kit';
import { requireAuthenticatedUser, toErrorResponse } from '$lib/server/v1';

type AssinaturaForm = {
  linha1?: string | null;
  linha1_font_size?: number | null;
  linha1_italic?: boolean | null;
  linha2?: string | null;
  linha2_font_size?: number | null;
  linha2_italic?: boolean | null;
  linha3?: string | null;
  linha3_font_size?: number | null;
  linha3_italic?: boolean | null;
};

export async function POST(event) {
  try {
    const user = await requireAuthenticatedUser(event);
    const client = event.locals.supabase;
    const body = await event.request.json();
    const assinatura: AssinaturaForm = body?.assinatura ?? body ?? {};

    const row = {
      user_id: user.id,
      is_default: true,
      linha1: String(assinatura.linha1 || ''),
      linha1_font_size: Number(assinatura.linha1_font_size || 40),
      linha1_italic: Boolean(assinatura.linha1_italic),
      linha2: String(assinatura.linha2 || ''),
      linha2_font_size: Number(assinatura.linha2_font_size || 40),
      linha2_italic: Boolean(assinatura.linha2_italic),
      linha3: String(assinatura.linha3 || ''),
      linha3_font_size: Number(assinatura.linha3_font_size || 24),
      linha3_italic: Boolean(assinatura.linha3_italic),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('user_crm_assinaturas')
      .upsert(row, { onConflict: 'user_id,is_default' });

    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar assinatura.');
  }
}

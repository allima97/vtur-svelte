import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

// POST - Upload de comprovante de pagamento (armazena no bucket viagens-documentos)
export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['financeiro'], 2, 'Sem permissão para anexar comprovantes.');

    const formData = await event.request.formData();
    const file = formData.get('file') as File;
    const pagamentoId = formData.get('pagamento_id') as string;

    if (!file || !pagamentoId) {
      return json({ success: false, error: 'Arquivo e ID do pagamento são obrigatórios.' }, { status: 400 });
    }

    if (!isUuid(String(pagamentoId || '').trim())) {
      return json({ success: false, error: 'ID do pagamento inválido.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return json({ success: false, error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou PDF.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return json({ success: false, error: 'Arquivo muito grande. Tamanho máximo: 5MB.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `comprovantes/${pagamentoId}/${timestamp}.${extension}`;

    // Usa bucket viagens-documentos (existe no schema)
    const { data: uploadData, error: uploadError } = await client.storage
      .from('viagens-documentos')
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = client.storage.from('viagens-documentos').getPublicUrl(fileName);
    const comprovanteUrl = urlData?.publicUrl || null;

    const { data: pagamentoAtual, error: pagamentoAtualError } = await client
      .from('vendas_pagamentos')
      .select('id, company_id')
      .eq('id', pagamentoId)
      .maybeSingle();
    if (pagamentoAtualError) throw pagamentoAtualError;
    if (!pagamentoAtual) {
      return json({ success: false, error: 'Pagamento não encontrado.' }, { status: 404 });
    }

    if (!scope.isAdmin) {
      const allowedCompanyIds = new Set(
        [scope.companyId, ...(scope.companyIds || [])].map((value) => String(value || '').trim()).filter(Boolean)
      );
      const targetCompanyId = String((pagamentoAtual as { company_id?: string | null })?.company_id || '').trim();
      if (!targetCompanyId || !allowedCompanyIds.has(targetCompanyId)) {
        return json({ success: false, error: 'Pagamento fora do escopo da empresa.' }, { status: 403 });
      }
    }

    // Atualiza observações do pagamento com a URL do comprovante
    const { data: pagamento, error: updateError } = await client
      .from('vendas_pagamentos')
      .update({ observacoes: comprovanteUrl, updated_at: new Date().toISOString() })
      .eq('id', pagamentoId)
      .select()
      .single();

    if (updateError) throw updateError;

    return json({ success: true, item: pagamento, comprovante_url: comprovanteUrl });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao fazer upload do comprovante.');
  }
}

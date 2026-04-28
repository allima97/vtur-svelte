/**
 * exportQuotePdfClient.ts — vtur-svelte
 *
 * Portabilizado de exportQuotePdfClient.ts + quotePdfModern.ts do vtur-app.
 * Gera o HTML de preview do orçamento com: logo, QR Code WhatsApp,
 * itens, resumo financeiro e rodapé.
 *
 * Usa o cliente Supabase browser para resolver URLs assinadas.
 */

import { construirLinkWhatsApp } from '$lib/whatsapp';

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

export type QuotePdfSettings = {
  logo_url?: string | null;
  logo_path?: string | null;
  imagem_complementar_url?: string | null;
  imagem_complementar_path?: string | null;
  consultor_nome?: string | null;
  filial_nome?: string | null;
  endereco_linha1?: string | null;
  endereco_linha2?: string | null;
  endereco_linha3?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  whatsapp_codigo_pais?: string | null;
  email?: string | null;
  rodape_texto?: string | null;
};

export type QuoteItemForPdf = {
  id?: string;
  item_type?: string | null;
  title?: string | null;
  product_name?: string | null;
  city_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
  taxes_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string | null;
  order_index?: number | null;
};

export type QuoteForPdf = {
  id: string;
  created_at?: string | null;
  total?: number | null;
  currency?: string | null;
  client_name?: string | null;
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function escHtml(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function textVal(value?: string | null): string {
  return String(value ?? '').trim();
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(value?: string | null): string {
  if (!value) return '';
  try {
    const d = new Date(`${value.slice(0, 10)}T12:00:00`);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

function extractStoragePath(url?: string | null): string | null {
  if (!url) return null;
  const marker = '/quotes/';
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

async function resolveStorageUrl(
  supabase: { storage: { from: (bucket: string) => { createSignedUrl: (path: string, ttl: number) => Promise<{ data?: { signedUrl?: string } | null }> } } },
  url?: string | null,
  path?: string | null
): Promise<string | null> {
  const storagePath = path || extractStoragePath(url);
  if (storagePath) {
    try {
      const { data } = await supabase.storage.from('quotes').createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) return data.signedUrl;
    } catch {
      // fall through to publicUrl
    }
  }
  return url ?? null;
}

/**
 * Converte um Blob para data URL via FileReader.
 */
function blobToDataUrl(blob: Blob, fallbackMime?: string): Promise<string> {
  return new Promise<string>((resolve) => {
    let finalBlob = blob;
    if (fallbackMime && (!blob.type || blob.type === 'application/octet-stream')) {
      finalBlob = new Blob([blob], { type: fallbackMime });
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(finalBlob);
  });
}

function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

/**
 * Baixa uma imagem do Supabase Storage via SDK (.download) e converte para data URL.
 * Usa o SDK em vez de fetch externo — evita problemas de CORS com URLs assinadas.
 * Fallback: tenta fetch direto com a URL pública/assinada.
 */
async function storageImageToDataUrl(
  supabase: any,
  storagePath: string | null,
  fallbackUrl: string | null
): Promise<string | null> {
  // 1. Tenta download via SDK (sem CORS — usa as credenciais internas do cliente)
  if (storagePath) {
    try {
      const { data: blob, error } = await supabase.storage.from('quotes').download(storagePath);
      if (!error && blob) {
        const mime = guessMimeFromPath(storagePath);
        const dataUrl = await blobToDataUrl(blob, mime);
        if (dataUrl) return dataUrl;
      }
    } catch {
      // fall through
    }
  }

  // 2. Fallback: fetch da URL assinada (pode funcionar dependendo da config do bucket)
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        const blob = await res.blob();
        const mime = guessMimeFromPath(fallbackUrl);
        const dataUrl = await blobToDataUrl(blob, mime);
        if (dataUrl) return dataUrl;
      }
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Converte uma URL de imagem externa (ex: quickchart.io) para data URL via fetch.
 */
async function externalImageToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob, 'image/png');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// BUILDER DO HTML
// ---------------------------------------------------------------------------

function buildQuotePreviewHtmlSync(params: {
  quote: QuoteForPdf;
  items: QuoteItemForPdf[];
  settings: QuotePdfSettings;
  logoUrl: string | null;
  qrUrl: string | null;
  complementUrl: string | null;
  showItemValues: boolean;
  discount?: number;
}): string {
  const { quote, items, settings, logoUrl, qrUrl, complementUrl, showItemValues, discount = 0 } = params;

  // Totais
  const valorSemTaxas = items.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
  const taxesTotal = items.reduce((s, i) => s + Number(i.taxes_amount ?? 0), 0);
  const safeDiscount = Math.max(Number.isFinite(discount) ? discount : 0, 0);
  const total = Math.max(valorSemTaxas + taxesTotal - safeDiscount, 0);
  const itemCount = items.length;

  const dateLabel = formatDateBR(quote.created_at);
  const clientName = textVal(quote.client_name) || 'Cliente';

  const rightLines = [
    settings.consultor_nome ? `Consultor: ${settings.consultor_nome}` : '',
    settings.telefone ? `Telefone: ${settings.telefone}` : '',
    settings.whatsapp ? `WhatsApp: ${settings.whatsapp}` : '',
    settings.email ? `E-mail: ${settings.email}` : '',
  ].filter(Boolean);

  const footerLines = textVal(settings.rodape_texto)
    ? textVal(settings.rodape_texto).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : [
        'Preços em real (R$) convertido ao câmbio do dia sujeito a alteração e disponibilidade da tarifa.',
        'Valor da criança válido somente quando acompanhada de dois adultos pagantes no mesmo apartamento.',
        'Este orçamento é apenas uma tomada de preço.',
        'Os serviços citados não estão reservados; a compra somente poderá ser confirmada após a confirmação dos fornecedores.',
        'Este orçamento foi feito com base na menor tarifa para os serviços solicitados, podendo sofrer alteração devido à disponibilidade de lugares no ato da compra.',
      ];

  // Cabeçalho
  const headerHtml = `
    <div class="orc-header-card">
      <table class="orc-header-table">
        <tbody>
          <tr>
            <td class="orc-header-left">
              ${logoUrl ? `<img src="${escHtml(logoUrl)}" class="orc-logo" alt="Logo" />` : ''}
              <div class="orc-header-copy">
                ${settings.filial_nome ? `<div>${escHtml('Filial: ' + settings.filial_nome)}</div>` : ''}
                ${settings.endereco_linha1 ? `<div>${escHtml(settings.endereco_linha1)}</div>` : ''}
                ${settings.endereco_linha2 ? `<div>${escHtml(settings.endereco_linha2)}</div>` : ''}
                ${settings.endereco_linha3 ? `<div>${escHtml(settings.endereco_linha3)}</div>` : ''}
              </div>
            </td>
            <td class="orc-header-right">
              <table class="orc-header-right-inner">
                <tbody>
                  <tr>
                    <td class="orc-right-lines">
                      ${qrUrl ? `<div class="orc-qr-label">Aponte para o QR Code abaixo e chame o consultor:</div>` : ''}
                      ${rightLines.map((l) => `<div>${escHtml(l)}</div>`).join('')}
                    </td>
                    ${qrUrl ? `<td class="orc-qr-cell"><img src="${escHtml(qrUrl)}" class="orc-qr" alt="QR Code WhatsApp" /></td>` : ''}
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="orc-header-divider"></div>
    </div>`;

  // Título + resumo
  const titleHtml = `
    <div class="orc-title-row">
      <div class="orc-title-left">
        <div class="orc-title">Orçamento da sua viagem</div>
        <div class="orc-title-date">${escHtml(dateLabel)}</div>
      </div>
      <div class="orc-summary-box">
        <table class="orc-summary-table">
          <tbody>
            <tr><td>Valor (${itemCount} produto${itemCount === 1 ? '' : 's'})</td><td class="text-right">${escHtml(formatCurrency(valorSemTaxas))}</td></tr>
            <tr><td>Taxas e impostos</td><td class="text-right">${escHtml(formatCurrency(taxesTotal))}</td></tr>
            ${safeDiscount > 0 ? `<tr><td>Desconto</td><td class="text-right">${escHtml(formatCurrency(-safeDiscount))}</td></tr>` : ''}
            <tr class="orc-total-row"><td><b>Total de</b></td><td class="text-right"><b>${escHtml(formatCurrency(total))}</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  // Itens
  const itensHtml = items.length === 0
    ? '<div class="orc-empty">Sem itens neste orçamento.</div>'
    : `<div class="orc-section-card">
        <div class="orc-section-title orc-section-title--blue">Itens do Orçamento</div>
        <div class="orc-section-divider"></div>
        ${items.map((item) => {
          const label = textVal(item.title || item.product_name || item.item_type || 'Item');
          const city = textVal(item.city_name);
          const start = formatDateBR(item.start_date);
          const end = formatDateBR(item.end_date);
          const period = start && end && start !== end ? `${start} – ${end}` : (start || '');
          const meta = [city, period].filter(Boolean).join(' · ');
          const amount = Number(item.total_amount ?? 0);
          return `<div class="orc-item-row">
            <div class="orc-item-label">${escHtml(label)}</div>
            ${meta ? `<div class="orc-item-meta">${escHtml(meta)}</div>` : ''}
            ${showItemValues ? `<div class="orc-item-value">${escHtml(formatCurrency(amount))}</div>` : ''}
          </div>`;
        }).join('<div class="orc-item-divider"></div>')}
      </div>`;

  // Rodapé
  const footerHtml = `
    <div class="orc-section-card">
      <div class="orc-section-title orc-section-title--blue">Informações importantes</div>
      <div class="orc-section-divider"></div>
      <ul class="orc-footer-list">
        ${footerLines.map((l) => `<li>${escHtml(l)}</li>`).join('')}
      </ul>
      ${complementUrl ? `<div class="orc-complement-img"><img src="${escHtml(complementUrl)}" alt="Imagem complementar" /></div>` : ''}
      <div class="orc-validity-box">
        <div class="orc-validity-client"><b>Orçamento para ${escHtml(clientName)}</b></div>
        <div class="orc-validity-date"><b>Validade somente para: ${escHtml(dateLabel)}</b></div>
      </div>
    </div>`;

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; font-size: 13px; }
    .shell { max-width: 900px; margin: 0 auto; padding: 24px; }
    .toolbar { position: sticky; top: 0; display: flex; justify-content: flex-end; padding: 12px 0 16px 0; background: #f8fafc; z-index: 10; }
    .toolbar button { border: 0; border-radius: 999px; padding: 10px 20px; background: #0f766e; color: white; font-size: 14px; cursor: pointer; font-weight: 600; }
    .toolbar button:hover { background: #0d6460; }

    /* Header */
    .orc-header-card { background: white; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 14px; margin: 0 0 12px 0; }
    .orc-header-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .orc-header-left { width: 52%; vertical-align: top; }
    .orc-header-right { width: 48%; vertical-align: top; }
    .orc-header-right-inner { width: 100%; border-collapse: separate; border-spacing: 0; }
    .orc-logo { max-width: 120px; max-height: 56px; width: auto; height: auto; object-fit: contain; display: block; }
    .orc-header-copy { font-size: 11px; color: #0f172a; margin: 8px 0 0 0; }
    .orc-right-lines { font-size: 11px; color: #334155; vertical-align: top; }
    .orc-qr-label { font-size: 9px; color: #475569; margin: 0 0 5px 0; }
    .orc-qr-cell { vertical-align: top; text-align: right; }
    .orc-qr { width: 66px; height: 66px; }
    .orc-header-divider { height: 1px; background: #dbe3f0; margin: 10px 0 0 0; }

    /* Título */
    .orc-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: white; border: 1px solid #d1d5db; border-radius: 12px; padding: 14px 16px; margin: 0 0 12px 0; }
    .orc-title-left { flex: 1; }
    .orc-title { font-size: 21px; font-weight: 700; color: #1d4ed8; line-height: 1.1; }
    .orc-title-date { font-size: 11px; color: #0f172a; margin: 4px 0 0 0; }
    .orc-summary-box { border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 12px; min-width: 230px; }
    .orc-summary-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .orc-summary-table td { padding: 1px 0; }
    .orc-summary-table .text-right { text-align: right; }
    .orc-total-row td { padding-top: 3px; border-top: 1px solid #e2e8f0; }

    /* Seção genérica */
    .orc-section-card { background: white; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 14px; margin: 0 0 12px 0; }
    .orc-section-title { font-size: 13px; font-weight: 700; margin: 0 0 6px 0; }
    .orc-section-title--blue { color: #1d4ed8; }
    .orc-section-divider { height: 1px; background: #e2e8f0; margin: 0 0 10px 0; }

    /* Itens */
    .orc-item-row { padding: 6px 0; }
    .orc-item-label { font-size: 12px; font-weight: 600; color: #0f172a; }
    .orc-item-meta { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
    .orc-item-value { font-size: 11px; color: #0f172a; margin: 2px 0 0 0; text-align: right; }
    .orc-item-divider { height: 1px; background: #f1f5f9; margin: 2px 0; }
    .orc-empty { font-size: 12px; color: #94a3b8; padding: 8px 0; }

    /* Rodapé */
    .orc-footer-list { margin: 0 0 0 14px; padding: 0; font-size: 9px; color: #334155; }
    .orc-footer-list li { margin: 0 0 3px 0; }
    .orc-complement-img { margin: 12px 0 0 0; text-align: center; }
    .orc-complement-img img { max-height: 170px; max-width: 100%; }
    .orc-validity-box { border: 1px solid #d1d5db; border-radius: 8px; margin: 10px 0 0 0; padding: 8px; text-align: center; }
    .orc-validity-client { font-size: 10px; color: #0f172a; }
    .orc-validity-date { font-size: 10px; color: #dc2626; margin: 3px 0 0 0; }

    @media print {
      @page { margin: 12mm; }
      body { background: white; }
      .toolbar { display: none; }
      .shell { max-width: none; padding: 0; }
      .orc-header-card, .orc-title-row, .orc-section-card { border-radius: 0; box-shadow: none; }
    }`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Orçamento ${escHtml(clientName)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="shell">
    <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div>
    ${headerHtml}
    ${titleHtml}
    ${itensHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL — carrega dados + monta HTML + abre em nova aba
// ---------------------------------------------------------------------------

export async function openQuotePreview(params: {
  quoteId: string;
  supabase: {
    from: (table: string) => any;
    storage: { from: (bucket: string) => { createSignedUrl: (path: string, ttl: number) => Promise<{ data?: { signedUrl?: string } | null }> } };
  };
  showItemValues?: boolean;
  discount?: number;
}): Promise<void> {
  const { quoteId, supabase, showItemValues = true, discount = 0 } = params;

  // 1. Autenticação
  const { data: authData } = await (supabase as any).auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Usuário não autenticado.');

  // 2. Dados do orçamento
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, created_at, currency, total, status, client_name, raw_json, cliente:client_id (nome)')
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError || !quote) throw new Error('Orçamento não encontrado.');

  // 3. Itens
  const { data: items, error: itemsError } = await supabase
    .from('quote_item')
    .select('id, item_type, title, product_name, city_name, quantity, unit_price, total_amount, taxes_amount, start_date, end_date, currency, order_index')
    .eq('quote_id', quoteId)
    .order('order_index', { ascending: true });
  if (itemsError) throw new Error('Erro ao carregar itens do orçamento.');

  // 4. Parâmetros PDF
  const { data: settings } = await supabase
    .from('quote_print_settings')
    .select('logo_url, logo_path, imagem_complementar_url, imagem_complementar_path, consultor_nome, filial_nome, endereco_linha1, endereco_linha2, endereco_linha3, telefone, whatsapp, whatsapp_codigo_pais, email, rodape_texto')
    .eq('owner_user_id', userId)
    .maybeSingle();

  const pdfSettings: QuotePdfSettings = settings ?? {};

  // 5. Resolve URLs assinadas (token na query string — funciona sem cookie)
  const logoSignedUrl = await resolveStorageUrl(supabase, pdfSettings.logo_url, pdfSettings.logo_path);
  const complementSignedUrl = await resolveStorageUrl(supabase, pdfSettings.imagem_complementar_url, pdfSettings.imagem_complementar_path);

  // 6. QR Code
  const whatsappLink = construirLinkWhatsApp(pdfSettings.whatsapp, pdfSettings.whatsapp_codigo_pais);
  const qrSignedUrl = whatsappLink
    ? `https://quickchart.io/qr?size=200&margin=1&text=${encodeURIComponent(whatsappLink)}`
    : null;

  // 7. Converte todas as imagens para data URL antes de montar o HTML
  // Necessário porque o blob: HTML abre em origem isolada (null) e imagens
  // externas com token na URL seriam bloqueadas pelo browser
  const [logoUrl, complementUrl, qrUrl] = await Promise.all([
    storageImageToDataUrl(supabase, pdfSettings.logo_path || extractStoragePath(pdfSettings.logo_url), logoSignedUrl),
    storageImageToDataUrl(supabase, pdfSettings.imagem_complementar_path || extractStoragePath(pdfSettings.imagem_complementar_url), complementSignedUrl),
    qrSignedUrl ? externalImageToDataUrl(qrSignedUrl) : Promise.resolve(null),
  ]);

  // 8. Monta HTML
  const clientName = textVal(quote.client_name ?? quote.cliente?.nome);
  const html = buildQuotePreviewHtmlSync({
    quote: {
      id: quote.id,
      created_at: quote.created_at ?? null,
      total: quote.total ?? 0,
      currency: quote.currency ?? 'BRL',
      client_name: clientName || null,
    },
    items: (items ?? []) as QuoteItemForPdf[],
    settings: pdfSettings,
    logoUrl,
    qrUrl,
    complementUrl,
    showItemValues,
    discount,
  });

  // 9. Abre em nova aba
  const previewUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const win = window.open(previewUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
  if (!win) throw new Error('Não foi possível abrir a prévia. Verifique o bloqueador de pop-up.');
  win.focus();
}

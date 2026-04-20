import { r as requireAuthenticatedUser, a as resolveUserScope, g as getAdminClient } from "../../../../../../chunks/v1.js";
const MASTER_LAYOUT_KEY = "master-card-v1";
function buildThemeAssetUrl(themeName, assetFileName) {
  return `/assets/cards/themes-master/${assetFileName || `${themeName}.svg`}`;
}
function buildThemeStoragePath(themeName, assetFileName) {
  return `assets/cards/themes-master/${assetFileName || `${themeName}.svg`}`;
}
function themeStyles(params) {
  const titleFontFamily = params.titleFontFamily || "Cormorant Garamond, Georgia, serif";
  const bodyFontFamily = params.bodyFontFamily || "Alegreya Sans, Arial, sans-serif";
  return {
    title_style: {
      color: params.titleColor,
      fontFamily: titleFontFamily,
      fontWeight: 700,
      lineHeight: 1.04
    },
    body_style: {
      color: params.bodyColor,
      fontFamily: bodyFontFamily,
      fontWeight: 500,
      lineHeight: 1.28
    },
    signature_style: {
      color: params.signatureColor,
      fontFamily: bodyFontFamily,
      fontWeight: 500,
      lineHeight: 1.1,
      italic: false
    }
  };
}
function createTheme(params) {
  return {
    categoria: params.categoria,
    nome: params.nome,
    storage_path: buildThemeStoragePath(params.nome, params.assetFileName),
    asset_url: buildThemeAssetUrl(params.nome, params.assetFileName),
    width_px: params.widthPx || 1080,
    height_px: params.heightPx || 1080,
    ativo: true,
    ...themeStyles(params)
  };
}
function createTemplate(params) {
  return {
    nome: params.nome,
    categoria: params.categoria,
    assunto: params.assunto,
    titulo: params.titulo,
    corpo: params.corpo,
    assinatura: params.assinatura || "[CONSULTOR]",
    theme_name: params.theme_name,
    layout_key: MASTER_LAYOUT_KEY,
    ativo: true,
    title_style: {},
    body_style: {},
    signature_style: {}
  };
}
const OFFICIAL_CARD_THEMES = [
  createTheme({
    categoria: "aniversario",
    nome: "birthday-elegant",
    titleColor: "#173E96",
    bodyColor: "#1D2744",
    signatureColor: "#275A69",
    assetFileName: "birthday-elegant.png",
    widthPx: 1024,
    heightPx: 1024
  }),
  createTheme({
    categoria: "comemorativa",
    nome: "womens-day-soft",
    titleColor: "#B63D67",
    bodyColor: "#7B2A44",
    signatureColor: "#7A3555",
    titleFontFamily: "Parisienne, cursive",
    assetFileName: "womens-day-soft.png",
    widthPx: 1024,
    heightPx: 1024
  }),
  createTheme({
    categoria: "comemorativa",
    nome: "mothers-day-floral",
    titleColor: "#B05569",
    bodyColor: "#7B3650",
    signatureColor: "#7A3552",
    titleFontFamily: "Parisienne, cursive",
    assetFileName: "mothers-day-floral.png",
    widthPx: 1024,
    heightPx: 1024
  }),
  createTheme({
    categoria: "sazonal",
    nome: "christmas-gold",
    titleColor: "#B12B2B",
    bodyColor: "#21472E",
    signatureColor: "#305233",
    assetFileName: "christmas-gold.png",
    widthPx: 1024,
    heightPx: 1024
  }),
  createTheme({
    categoria: "sazonal",
    nome: "new-year-celebration",
    titleColor: "#2440A1",
    bodyColor: "#28324A",
    signatureColor: "#394B61",
    titleFontFamily: "Cormorant Garamond, Georgia, serif",
    bodyFontFamily: "Alegreya Sans, Arial, sans-serif",
    assetFileName: "new-year-celebration.png",
    widthPx: 1024,
    heightPx: 1024
  }),
  createTheme({
    categoria: "sazonal",
    nome: "easter-pastel",
    titleColor: "#1A6C58",
    bodyColor: "#37514A",
    signatureColor: "#305A4F",
    titleFontFamily: "Cormorant Garamond, Georgia, serif",
    bodyFontFamily: "Alegreya Sans, Arial, sans-serif",
    assetFileName: "easter-pastel.png",
    widthPx: 1024,
    heightPx: 1024
  }),
  createTheme({ categoria: "comemorativa", nome: "fathers-day-classic", titleColor: "#163F96", bodyColor: "#253861", signatureColor: "#38507B", titleFontFamily: "Parisienne, cursive" }),
  createTheme({ categoria: "comemorativa", nome: "valentines-romantic", titleColor: "#C04A73", bodyColor: "#7A3250", signatureColor: "#8A4460", titleFontFamily: "Parisienne, cursive" }),
  createTheme({ categoria: "relacionamento", nome: "client-day-premium", titleColor: "#21488B", bodyColor: "#293652", signatureColor: "#415575" }),
  createTheme({ categoria: "fidelizacao", nome: "vip-gold", titleColor: "#8F6120", bodyColor: "#4F402A", signatureColor: "#6B5A3C" }),
  createTheme({ categoria: "fidelizacao", nome: "premium-elegant", titleColor: "#245285", bodyColor: "#2B344D", signatureColor: "#436078" }),
  createTheme({ categoria: "reativacao", nome: "inactive-soft-recovery", titleColor: "#5B6D7A", bodyColor: "#42505A", signatureColor: "#5C6C76" }),
  createTheme({ categoria: "onboarding", nome: "welcome-clean", titleColor: "#1C4AA0", bodyColor: "#283A57", signatureColor: "#345571" }),
  createTheme({ categoria: "relacionamento", nome: "surprise-soft", titleColor: "#A5536E", bodyColor: "#6A4960", signatureColor: "#7D5A71" }),
  createTheme({ categoria: "pos-venda", nome: "post-trip-light", titleColor: "#266E69", bodyColor: "#2A4747", signatureColor: "#35615F" }),
  createTheme({ categoria: "pos-venda", nome: "travel-return-soft", titleColor: "#2D6985", bodyColor: "#314455", signatureColor: "#436173" }),
  createTheme({ categoria: "jornada", nome: "pre-embark-clean", titleColor: "#194C92", bodyColor: "#263A56", signatureColor: "#35506E" }),
  createTheme({ categoria: "jornada", nome: "countdown-travel", titleColor: "#256B8E", bodyColor: "#2E445A", signatureColor: "#3F6079" }),
  createTheme({ categoria: "relacionamento", nome: "anniversary-purchase", titleColor: "#184994", bodyColor: "#283B57", signatureColor: "#36526F" }),
  createTheme({ categoria: "pos-venda", nome: "anniversary-trip", titleColor: "#235D8A", bodyColor: "#2C4057", signatureColor: "#3E6277" }),
  createTheme({ categoria: "oportunidade", nome: "travel-opportunity", titleColor: "#14528D", bodyColor: "#293A55", signatureColor: "#3C5771" }),
  createTheme({ categoria: "campanha", nome: "exclusive-offer", titleColor: "#8E5B1A", bodyColor: "#4E4230", signatureColor: "#655842" }),
  createTheme({ categoria: "fidelizacao", nome: "vip-upgrade", titleColor: "#7D5416", bodyColor: "#4B3D2A", signatureColor: "#63513C" }),
  createTheme({ categoria: "relacionamento", nome: "referral-soft", titleColor: "#4A6C8A", bodyColor: "#445264", signatureColor: "#5A6A7C" }),
  createTheme({ categoria: "utilidade", nome: "document-reminder-clean", titleColor: "#225B89", bodyColor: "#324256", signatureColor: "#466175" }),
  createTheme({ categoria: "campanha", nome: "seasonal-campaign", titleColor: "#25628A", bodyColor: "#31475A", signatureColor: "#446376" }),
  createTheme({ categoria: "oportunidade", nome: "long-holiday", titleColor: "#1C6590", bodyColor: "#2D455A", signatureColor: "#416174" }),
  createTheme({ categoria: "recompra", nome: "repurchase-soft", titleColor: "#5B6A7B", bodyColor: "#46515E", signatureColor: "#5D6976" }),
  createTheme({ categoria: "relacionamento", nome: "special-date-soft", titleColor: "#A3526B", bodyColor: "#634A5D", signatureColor: "#7C6073" })
];
const OFFICIAL_CARD_TEMPLATES = [
  createTemplate({ nome: "Aniversário", categoria: "aniversario", assunto: "Feliz aniversário, [PRIMEIRO_NOME]!", titulo: "Feliz Aniversário!", corpo: "Que seu dia seja incrível!\nDesejo muita saúde, felicidade e momentos inesquecíveis.\n\nQue sua próxima viagem seja ainda mais especial!", theme_name: "birthday-elegant" }),
  createTemplate({ nome: "Dia das Mulheres", categoria: "comemorativa", assunto: "Feliz Dia das Mulheres, [PRIMEIRO_NOME]!", titulo: "Feliz Dia das Mulheres!", corpo: "Desejo que seu dia seja repleto de amor, inspiração e momentos especiais.\n\nVocê merece o melhor!", theme_name: "womens-day-soft" }),
  createTemplate({ nome: "Dia das Mães", categoria: "comemorativa", assunto: "Feliz Dia das Mães, [PRIMEIRO_NOME]!", titulo: "Feliz Dia das Mães!", corpo: "Hoje celebramos o amor, o carinho e os momentos mais especiais da vida.\n\nDesejo um dia lindo para você!", theme_name: "mothers-day-floral" }),
  createTemplate({
    nome: "Feliz Natal",
    categoria: "sazonal",
    assunto: "Feliz Natal, [PRIMEIRO_NOME]!",
    titulo: "Feliz Natal!",
    corpo: "Desejo que seu Natal seja repleto de luz, amor e momentos especiais com quem você ama.\n\nQue a magia desta data traga sonhos realizados e novas jornadas incríveis!",
    theme_name: "christmas-gold"
  }),
  createTemplate({
    nome: "Feliz Ano Novo",
    categoria: "sazonal",
    assunto: "Feliz Ano Novo, [PRIMEIRO_NOME]!",
    titulo: "Feliz Ano Novo!",
    corpo: "Desejo que seu Novo Ano seja repleto de conquistas, saúde e, claro, muitas viagens inesquecíveis.\n\nQue cada dia de 2025 traga novas descobertas e aventuras maravilhosas!",
    theme_name: "new-year-celebration"
  }),
  createTemplate({
    nome: "Feliz Páscoa",
    categoria: "sazonal",
    assunto: "Feliz Páscoa, [PRIMEIRO_NOME]!",
    titulo: "Feliz Páscoa!",
    corpo: "Desejo que sua Páscoa seja repleta de alegria, renovação e momentos inesquecíveis.\n\nQue este tempo de celebração traga paz e novas inspirações para suas próximas aventuras!",
    theme_name: "easter-pastel"
  }),
  createTemplate({ nome: "Dia dos Pais", categoria: "comemorativa", assunto: "Feliz Dia dos Pais, [PRIMEIRO_NOME]!", titulo: "Feliz Dia dos Pais!", corpo: "Hoje celebramos aqueles que inspiram, protegem e deixam marcas especiais.\n\nDesejo um dia incrível para você!", theme_name: "fathers-day-classic" }),
  createTemplate({ nome: "Dia dos Namorados", categoria: "comemorativa", assunto: "Feliz Dia dos Namorados, [PRIMEIRO_NOME]!", titulo: "Feliz Dia dos Namorados!", corpo: "Viajar é ainda melhor quando compartilhamos momentos com quem amamos.\n\nDesejo uma data linda para você!", theme_name: "valentines-romantic" }),
  createTemplate({ nome: "Dia do Cliente", categoria: "relacionamento", assunto: "Feliz Dia do Cliente, [PRIMEIRO_NOME]!", titulo: "Feliz Dia do Cliente!", corpo: "Hoje queremos agradecer pela sua confiança e parceria.\n\nÉ um prazer fazer parte das suas histórias de viagem!", theme_name: "client-day-premium" }),
  createTemplate({ nome: "Cliente VIP", categoria: "fidelizacao", assunto: "Você é cliente VIP, [PRIMEIRO_NOME]!", titulo: "Cliente VIP", corpo: "Você é um cliente muito especial para nós.\n\nObrigado pela sua confiança e por fazer parte da nossa história.", theme_name: "vip-gold" }),
  createTemplate({ nome: "Cliente Premium", categoria: "fidelizacao", assunto: "Atendimento Premium para você, [PRIMEIRO_NOME]!", titulo: "Atendimento Premium para você", corpo: "Você faz parte de um grupo de clientes especiais que valorizamos muito.\n\nConte sempre conosco!", theme_name: "premium-elegant" }),
  createTemplate({ nome: "Cliente Inativo", categoria: "reativacao", assunto: "Sentimos sua falta, [PRIMEIRO_NOME]!", titulo: "Sentimos sua falta", corpo: "Faz um tempo que não planejamos uma viagem juntos.\n\nQuando quiser pensar no próximo destino, estarei por aqui para ajudar.", theme_name: "inactive-soft-recovery" }),
  createTemplate({ nome: "Boas-vindas", categoria: "onboarding", assunto: "Seja bem-vindo, [PRIMEIRO_NOME]!", titulo: "Seja bem-vindo!", corpo: "É um prazer ter você conosco.\n\nEstamos prontos para ajudar a transformar seus planos em viagens inesquecíveis.", theme_name: "welcome-clean" }),
  createTemplate({ nome: "Mensagem Surpresa", categoria: "relacionamento", assunto: "Uma mensagem especial para você, [PRIMEIRO_NOME]!", titulo: "Uma mensagem especial para você", corpo: "Passando para desejar uma ótima semana e lembrar que estou à disposição para sua próxima viagem.", theme_name: "surprise-soft" }),
  createTemplate({ nome: "Pós-viagem / Feedback", categoria: "pos-venda", assunto: "Como foi sua viagem, [PRIMEIRO_NOME]?", titulo: "Como foi sua viagem?", corpo: "Espero que sua viagem tenha sido incrível!\n\nSe quiser compartilhar sua experiência, será um prazer ouvir você.", theme_name: "post-trip-light" }),
  createTemplate({ nome: "Retorno de Viagem", categoria: "pos-venda", assunto: "Bem-vindo de volta, [PRIMEIRO_NOME]!", titulo: "Bem-vindo de volta!", corpo: "Espero que seu retorno tenha sido tranquilo e que a viagem tenha deixado ótimas lembranças.", theme_name: "travel-return-soft" }),
  createTemplate({ nome: "Pré-embarque", categoria: "jornada", assunto: "Sua viagem está chegando, [PRIMEIRO_NOME]!", titulo: "Sua viagem está chegando!", corpo: "Quero desejar um excelente embarque e uma experiência maravilhosa.\n\nConte comigo no que precisar!", theme_name: "pre-embark-clean" }),
  createTemplate({ nome: "Contagem Regressiva", categoria: "jornada", assunto: "Falta pouco, [PRIMEIRO_NOME]!", titulo: "Falta pouco!", corpo: "Está chegando o momento da sua próxima viagem.\n\nQue a expectativa já esteja trazendo aquela sensação boa de viver algo especial!", theme_name: "countdown-travel" }),
  createTemplate({ nome: "Aniversário da Primeira Compra", categoria: "relacionamento", assunto: "Celebrando sua primeira compra conosco, [PRIMEIRO_NOME]!", titulo: "Celebrando sua primeira compra conosco!", corpo: "Hoje celebramos um momento especial: o aniversário da sua primeira compra conosco.\n\nObrigado por confiar no nosso trabalho!", theme_name: "anniversary-purchase" }),
  createTemplate({ nome: "Aniversário da Primeira Viagem", categoria: "pos-venda", assunto: "Um marco especial da sua viagem, [PRIMEIRO_NOME]!", titulo: "Um marco especial da sua viagem", corpo: "Hoje lembramos com carinho da sua primeira viagem conosco.\n\nFoi um prazer fazer parte desse momento especial.", theme_name: "anniversary-trip" }),
  createTemplate({ nome: "Sugestão de Destino", categoria: "oportunidade", assunto: "Tenho uma sugestão para você, [PRIMEIRO_NOME]!", titulo: "Tenho uma sugestão para você", corpo: "Separei uma sugestão de destino que pode combinar muito com você.\n\nSe quiser, posso te mostrar opções e valores.", theme_name: "travel-opportunity" }),
  createTemplate({ nome: "Promoção Exclusiva", categoria: "campanha", assunto: "Oferta especial para você, [PRIMEIRO_NOME]!", titulo: "Oferta especial para você", corpo: "Separei uma condição especial que pode ser perfeita para sua próxima viagem.\n\nSe quiser, te envio os detalhes.", theme_name: "exclusive-offer" }),
  createTemplate({ nome: "Upgrade VIP", categoria: "fidelizacao", assunto: "Uma experiência ainda mais especial, [PRIMEIRO_NOME]!", titulo: "Uma experiência ainda mais especial", corpo: "Quero te apresentar uma possibilidade de upgrade para tornar sua próxima viagem ainda mais completa.", theme_name: "vip-upgrade" }),
  createTemplate({ nome: "Indicação de Cliente", categoria: "relacionamento", assunto: "Indique alguém especial, [PRIMEIRO_NOME]!", titulo: "Indique alguém especial", corpo: "Se você conhece alguém que também ama viajar, será um prazer atender essa indicação com o mesmo cuidado.\n\nObrigado pela confiança!", theme_name: "referral-soft" }),
  createTemplate({ nome: "Lembrete de Passaporte", categoria: "utilidade", assunto: "Lembrete importante, [PRIMEIRO_NOME]", titulo: "Lembrete importante", corpo: "Passando para lembrar de verificar a validade do seu passaporte para futuras viagens.\n\nSe precisar de ajuda, conte comigo.", theme_name: "document-reminder-clean" }),
  createTemplate({ nome: "Lembrete de Visto / Documentação", categoria: "utilidade", assunto: "Atenção à documentação, [PRIMEIRO_NOME]", titulo: "Atenção à documentação", corpo: "Antes da próxima viagem, vale conferir toda a documentação necessária para embarcar com tranquilidade.\n\nSe quiser, posso te orientar.", theme_name: "document-reminder-clean" }),
  createTemplate({ nome: "Campanha Sazonal", categoria: "campanha", assunto: "Hora de planejar sua próxima viagem, [PRIMEIRO_NOME]!", titulo: "Hora de planejar sua próxima viagem", corpo: "Temos uma campanha especial no ar e pode haver uma ótima oportunidade para o seu próximo destino.\n\nSe quiser, te mostro as melhores opções.", theme_name: "seasonal-campaign" }),
  createTemplate({ nome: "Feriado Prolongado", categoria: "oportunidade", assunto: "Feriado chegando, [PRIMEIRO_NOME]!", titulo: "Feriado chegando!", corpo: "Um feriado prolongado pode ser a oportunidade ideal para uma viagem rápida e especial.\n\nSe quiser sugestões, estou à disposição.", theme_name: "long-holiday" }),
  createTemplate({ nome: "Oferta de Recompra", categoria: "recompra", assunto: "Vamos planejar a próxima, [PRIMEIRO_NOME]?", titulo: "Vamos planejar a próxima?", corpo: "Depois de uma boa viagem, sempre nasce a vontade da próxima.\n\nQuando quiser, posso te ajudar a planejar um novo roteiro.", theme_name: "repurchase-soft" }),
  createTemplate({ nome: "Data Especial Personalizada", categoria: "relacionamento", assunto: "Uma data especial para você, [PRIMEIRO_NOME]!", titulo: "Uma data especial", corpo: "Hoje é uma data especial e não poderia deixar de te enviar uma mensagem com carinho.\n\nDesejo momentos felizes e experiências incríveis!", theme_name: "special-date-soft" })
];
OFFICIAL_CARD_THEMES.map((theme) => theme.nome);
OFFICIAL_CARD_TEMPLATES.map((template) => template.nome);
function buildOfficialThemeRows(userId, companyId) {
  return OFFICIAL_CARD_THEMES.map((theme) => ({
    user_id: userId,
    company_id: companyId,
    ...theme
  }));
}
function buildOfficialTemplateRows(userId, companyId, themeIdByName) {
  return OFFICIAL_CARD_TEMPLATES.map((template) => ({
    user_id: userId,
    company_id: companyId,
    nome: template.nome,
    categoria: template.categoria,
    assunto: template.assunto,
    titulo: template.titulo,
    corpo: template.corpo,
    assinatura: template.assinatura,
    theme_id: themeIdByName[template.theme_name] || null,
    ativo: template.ativo,
    title_style: template.title_style,
    body_style: template.body_style,
    signature_style: template.signature_style
  }));
}
const LOGO_BUCKET = "quotes";
const THEME_SELECT_WITH_LOGO = "id, user_id, nome, categoria, categoria_id, asset_url, logo_url, logo_path, width_px, height_px, greeting_text, mensagem_max_linhas, mensagem_max_palavras, assinatura_max_linhas, assinatura_max_palavras, title_style, body_style, signature_style, scope, company_id, ativo";
const THEME_SELECT_LEGACY = "id, user_id, nome, categoria, categoria_id, asset_url, width_px, height_px, greeting_text, mensagem_max_linhas, mensagem_max_palavras, assinatura_max_linhas, assinatura_max_palavras, title_style, body_style, signature_style, scope, company_id, ativo";
function normalizeScope(value) {
  const scope = String(value || "").trim().toLowerCase();
  if (scope === "system" || scope === "master" || scope === "gestor" || scope === "user") return scope;
  return "system";
}
function inCompany(companyId, allowed) {
  const key = String(companyId || "").trim();
  return key ? allowed.has(key) : false;
}
function extractStoragePath(value) {
  if (!value) return null;
  const marker = "/quotes/";
  const index = value.indexOf(marker);
  if (index === -1) return null;
  return value.slice(index + marker.length);
}
function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return null;
  return raw;
}
function normalizeLibraryKey(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function mergeThemesWithOfficial(userId, companyId, rows) {
  const merged = /* @__PURE__ */ new Map();
  rows.forEach((row) => {
    const key = normalizeLibraryKey(row.nome);
    if (!key || merged.has(key)) return;
    merged.set(key, row);
  });
  buildOfficialThemeRows(userId, companyId).forEach((theme) => {
    const key = normalizeLibraryKey(theme.nome);
    if (!key || merged.has(key)) return;
    merged.set(key, {
      id: `official-theme:${key}`,
      user_id: userId,
      nome: theme.nome,
      categoria: theme.categoria,
      categoria_id: null,
      asset_url: theme.asset_url,
      logo_url: null,
      logo_path: null,
      width_px: theme.width_px,
      height_px: theme.height_px,
      greeting_text: null,
      mensagem_max_linhas: null,
      mensagem_max_palavras: null,
      assinatura_max_linhas: null,
      assinatura_max_palavras: null,
      title_style: theme.title_style,
      body_style: theme.body_style,
      signature_style: theme.signature_style,
      scope: "system",
      company_id: companyId,
      ativo: theme.ativo
    });
  });
  return Array.from(merged.values());
}
function mergeMessagesWithOfficial(userId, companyId, themes, rows) {
  const merged = /* @__PURE__ */ new Map();
  const themeIdByName = Object.fromEntries(
    themes.map((theme) => [String(theme.nome || "").trim(), String(theme.id || "").trim()])
  );
  const officialThemeCategoryByName = Object.fromEntries(
    OFFICIAL_CARD_THEMES.map((theme) => [String(theme.nome || "").trim(), String(theme.categoria || "").trim()])
  );
  rows.forEach((row) => {
    const key = `${normalizeLibraryKey(row.nome)}::${normalizeLibraryKey(row.categoria)}`;
    if (!key || merged.has(key)) return;
    merged.set(key, row);
  });
  buildOfficialTemplateRows(userId, companyId, themeIdByName).forEach((template) => {
    const categoryFromTheme = officialThemeCategoryByName[String(template.theme_id ? themes.find((theme) => theme.id === template.theme_id)?.nome || "" : "").trim()];
    const category = String(categoryFromTheme || template.categoria || "").trim();
    const key = `${normalizeLibraryKey(template.nome)}::${normalizeLibraryKey(category)}`;
    if (!key || merged.has(key)) return;
    merged.set(key, {
      id: `official-template:${normalizeLibraryKey(template.nome)}`,
      user_id: userId,
      nome: template.nome,
      assunto: template.assunto,
      titulo: template.titulo,
      corpo: template.corpo,
      assinatura: template.assinatura,
      theme_id: template.theme_id,
      title_style: template.title_style,
      body_style: template.body_style,
      signature_style: template.signature_style,
      categoria: category,
      scope: "system",
      company_id: companyId,
      ativo: template.ativo
    });
  });
  return Array.from(merged.values());
}
function isThemeLogoColumnMissingError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (!message) return false;
  return message.includes("column") && message.includes("logo_url") || message.includes("column") && message.includes("logo_path") || message.includes("logo_url does not exist") || message.includes("logo_path does not exist");
}
async function fetchThemesWithLogoFallback(client) {
  const withLogoResp = await client.from("user_message_template_themes").select(THEME_SELECT_WITH_LOGO).order("nome");
  if (!withLogoResp.error) {
    return {
      data: withLogoResp.data || [],
      error: null,
      logoColumnsAvailable: true
    };
  }
  if (!isThemeLogoColumnMissingError(withLogoResp.error)) {
    return {
      data: [],
      error: withLogoResp.error,
      logoColumnsAvailable: false
    };
  }
  const legacyResp = await client.from("user_message_template_themes").select(THEME_SELECT_LEGACY).order("nome");
  if (legacyResp.error) {
    return {
      data: [],
      error: legacyResp.error,
      logoColumnsAvailable: false
    };
  }
  const normalized = (legacyResp.data || []).map((row) => ({
    ...row,
    logo_url: null,
    logo_path: null
  }));
  return {
    data: normalized,
    error: null,
    logoColumnsAvailable: false
  };
}
async function resolveBrandingLogo(client, settings) {
  if (!settings) return null;
  const rawUrl = cleanUrl(settings.logo_url);
  const logoPath = String(settings.logo_path || extractStoragePath(rawUrl) || "").trim();
  if (logoPath) {
    try {
      const signed = await client.storage.from(LOGO_BUCKET).createSignedUrl(logoPath, 3600);
      const signedUrl = cleanUrl(signed.data?.signedUrl);
      if (signedUrl) {
        return {
          ...settings,
          logo_url: signedUrl,
          logo_path: logoPath
        };
      }
    } catch {
    }
    try {
      const publicUrl = cleanUrl(client.storage.from(LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl);
      if (publicUrl) {
        return {
          ...settings,
          logo_url: publicUrl,
          logo_path: logoPath
        };
      }
    } catch {
    }
  }
  return {
    ...settings,
    logo_url: rawUrl,
    logo_path: logoPath || null
  };
}
async function GET(event) {
  try {
    const authClient = event.locals.supabase;
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(authClient, user.id);
    const userId = user.id;
    const isMaster = scope.papel === "MASTER";
    const isAdmin = Boolean(scope.isAdmin);
    const currentCompanyId = String(scope.companyId || "").trim() || null;
    const masterCompanyIds = /* @__PURE__ */ new Set();
    if (isMaster) {
      const { data: vinculos } = await authClient.from("master_empresas").select("company_id, status").eq("master_id", userId);
      (vinculos || []).forEach((row) => {
        const status = String(row?.status || "").toLowerCase();
        const companyId = String(row?.company_id || "").trim();
        if (!companyId) return;
        if (status === "rejected") return;
        masterCompanyIds.add(companyId);
      });
    }
    if (currentCompanyId) masterCompanyIds.add(currentCompanyId);
    const dataClient = getAdminClient();
    const [catsResp, themesResp, messagesResp, sigResp, settingsResp] = await Promise.all([
      dataClient.from("crm_template_categories").select("id, nome, icone, sort_order").eq("ativo", true).order("sort_order"),
      fetchThemesWithLogoFallback(dataClient),
      dataClient.from("user_message_templates").select("id, user_id, nome, assunto, titulo, corpo, assinatura, theme_id, title_style, body_style, signature_style, categoria, scope, company_id, ativo").order("nome"),
      authClient.from("user_crm_assinaturas").select("*").eq("user_id", userId).eq("is_default", true).maybeSingle(),
      authClient.from("quote_print_settings").select("logo_url, logo_path, consultor_nome").eq("owner_user_id", userId).maybeSingle()
    ]);
    if (catsResp.error) {
      return new Response(JSON.stringify({ error: catsResp.error.message || "Erro ao carregar categorias." }), {
        status: 500
      });
    }
    if (themesResp.error) {
      return new Response(JSON.stringify({ error: themesResp.error.message || "Erro ao carregar modelos." }), {
        status: 500
      });
    }
    if (messagesResp.error) {
      return new Response(JSON.stringify({ error: messagesResp.error.message || "Erro ao carregar textos." }), {
        status: 500
      });
    }
    const visibleThemes = (themesResp.data || []).filter((row) => {
      const rowScope = normalizeScope(row.scope);
      if (isAdmin) return true;
      if (String(row.user_id || "") === userId) return true;
      if (rowScope === "system") return true;
      if (rowScope === "user") return false;
      if (rowScope === "gestor") {
        return inCompany(row.company_id, masterCompanyIds);
      }
      if (rowScope === "master") {
        return inCompany(row.company_id, masterCompanyIds);
      }
      return false;
    });
    const visibleMessages = (messagesResp.data || []).filter((row) => {
      const rowScope = normalizeScope(row.scope);
      if (isAdmin) return true;
      if (String(row.user_id || "") === userId) return true;
      if (rowScope === "system") return true;
      if (rowScope === "user") return false;
      if (rowScope === "gestor") {
        return inCompany(row.company_id, masterCompanyIds);
      }
      if (rowScope === "master") {
        return inCompany(row.company_id, masterCompanyIds);
      }
      return false;
    });
    const libraryThemes = mergeThemesWithOfficial(userId, currentCompanyId, visibleThemes);
    const libraryMessages = mergeMessagesWithOfficial(userId, currentCompanyId, libraryThemes, visibleMessages);
    let settingsRow = settingsResp.data || null;
    if (settingsResp.error) {
      const legacySettingsResp = await authClient.from("quote_print_settings").select("logo_url, consultor_nome").eq("owner_user_id", userId).maybeSingle();
      if (!legacySettingsResp.error && legacySettingsResp.data) {
        settingsRow = {
          ...legacySettingsResp.data,
          logo_path: null
        };
      }
    }
    const resolvedSettings = await resolveBrandingLogo(authClient, settingsRow);
    return new Response(
      JSON.stringify({
        userId,
        userRole: scope.papel || null,
        isAdmin,
        currentCompanyId,
        categories: catsResp.data || [],
        themes: libraryThemes,
        messages: libraryMessages,
        signature: sigResp.data || null,
        settings: resolvedSettings,
        themeLogoColumnsAvailable: Boolean(themesResp.logoColumnsAvailable)
      }),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Falha ao carregar biblioteca CRM."
      }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" }
      }
    );
  }
}
export {
  GET
};

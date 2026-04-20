const alegreyaSansRegularUrl = "/_app/immutable/assets/AlegreyaSans-Regular.CnvjZSQG.ttf";
const alegreyaSansMediumUrl = "/_app/immutable/assets/AlegreyaSans-Medium.BO8E_pYY.ttf";
const alegreyaSansBoldUrl = "/_app/immutable/assets/AlegreyaSans-Bold.BMEop1am.ttf";
const cormorantGaramondRegularUrl = "/_app/immutable/assets/CormorantGaramond-Regular.DQv4XaSs.ttf";
const cormorantGaramondMediumUrl = "/_app/immutable/assets/CormorantGaramond-Medium.Pgl8-Oo5.ttf";
const cormorantGaramondSemiBoldUrl = "/_app/immutable/assets/CormorantGaramond-SemiBold.CJWdwruJ.ttf";
const cormorantGaramondBoldUrl = "/_app/immutable/assets/CormorantGaramond-Bold.vMrVy9nA.ttf";
const dmSerifDisplayRegularUrl = "/_app/immutable/assets/DMSerifDisplay-Regular.DEPTIRtf.ttf";
const greatVibesRegularUrl = "/_app/immutable/assets/GreatVibes-Regular.DOCVuyrd.ttf";
const loraRegularUrl = "/_app/immutable/assets/Lora-Regular.DL5WywbS.ttf";
const loraBoldUrl = "/_app/immutable/assets/Lora-Bold.KZ4-sSNs.ttf";
const nunitoSansRegularUrl = "/_app/immutable/assets/NunitoSans-Regular.BNXTN3l8.ttf";
const nunitoSansSemiBoldUrl = "/_app/immutable/assets/NunitoSans-SemiBold.k8OUPwwP.ttf";
const nunitoSansBoldUrl = "/_app/immutable/assets/NunitoSans-Bold.C1KCS0oq.ttf";
const parisienneRegularUrl = "/_app/immutable/assets/Parisienne-Regular.CICqxQTd.ttf";
const playfairDisplayRegularUrl = "/_app/immutable/assets/PlayfairDisplay-Regular.DaGQPUCb.ttf";
const playfairDisplayBoldUrl = "/_app/immutable/assets/PlayfairDisplay-Bold.Dle4x85Y.ttf";
function buildCardFontFaceCss() {
  return `
@font-face {
  font-family: 'Alegreya Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${alegreyaSansRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Alegreya Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${alegreyaSansMediumUrl}') format('truetype');
}
@font-face {
  font-family: 'Alegreya Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${alegreyaSansBoldUrl}') format('truetype');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${cormorantGaramondRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${cormorantGaramondMediumUrl}') format('truetype');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('${cormorantGaramondSemiBoldUrl}') format('truetype');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${cormorantGaramondBoldUrl}') format('truetype');
}
@font-face {
  font-family: 'DM Serif Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${dmSerifDisplayRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Great Vibes';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${greatVibesRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${loraRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${loraBoldUrl}') format('truetype');
}
@font-face {
  font-family: 'Nunito Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${nunitoSansRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Nunito Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('${nunitoSansSemiBoldUrl}') format('truetype');
}
@font-face {
  font-family: 'Nunito Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${nunitoSansBoldUrl}') format('truetype');
}
@font-face {
  font-family: 'Parisienne';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${parisienneRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${playfairDisplayRegularUrl}') format('truetype');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${playfairDisplayBoldUrl}') format('truetype');
}
svg {
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
}
`.trim();
}
function resolveThemeAssetMeta(theme) {
  return {
    asset_url: String(theme?.asset_url || "").trim(),
    width_px: Number(theme?.width_px || 0),
    height_px: Number(theme?.height_px || 0)
  };
}
const canvas$5 = {
  width: 1024,
  height: 1024
};
const title$5 = {
  x: 512,
  y: 158,
  maxWidth: 700,
  fontSize: 88,
  fontWeight: 700,
  color: "#173E96",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 0.98
};
const clientName$5 = {
  x: 230,
  y: 300,
  maxWidth: 320,
  fontSize: 56,
  fontWeight: 600,
  color: "#2C937E",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "left",
  lineHeight: 1.02
};
const body$5 = {
  x: 190,
  y: 400,
  maxWidth: 600,
  fontSize: 48,
  fontWeight: 500,
  color: "#25314F",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "left",
  lineHeight: 1.16
};
const footerLead$5 = {
  x: 220,
  y: 822,
  maxWidth: 240,
  fontSize: 30,
  fontWeight: 500,
  color: "#202A40",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "left",
  lineHeight: 1.1,
  italic: false
};
const consultant$5 = {
  x: 220,
  y: 878,
  maxWidth: 360,
  fontSize: 52,
  fontWeight: 500,
  color: "#203262",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "left",
  lineHeight: 1.04
};
const consultantRole$5 = {
  x: 220,
  y: 930,
  maxWidth: 360,
  fontSize: 30,
  fontWeight: 500,
  color: "#18294C",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "left",
  lineHeight: 1.08
};
const logo$5 = {
  x: 860,
  y: 866,
  width: 126,
  height: 126
};
const birthdayElegant = {
  canvas: canvas$5,
  title: title$5,
  clientName: clientName$5,
  body: body$5,
  footerLead: footerLead$5,
  consultant: consultant$5,
  consultantRole: consultantRole$5,
  logo: logo$5
};
const canvas$4 = {
  width: 1024,
  height: 1024
};
const title$4 = {
  x: 512,
  y: 154,
  maxWidth: 720,
  fontSize: 92,
  fontWeight: 400,
  color: "#B33A68",
  fontFamily: "Parisienne, cursive",
  align: "center",
  lineHeight: 0.9
};
const clientName$4 = {
  x: 170,
  y: 304,
  maxWidth: 320,
  fontSize: 54,
  fontWeight: 700,
  color: "#A42F52",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "left",
  lineHeight: 1.02
};
const body$4 = {
  x: 152,
  y: 402,
  maxWidth: 500,
  fontSize: 46,
  fontWeight: 500,
  color: "#9A284B",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "left",
  lineHeight: 1.14
};
const footerLead$4 = {
  x: 644,
  y: 812,
  maxWidth: 260,
  fontSize: 34,
  fontWeight: 500,
  color: "#5D2E47",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.1,
  italic: false
};
const consultant$4 = {
  x: 644,
  y: 868,
  maxWidth: 360,
  fontSize: 52,
  fontWeight: 500,
  color: "#6B2C48",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 1.04
};
const consultantRole$4 = {
  x: 644,
  y: 920,
  maxWidth: 360,
  fontSize: 30,
  fontWeight: 500,
  color: "#5B3448",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.08
};
const logo$4 = {
  x: 864,
  y: 868,
  width: 124,
  height: 124
};
const womensDaySoft = {
  canvas: canvas$4,
  title: title$4,
  clientName: clientName$4,
  body: body$4,
  footerLead: footerLead$4,
  consultant: consultant$4,
  consultantRole: consultantRole$4,
  logo: logo$4
};
const canvas$3 = {
  width: 1024,
  height: 1024
};
const title$3 = {
  x: 512,
  y: 154,
  maxWidth: 720,
  fontSize: 92,
  fontWeight: 400,
  color: "#B0576D",
  fontFamily: "Parisienne, cursive",
  align: "center",
  lineHeight: 0.9
};
const clientName$3 = {
  x: 512,
  y: 298,
  maxWidth: 580,
  fontSize: 54,
  fontWeight: 700,
  color: "#A24B62",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.03
};
const body$3 = {
  x: 512,
  y: 392,
  maxWidth: 630,
  fontSize: 46,
  fontWeight: 500,
  color: "#823A54",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.14
};
const footerLead$3 = {
  x: 512,
  y: 804,
  maxWidth: 260,
  fontSize: 34,
  fontWeight: 500,
  color: "#6B4050",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.1,
  italic: false
};
const consultant$3 = {
  x: 512,
  y: 860,
  maxWidth: 380,
  fontSize: 52,
  fontWeight: 500,
  color: "#6F2F49",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 1.04
};
const consultantRole$3 = {
  x: 512,
  y: 914,
  maxWidth: 380,
  fontSize: 30,
  fontWeight: 500,
  color: "#5B3448",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.08
};
const logo$3 = {
  x: 862,
  y: 868,
  width: 124,
  height: 124
};
const mothersDayFloral = {
  canvas: canvas$3,
  title: title$3,
  clientName: clientName$3,
  body: body$3,
  footerLead: footerLead$3,
  consultant: consultant$3,
  consultantRole: consultantRole$3,
  logo: logo$3
};
const canvas$2 = {
  width: 1024,
  height: 1024
};
const title$2 = {
  x: 512,
  y: 168,
  maxWidth: 700,
  fontSize: 86,
  fontWeight: 700,
  color: "#173E96",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 0.98
};
const clientName$2 = {
  x: 512,
  y: 302,
  maxWidth: 520,
  fontSize: 52,
  fontWeight: 600,
  color: "#2A8A8A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.02
};
const body$2 = {
  x: 512,
  y: 420,
  maxWidth: 670,
  fontSize: 50,
  fontWeight: 500,
  color: "#24345A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.18
};
const footerLead$2 = {
  x: 512,
  y: 826,
  maxWidth: 260,
  fontSize: 34,
  fontWeight: 500,
  color: "#2E3853",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.1,
  italic: false
};
const consultant$2 = {
  x: 512,
  y: 882,
  maxWidth: 360,
  fontSize: 54,
  fontWeight: 500,
  color: "#203262",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 1.04
};
const consultantRole$2 = {
  x: 512,
  y: 934,
  maxWidth: 360,
  fontSize: 30,
  fontWeight: 500,
  color: "#24345A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.08
};
const logo$2 = {
  x: 856,
  y: 860,
  width: 136,
  height: 136
};
const newYearCelebration = {
  canvas: canvas$2,
  title: title$2,
  clientName: clientName$2,
  body: body$2,
  footerLead: footerLead$2,
  consultant: consultant$2,
  consultantRole: consultantRole$2,
  logo: logo$2
};
const canvas$1 = {
  width: 1024,
  height: 1024
};
const title$1 = {
  x: 512,
  y: 170,
  maxWidth: 720,
  fontSize: 86,
  fontWeight: 700,
  color: "#B12B2B",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 0.98
};
const clientName$1 = {
  x: 512,
  y: 304,
  maxWidth: 520,
  fontSize: 52,
  fontWeight: 600,
  color: "#2F7C75",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.02
};
const body$1 = {
  x: 512,
  y: 422,
  maxWidth: 670,
  fontSize: 50,
  fontWeight: 500,
  color: "#24314F",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.18
};
const footerLead$1 = {
  x: 512,
  y: 826,
  maxWidth: 260,
  fontSize: 34,
  fontWeight: 500,
  color: "#39403F",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.1,
  italic: false
};
const consultant$1 = {
  x: 512,
  y: 882,
  maxWidth: 360,
  fontSize: 54,
  fontWeight: 500,
  color: "#203262",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 1.04
};
const consultantRole$1 = {
  x: 512,
  y: 934,
  maxWidth: 360,
  fontSize: 30,
  fontWeight: 500,
  color: "#39403F",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.08
};
const logo$1 = {
  x: 856,
  y: 860,
  width: 136,
  height: 136
};
const christmasGold = {
  canvas: canvas$1,
  title: title$1,
  clientName: clientName$1,
  body: body$1,
  footerLead: footerLead$1,
  consultant: consultant$1,
  consultantRole: consultantRole$1,
  logo: logo$1
};
const canvas = {
  width: 1024,
  height: 1024
};
const title = {
  x: 512,
  y: 176,
  maxWidth: 720,
  fontSize: 84,
  fontWeight: 700,
  color: "#173E96",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 0.98
};
const clientName = {
  x: 512,
  y: 304,
  maxWidth: 560,
  fontSize: 52,
  fontWeight: 600,
  color: "#2D8A8A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.02
};
const body = {
  x: 512,
  y: 420,
  maxWidth: 680,
  fontSize: 50,
  fontWeight: 500,
  color: "#24345A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.18
};
const footerLead = {
  x: 512,
  y: 824,
  maxWidth: 260,
  fontSize: 34,
  fontWeight: 500,
  color: "#36514A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.1,
  italic: false
};
const consultant = {
  x: 512,
  y: 880,
  maxWidth: 360,
  fontSize: 54,
  fontWeight: 500,
  color: "#203262",
  fontFamily: "Cormorant Garamond, Georgia, serif",
  align: "center",
  lineHeight: 1.04
};
const consultantRole = {
  x: 512,
  y: 934,
  maxWidth: 360,
  fontSize: 30,
  fontWeight: 500,
  color: "#36514A",
  fontFamily: "Alegreya Sans, Arial, sans-serif",
  align: "center",
  lineHeight: 1.08
};
const logo = {
  x: 856,
  y: 860,
  width: 136,
  height: 136
};
const easterPastel = {
  canvas,
  title,
  clientName,
  body,
  footerLead,
  consultant,
  consultantRole,
  logo
};
const THEME_LAYOUTS = {
  "birthday-elegant": birthdayElegant,
  "womens-day-soft": womensDaySoft,
  "mothers-day-floral": mothersDayFloral,
  "new-year-celebration": newYearCelebration,
  "christmas-gold": christmasGold,
  "easter-pastel": easterPastel
};
function getCardThemeLayout(themeName) {
  const key = String(themeName || "").trim();
  return key ? THEME_LAYOUTS[key] || null : null;
}
const CARD_STYLE_SECTION_ORDER = [
  "title",
  "clientName",
  "body",
  "footerLead",
  "consultant",
  "consultantRole"
];
const MASTER_SECTION_STYLES = {
  title: {
    x: 540,
    y: 218,
    maxWidth: 840,
    fontSize: 65,
    fontWeight: 700,
    color: "#1B4F9A",
    fontFamily: "Cormorant Garamond, Georgia, serif",
    align: "center",
    lineHeight: 1.02
  },
  clientName: {
    x: 215,
    y: 380,
    maxWidth: 640,
    fontSize: 48,
    fontWeight: 700,
    color: "#265F9A",
    fontFamily: "Cormorant Garamond, Georgia, serif",
    align: "left",
    lineHeight: 1.04
  },
  body: {
    x: 215,
    y: 480,
    maxWidth: 840,
    fontSize: 42,
    fontWeight: 500,
    color: "#101828",
    fontFamily: "Alegreya Sans, Arial, sans-serif",
    align: "left",
    lineHeight: 1.18
  },
  footerLead: {
    x: 640,
    y: 880,
    maxWidth: 500,
    fontSize: 40,
    fontWeight: 500,
    color: "#1E293B",
    fontFamily: "Alegreya Sans, Arial, sans-serif",
    align: "center",
    lineHeight: 1.06,
    italic: false
  },
  consultant: {
    x: 640,
    y: 900,
    maxWidth: 500,
    fontSize: 44,
    fontWeight: 600,
    color: "#0F172A",
    fontFamily: "Alegreya Sans, Arial, sans-serif",
    align: "center",
    lineHeight: 1.05,
    italic: false
  },
  consultantRole: {
    x: 640,
    y: 940,
    maxWidth: 500,
    fontSize: 24,
    fontWeight: 500,
    color: "#334155",
    fontFamily: "Alegreya Sans, Arial, sans-serif",
    align: "center",
    lineHeight: 1.06,
    italic: false
  }
};
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function sanitizeStyle(input) {
  if (!isPlainObject(input)) return {};
  const raw = input;
  const style = {};
  if (Number.isFinite(Number(raw.x))) style.x = Number(raw.x);
  if (Number.isFinite(Number(raw.y))) style.y = Number(raw.y);
  if (Number.isFinite(Number(raw.maxWidth))) style.maxWidth = Number(raw.maxWidth);
  if (Number.isFinite(Number(raw.width))) style.width = Number(raw.width);
  if (Number.isFinite(Number(raw.fontSize))) style.fontSize = Number(raw.fontSize);
  if (raw.fontWeight !== void 0 && raw.fontWeight !== null && String(raw.fontWeight).trim()) style.fontWeight = String(raw.fontWeight).trim();
  if (typeof raw.color === "string" && raw.color.trim()) style.color = raw.color.trim();
  if (typeof raw.fontFamily === "string" && raw.fontFamily.trim()) style.fontFamily = raw.fontFamily.trim();
  if (raw.align === "left" || raw.align === "center" || raw.align === "right" || raw.align === "justify") {
    style.align = raw.align;
  }
  if (raw.textAlign === "left" || raw.textAlign === "center" || raw.textAlign === "right" || raw.textAlign === "justify") {
    style.textAlign = raw.textAlign;
  }
  if (Number.isFinite(Number(raw.lineHeight))) style.lineHeight = Number(raw.lineHeight);
  if (typeof raw.italic === "boolean") style.italic = raw.italic;
  if (raw.fontStyle === "normal" || raw.fontStyle === "italic") style.fontStyle = raw.fontStyle;
  return style;
}
function sanitizeLockedStyle(input) {
  const style = sanitizeStyle(input);
  delete style.x;
  delete style.y;
  delete style.maxWidth;
  delete style.width;
  return style;
}
function extractSectionStyle(bucket, section) {
  if (!isPlainObject(bucket)) return {};
  const nested = bucket[section];
  if (isPlainObject(nested)) return sanitizeStyle(nested);
  const hasNestedSections = CARD_STYLE_SECTION_ORDER.some((key) => isPlainObject(bucket[key]));
  if (!hasNestedSections) return sanitizeStyle(bucket);
  return {};
}
function createDefaultCardStyleMap() {
  const next = {};
  for (const section of CARD_STYLE_SECTION_ORDER) {
    next[section] = { ...MASTER_SECTION_STYLES[section] };
  }
  return next;
}
function extractStoredCardStyleMap(buckets) {
  return {
    title: extractSectionStyle(buckets?.title_style, "title"),
    clientName: extractSectionStyle(buckets?.title_style, "clientName"),
    body: extractSectionStyle(buckets?.body_style, "body"),
    footerLead: extractSectionStyle(buckets?.signature_style, "footerLead"),
    consultant: extractSectionStyle(buckets?.signature_style, "consultant"),
    consultantRole: extractSectionStyle(buckets?.signature_style, "consultantRole")
  };
}
function resolveCardStyleMap(params) {
  const result = createDefaultCardStyleMap();
  const layout = getCardThemeLayout(params?.themeName);
  if (layout) {
    if (layout.title) result.title = { ...result.title, ...sanitizeLockedStyle(layout.title) };
    if (layout.clientName) result.clientName = { ...result.clientName, ...sanitizeLockedStyle(layout.clientName) };
    if (layout.body) result.body = { ...result.body, ...sanitizeLockedStyle(layout.body) };
    if (layout.footerLead) result.footerLead = { ...result.footerLead, ...sanitizeLockedStyle(layout.footerLead) };
    if (layout.consultant) result.consultant = { ...result.consultant, ...sanitizeLockedStyle(layout.consultant) };
    if (layout.consultantRole) result.consultantRole = { ...result.consultantRole, ...sanitizeLockedStyle(layout.consultantRole) };
  }
  const themeMap = extractStoredCardStyleMap(params?.themeBuckets);
  const templateMap = extractStoredCardStyleMap(params?.templateBuckets);
  for (const section of CARD_STYLE_SECTION_ORDER) {
    result[section] = {
      ...result[section],
      ...sanitizeLockedStyle(themeMap[section]),
      ...sanitizeLockedStyle(templateMap[section]),
      ...sanitizeLockedStyle(params?.overrideMap?.[section])
    };
  }
  return result;
}
function getPrimeiroNome(nomeCompleto) {
  if (!nomeCompleto) return "";
  return nomeCompleto.trim().split(/\s+/)[0] || "";
}
function getSaudacaoPorHora(date = /* @__PURE__ */ new Date()) {
  const hora = date.getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}
function renderTemplateText(template, vars, options) {
  const nomeCompleto = (vars.nomeCompleto || "").trim();
  const primeiroNome = options?.useFullNameAsFirstName ? nomeCompleto || "Cliente" : getPrimeiroNome(nomeCompleto) || nomeCompleto || "Cliente";
  const assinatura = (vars.assinatura || vars.consultor || "").trim();
  const consultor = assinatura;
  const cargoConsultor = (vars.cargoConsultor || "").trim();
  const saudacao = getSaudacaoPorHora();
  const empresa = (vars.empresa || "").trim();
  const origem = (vars.origem || "").trim();
  const destino = (vars.destino || "").trim();
  const dataViagem = (vars.dataViagem || "").trim();
  const dataEmbarque = (vars.dataEmbarque || "").trim();
  const dataRetorno = (vars.dataRetorno || "").trim();
  const cta = (vars.cta || "").trim();
  const mensagem = (vars.mensagem || "").trim();
  return String(template || "").replace(/\[(nome|nome_completo)\]/gi, nomeCompleto || "Cliente").replace(/\[(primeiro_nome|nome_cliente|primeiro_nome_cliente)\]/gi, primeiroNome).replace(/\[(assinatura|nome_usuario|consultor)\]/gi, consultor).replace(/\[(cargo_consultor)\]/gi, cargoConsultor).replace(/\[(saudacao|saudacao_hora)\]/gi, saudacao).replace(/\[(empresa)\]/gi, empresa).replace(/\[(origem)\]/gi, origem).replace(/\[(destino)\]/gi, destino).replace(/\[(data_viagem)\]/gi, dataViagem).replace(/\[(data_embarque)\]/gi, dataEmbarque).replace(/\[(data_retorno)\]/gi, dataRetorno).replace(/\[(cta)\]/gi, cta).replace(/\[(mensagem)\]/gi, mensagem).replace(/\{\{\s*(cliente_nome|nome|nome_completo)\s*\}\}/gi, nomeCompleto || "Cliente").replace(/\{\{\s*(primeiro_nome|nome_cliente|primeiro_nome_cliente)\s*\}\}/gi, primeiroNome).replace(/\{\{\s*(consultor_nome|consultor|assinatura)\s*\}\}/gi, consultor).replace(/\{\{\s*(cargo_consultor)\s*\}\}/gi, cargoConsultor).replace(/\{\{\s*(saudacao|saudacao_hora)\s*\}\}/gi, saudacao).replace(/\{\{\s*(empresa)\s*\}\}/gi, empresa).replace(/\{\{\s*(origem)\s*\}\}/gi, origem).replace(/\{\{\s*(destino)\s*\}\}/gi, destino).replace(/\{\{\s*(data_viagem)\s*\}\}/gi, dataViagem).replace(/\{\{\s*(data_embarque)\s*\}\}/gi, dataEmbarque).replace(/\{\{\s*(data_retorno)\s*\}\}/gi, dataRetorno).replace(/\{\{\s*(cta)\s*\}\}/gi, cta).replace(/\{\{\s*(mensagem)\s*\}\}/gi, mensagem);
}
const DEFAULT_CARD_FOOTER_LEAD = "";
function buildCardClientGreeting(nomeCompleto) {
  const nome = String(nomeCompleto).trim();
  if (!nome) return "Cliente,";
  return `${getPrimeiroNome(nome) || nome},`;
}
const MASTER_WIDTH = 1080;
const MASTER_HEIGHT = 1080;
const MASTER_LAYOUT_KEY = "master-card-v1";
const DEFAULT_LOGO_SLOT_MASTER = {
  x: 848,
  y: 848,
  width: 120,
  height: 120
};
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}
function parseNum(v, fallback) {
  if (v == null) return fallback;
  const raw = String(v).trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function parseOffset(v, fallback = 0) {
  if (v == null) return fallback;
  const raw = String(v).trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(-240, Math.min(240, Math.round(n)));
}
function parseBooleanParam(v) {
  if (v == null) return void 0;
  const raw = String(v).trim().toLowerCase();
  if (!raw) return void 0;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "sim" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "nao" || raw === "não" || raw === "off") return false;
  return void 0;
}
function splitParagraph(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}
function wrapText(text, style) {
  const safeText = String(text || "").replace(/\r/g, "").trim();
  if (!safeText) return [];
  const fontSize = Number(style.fontSize || 52);
  const maxWidth = Number(style.maxWidth || style.width || 860);
  const maxChars = Math.max(8, Math.floor(maxWidth / Math.max(fontSize * 0.55, 8)));
  const paragraphs = safeText.split("\n");
  const lines = [];
  paragraphs.forEach((p) => {
    const trimmed = p.trim();
    if (!trimmed) {
      lines.push("");
      return;
    }
    const wrapped = splitParagraph(trimmed, maxChars);
    if (!wrapped.length) {
      lines.push("");
      return;
    }
    wrapped.forEach((line) => lines.push(line));
  });
  return lines;
}
function estimateWordWidth(word, fontSize) {
  const normalized = String(word || "").trim();
  if (!normalized) return Math.max(1, fontSize * 0.28);
  return Math.max(fontSize * 0.3, normalized.length * fontSize * 0.56);
}
function resolveAlign(value) {
  const align = String(value).trim().toLowerCase();
  if (align === "left" || align === "center" || align === "right" || align === "justify") return align;
  return "center";
}
function drawTextBlock(text, style) {
  const lines = wrapText(text, style);
  if (!lines.length) return "";
  const x = Number(style.x || 540);
  const y = Number(style.y || 760);
  const maxWidth = Number(style.maxWidth || style.width || 860);
  const fontSize = Number(style.fontSize || 52);
  const fontWeight = String(style.fontWeight || "500");
  const color = escapeXml(String(style.color || "#0A0A0A"));
  const fontFamily = escapeXml(String(style.fontFamily || "Alegreya Sans, Arial, sans-serif"));
  const align = resolveAlign(style.align || style.textAlign || "center");
  const lineHeight = Number(style.lineHeight || 1.2);
  const italic = style.italic || style.fontStyle === "italic" ? "italic" : "normal";
  const step = Math.round(fontSize * lineHeight);
  const textAttrs = `font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" font-style="${italic}"`;
  if (align !== "justify") {
    const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
    const tspans = lines.map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : step}">${escapeXml(line || " ")}</tspan>`).join("");
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" ${textAttrs}>${tspans}</text>`;
  }
  const lastNonEmptyLineIdx = (() => {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (String(lines[i] || "").trim()) return i;
    }
    return -1;
  })();
  const justifiedLines = lines.map((line, idx) => {
    const trimmedLine = String(line || "").trim();
    if (!trimmedLine) return "";
    const lineY = y + idx * step;
    const isLastLine = idx >= lastNonEmptyLineIdx;
    const words = trimmedLine.split(/\s+/).filter(Boolean);
    if (isLastLine || words.length < 2) {
      return `<text x="${x}" y="${lineY}" text-anchor="start" ${textAttrs}>${escapeXml(trimmedLine)}</text>`;
    }
    const totalWordWidth = words.reduce((acc, word) => acc + estimateWordWidth(word, fontSize), 0);
    const gapCount = words.length - 1;
    const calculatedGap = (maxWidth - totalWordWidth) / gapCount;
    const minGap = fontSize * 0.14;
    if (!Number.isFinite(calculatedGap) || calculatedGap < minGap) {
      return `<text x="${x}" y="${lineY}" text-anchor="start" ${textAttrs}>${escapeXml(trimmedLine)}</text>`;
    }
    let cursorX = x;
    return words.map((word, wordIndex) => {
      const node = `<text x="${cursorX.toFixed(2)}" y="${lineY}" text-anchor="start" ${textAttrs}>${escapeXml(word)}</text>`;
      cursorX += estimateWordWidth(word, fontSize);
      if (wordIndex < words.length - 1) cursorX += calculatedGap;
      return node;
    }).join("");
  }).join("");
  return justifiedLines;
}
function drawPhotoBlock(photoUrl, slot) {
  const x = Number(slot.x || 0);
  const y = Number(slot.y || 0);
  const width = Number(slot.width || 0);
  const height = Number(slot.height || 0);
  if (!photoUrl || width <= 0 || height <= 0) return "";
  const framePadding = Math.max(0, Number(slot.framePadding || 0));
  const frameRadius = Math.max(0, Number(slot.frameRadius || 0));
  const rotation = Number(slot.rotation || 0);
  const frameFill = escapeXml(String(slot.frameFill || "#FFFFFF"));
  const shadowColor = escapeXml(String(slot.shadowColor || "rgba(0,0,0,0.18)"));
  const shadowBlur = Math.max(0, Number(slot.shadowBlur || 12));
  const shadowDx = Number(slot.shadowDx || 0);
  const shadowDy = Number(slot.shadowDy || 8);
  const outerX = x - framePadding;
  const outerY = y - framePadding;
  const outerWidth = width + framePadding * 2;
  const outerHeight = height + framePadding * 2;
  const centerX = outerX + outerWidth / 2;
  const centerY = outerY + outerHeight / 2;
  const innerRadius = Math.max(0, frameRadius - Math.min(framePadding, frameRadius));
  const transform = rotation ? ` transform="rotate(${rotation} ${centerX} ${centerY})"` : "";
  return `
  <defs>
    <filter id="cardPhotoShadow" x="${outerX - 60}" y="${outerY - 60}" width="${outerWidth + 120}" height="${outerHeight + 120}" filterUnits="userSpaceOnUse">
      <feDropShadow dx="${shadowDx}" dy="${shadowDy}" stdDeviation="${shadowBlur}" flood-color="${shadowColor}" />
    </filter>
    <clipPath id="cardPhotoClip">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${innerRadius}" />
    </clipPath>
  </defs>
  <g${transform}>
    <rect x="${outerX}" y="${outerY}" width="${outerWidth}" height="${outerHeight}" rx="${frameRadius}" fill="${frameFill}" filter="url(#cardPhotoShadow)" />
    <image href="${escapeXml(photoUrl)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cardPhotoClip)" />
  </g>`;
}
function resolveLogoSlot(themeLayout, width, height) {
  const scaleX = width / MASTER_WIDTH;
  const scaleY = height / MASTER_HEIGHT;
  return {
    x: Math.round(DEFAULT_LOGO_SLOT_MASTER.x * scaleX),
    y: Math.round(DEFAULT_LOGO_SLOT_MASTER.y * scaleY),
    width: Math.round(DEFAULT_LOGO_SLOT_MASTER.width * scaleX),
    height: Math.round(DEFAULT_LOGO_SLOT_MASTER.height * scaleY)
  };
}
function drawLogoBlock(logoUrl, slot) {
  const x = Number(slot.x || 0);
  const y = Number(slot.y || 0);
  const width = Number(slot.width || 0);
  const height = Number(slot.height || 0);
  if (!logoUrl || width <= 0 || height <= 0) return "";
  return `<image href="${escapeXml(logoUrl)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`;
}
function drawMaskBlock(mask, id) {
  const x = Number(mask.x || 0);
  const y = Number(mask.y || 0);
  const width = Number(mask.width || 0);
  const height = Number(mask.height || 0);
  if (width <= 0 || height <= 0) return "";
  const radius = Math.max(0, Number(mask.radius || 0));
  const fill = escapeXml(String(mask.fill || "#FFFFFF"));
  const opacity = Math.min(1, Math.max(0, Number(mask.opacity ?? 1)));
  const blur = Math.max(0, Number(mask.blur || 0));
  if (blur > 0) {
    return `
  <defs>
    <filter id="${id}" x="${x - blur * 4}" y="${y - blur * 4}" width="${width + blur * 8}" height="${height + blur * 8}" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="${blur}" />
    </filter>
  </defs>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" opacity="${opacity}" filter="url(#${id})" />`;
  }
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" opacity="${opacity}" />`;
}
function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  if (!color) return fallback;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return color;
  return fallback;
}
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function extractSignatureTextConfig(signatureStyle) {
  const content = isRecord(signatureStyle) && isRecord(signatureStyle.content) ? signatureStyle.content : null;
  const hasFooterLead = !!content && Object.prototype.hasOwnProperty.call(content, "footerLead");
  const hasConsultantRole = !!content && Object.prototype.hasOwnProperty.call(content, "consultantRole");
  return {
    footerLead: String(content?.footerLead || "").trim(),
    consultantRole: String(content?.consultantRole || "").trim(),
    hasFooterLead,
    hasConsultantRole
  };
}
function fixedMasterStyle(params) {
  const { base, queryFontSize, queryColor, queryItalic } = params;
  const fontSize = parseNum(queryFontSize, Number(base.fontSize || 48));
  const lineHeightRaw = Number(base.lineHeight || 1.2);
  const lineHeight = Number.isFinite(lineHeightRaw) && lineHeightRaw > 0 ? lineHeightRaw : Number(base.lineHeight || 1.2);
  const fontFamily = String(base.fontFamily || "Alegreya Sans, Arial, sans-serif");
  const fontWeight = String(base.fontWeight || "500");
  const italicRaw = base.italic === true || base.fontStyle === "italic";
  const italic = queryItalic === null || queryItalic === void 0 ? italicRaw : queryItalic;
  const color = normalizeColor(queryColor || base.color, String(base.color || "#0A0A0A"));
  return {
    x: base.x,
    y: base.y,
    maxWidth: base.maxWidth,
    width: base.width,
    align: base.align || base.textAlign,
    fontSize,
    lineHeight,
    fontFamily,
    fontWeight,
    color,
    italic
  };
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isVisible(flag, fallback = true) {
  return flag === void 0 ? fallback : flag;
}
function absoluteAssetUrl(origin, assetUrl) {
  const raw = String(assetUrl || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\.?\//, "")}`;
}
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 32768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
async function resolveInlineImageHref(sourceUrl) {
  const raw = String(sourceUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw;
  if (!/^https?:/i.test(raw)) return raw;
  try {
    const resp = await fetch(raw);
    if (!resp.ok) return raw;
    const contentType = String(resp.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) return raw;
    const payload = await resp.arrayBuffer();
    if (!payload.byteLength) return raw;
    const base64 = toBase64(payload);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return raw;
  }
}
async function renderCardSvg(event) {
  const url = new URL(event.request.url);
  const client = event.locals.supabase;
  const nome = String(url.searchParams.get("nome") || "Cliente").trim() || "Cliente";
  const clienteNomeLiteralRaw = String(url.searchParams.get("cliente_nome_literal") || "").trim();
  const tituloRaw = String(url.searchParams.get("titulo") || "").trim();
  const corpoRaw = String(url.searchParams.get("corpo") || "").trim();
  const hasFooterLeadParam = url.searchParams.has("footer_lead");
  const hasCargoConsultorParam = url.searchParams.has("cargo_consultor");
  const footerLeadRaw = String(url.searchParams.get("footer_lead") || "").trim();
  const assinaturaRaw = String(url.searchParams.get("assinatura") || "").trim();
  const consultorRaw = String(url.searchParams.get("consultor") || "").trim();
  const cargoConsultorRaw = String(url.searchParams.get("cargo_consultor") || "").trim();
  const footerLeadFontSizeRaw = url.searchParams.get("footer_lead_font_size");
  const consultantFontSizeRaw = url.searchParams.get("consultant_font_size") || url.searchParams.get("signature_font_size");
  const consultantRoleFontSizeRaw = url.searchParams.get("consultant_role_font_size");
  const footerLeadItalic = parseBooleanParam(url.searchParams.get("footer_lead_italic"));
  const consultantItalic = parseBooleanParam(url.searchParams.get("consultant_italic"));
  const consultantRoleItalic = parseBooleanParam(url.searchParams.get("consultant_role_italic"));
  const textColorRaw = String(url.searchParams.get("text_color") || "").trim();
  const titleOffsetX = parseOffset(url.searchParams.get("title_offset_x"));
  const titleOffsetY = parseOffset(url.searchParams.get("title_offset_y"));
  const clientOffsetX = parseOffset(url.searchParams.get("client_offset_x"));
  const clientOffsetY = parseOffset(url.searchParams.get("client_offset_y"));
  const bodyOffsetX = parseOffset(url.searchParams.get("body_offset_x"));
  const bodyOffsetY = parseOffset(url.searchParams.get("body_offset_y"));
  const signatureOffsetX = parseOffset(url.searchParams.get("signature_offset_x"));
  const signatureOffsetY = parseOffset(url.searchParams.get("signature_offset_y"));
  const logoOffsetX = parseOffset(url.searchParams.get("logo_offset_x"));
  const logoOffsetY = parseOffset(url.searchParams.get("logo_offset_y"));
  const empresaRaw = String(url.searchParams.get("empresa") || "").trim();
  const origemRaw = String(url.searchParams.get("origem") || "").trim();
  const destinoRaw = String(url.searchParams.get("destino") || "").trim();
  const dataViagemRaw = String(url.searchParams.get("data_viagem") || "").trim();
  const dataEmbarqueRaw = String(url.searchParams.get("data_embarque") || "").trim();
  const dataRetornoRaw = String(url.searchParams.get("data_retorno") || "").trim();
  const ctaRaw = String(url.searchParams.get("cta") || "").trim();
  const mensagemRaw = String(url.searchParams.get("mensagem") || "").trim();
  const photoUrlRaw = String(url.searchParams.get("photo_url") || url.searchParams.get("photo") || "").trim();
  const logoUrlRaw = String(url.searchParams.get("logo_url") || url.searchParams.get("logo") || "").trim();
  const templateId = String(url.searchParams.get("template_id") || "").trim();
  let themeId = String(url.searchParams.get("theme_id") || "").trim();
  const themeName = String(url.searchParams.get("theme_name") || url.searchParams.get("theme_key") || "").trim();
  const themeAssetUrlFromQuery = String(url.searchParams.get("theme_asset_url") || "").trim();
  let templateRow = null;
  if (templateId) {
    const tplResp = await client.from("user_message_templates").select("id, titulo, corpo, assinatura, theme_id, title_style, body_style, signature_style").eq("id", templateId).maybeSingle();
    if (!tplResp.error && tplResp.data) {
      templateRow = tplResp.data;
      if (!themeId && templateRow.theme_id) themeId = String(templateRow.theme_id);
    }
  }
  let themeRow = null;
  if (themeId || themeName) {
    let themeQuery = client.from("user_message_template_themes").select("id, nome, asset_url, width_px, height_px, title_style, body_style, signature_style");
    if (themeId) themeQuery = themeQuery.eq("id", themeId);
    else themeQuery = themeQuery.eq("nome", themeName);
    const themeResp = await themeQuery.maybeSingle();
    if (!themeResp.error && themeResp.data) themeRow = themeResp.data;
    if (!themeId && themeRow?.id) themeId = String(themeRow.id);
  }
  const activeThemeName = themeName || String(themeRow?.nome || "").trim();
  const resolvedThemeAsset = resolveThemeAssetMeta(
    themeRow ? {
      nome: themeRow.nome,
      asset_url: themeRow.asset_url,
      width_px: themeRow.width_px,
      height_px: themeRow.height_px
    } : null
  );
  const themeLayout = getCardThemeLayout(activeThemeName);
  const width = parseNum(url.searchParams.get("width"), MASTER_WIDTH);
  const height = parseNum(url.searchParams.get("height"), MASTER_HEIGHT);
  const resolvedStyleMap = resolveCardStyleMap();
  const titleStyle = fixedMasterStyle({
    base: resolvedStyleMap.title
  });
  const clientNameStyle = fixedMasterStyle({
    base: resolvedStyleMap.clientName
  });
  const bodyStyle = fixedMasterStyle({
    base: resolvedStyleMap.body
  });
  const footerLeadStyle = fixedMasterStyle({
    base: resolvedStyleMap.footerLead,
    queryFontSize: footerLeadFontSizeRaw,
    queryItalic: footerLeadItalic
  });
  const consultantStyle = fixedMasterStyle({
    base: resolvedStyleMap.consultant,
    queryFontSize: consultantFontSizeRaw,
    queryItalic: consultantItalic
  });
  const consultantRoleStyle = fixedMasterStyle({
    base: resolvedStyleMap.consultantRole,
    queryFontSize: consultantRoleFontSizeRaw,
    queryItalic: consultantRoleItalic
  });
  const unifiedTextColor = normalizeColor(textColorRaw, "#1B4F9A");
  if (unifiedTextColor) {
    titleStyle.color = unifiedTextColor;
    clientNameStyle.color = unifiedTextColor;
    bodyStyle.color = unifiedTextColor;
    footerLeadStyle.color = unifiedTextColor;
    consultantStyle.color = unifiedTextColor;
    consultantRoleStyle.color = unifiedTextColor;
  }
  titleStyle.x = Number(titleStyle.x || 0) + titleOffsetX;
  titleStyle.y = Number(titleStyle.y || 0) + titleOffsetY;
  clientNameStyle.x = Number(clientNameStyle.x || 0) + clientOffsetX;
  clientNameStyle.y = Number(clientNameStyle.y || 0) + clientOffsetY;
  bodyStyle.x = Number(bodyStyle.x || 0) + bodyOffsetX;
  bodyStyle.y = Number(bodyStyle.y || 0) + bodyOffsetY;
  footerLeadStyle.x = Number(footerLeadStyle.x || 0) + signatureOffsetX;
  footerLeadStyle.y = Number(footerLeadStyle.y || 0) + signatureOffsetY;
  consultantStyle.x = Number(consultantStyle.x || 0) + signatureOffsetX;
  consultantStyle.y = Number(consultantStyle.y || 0) + signatureOffsetY;
  consultantRoleStyle.x = Number(consultantRoleStyle.x || 0) + signatureOffsetX;
  consultantRoleStyle.y = Number(consultantRoleStyle.y || 0) + signatureOffsetY;
  const titulo = tituloRaw || templateRow?.titulo || `${nome}, feliz aniversário!`;
  const corpo = corpoRaw || templateRow?.corpo || "Que seu novo ano seja cheio de viagens, conquistas e momentos inesquecíveis.";
  const signatureTheme = extractSignatureTextConfig(themeRow?.signature_style);
  const signatureTemplate = extractSignatureTextConfig(templateRow?.signature_style);
  const hasFooterLeadConfig = signatureTemplate.hasFooterLead || signatureTheme.hasFooterLead;
  const hasConsultantRoleConfig = signatureTemplate.hasConsultantRole || signatureTheme.hasConsultantRole;
  const footerLeadConfig = signatureTemplate.hasFooterLead ? signatureTemplate.footerLead : signatureTheme.footerLead;
  const consultantRoleConfig = signatureTemplate.hasConsultantRole ? signatureTemplate.consultantRole : signatureTheme.consultantRole;
  const assinatura = assinaturaRaw || templateRow?.assinatura || consultorRaw || "";
  const consultor = consultorRaw || assinatura || "Equipe vtur";
  const footerLead2 = hasFooterLeadParam ? footerLeadRaw : hasFooterLeadConfig ? footerLeadConfig : DEFAULT_CARD_FOOTER_LEAD;
  const cargoConsultor = hasCargoConsultorParam ? cargoConsultorRaw : hasConsultantRoleConfig ? consultantRoleConfig : "";
  const renderVars = {
    nomeCompleto: nome,
    assinatura: consultor,
    consultor,
    cargoConsultor,
    empresa: empresaRaw,
    origem: origemRaw,
    destino: destinoRaw,
    dataViagem: dataViagemRaw,
    dataEmbarque: dataEmbarqueRaw,
    dataRetorno: dataRetornoRaw,
    cta: ctaRaw,
    mensagem: mensagemRaw
  };
  const forceNomeCompleto = Boolean(clienteNomeLiteralRaw);
  const titleText = renderTemplateText(titulo, renderVars, {
    useFullNameAsFirstName: forceNomeCompleto
  });
  const clientNameTemplate = String(url.searchParams.get("cliente_nome") || "").trim();
  const clientNameText = clienteNomeLiteralRaw ? clienteNomeLiteralRaw : clientNameTemplate ? renderTemplateText(clientNameTemplate, renderVars, {
    useFullNameAsFirstName: true
  }) : buildCardClientGreeting(nome);
  const bodyTextRaw = renderTemplateText(corpo, {
    ...renderVars,
    mensagem: mensagemRaw || corpo
  }, {
    useFullNameAsFirstName: forceNomeCompleto
  });
  const bodyTextNoFooter = bodyTextRaw.replace(/\n+\s*com carinho\s*$/i, "").replace(/\n+\s*consultor(?:a)? de viagens\s*$/i, "").replace(new RegExp(`\\n+\\s*${escapeRegex(consultor)}\\s*$`, "i"), "").trim();
  const bodyText = bodyTextNoFooter || bodyTextRaw;
  const footerLeadText = renderTemplateText(footerLead2, renderVars, {
    useFullNameAsFirstName: forceNomeCompleto
  });
  const consultantNameText = renderTemplateText("[CONSULTOR]", renderVars);
  const consultantRoleText = renderTemplateText("[CARGO_CONSULTOR]", renderVars);
  const showPhoto = Boolean(photoUrlRaw && themeLayout?.photo);
  const hideClientName = Boolean(showPhoto && themeLayout?.photo?.hideClientNameWhenPhoto);
  const hideBody = Boolean(showPhoto && themeLayout?.photo?.hideBodyWhenPhoto);
  const visibility = themeLayout?.visibility;
  const logoUrl = await resolveInlineImageHref(absoluteAssetUrl(url.origin, logoUrlRaw));
  const backgroundUrl = await resolveInlineImageHref(
    absoluteAssetUrl(
      url.origin,
      themeAssetUrlFromQuery || resolvedThemeAsset.asset_url
    )
  );
  const logoSlotBase = resolveLogoSlot(themeLayout, width, height);
  const logoSlot = {
    ...logoSlotBase,
    x: Number(logoSlotBase.x || 0) + logoOffsetX,
    y: Number(logoSlotBase.y || 0) + logoOffsetY
  };
  const fontFaceCss = buildCardFontFaceCss();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <metadata>${MASTER_LAYOUT_KEY}</metadata>
  <style><![CDATA[
${fontFaceCss}
  ]]></style>
  <rect width="${width}" height="${height}" fill="#F5F8FC" />
  ${backgroundUrl ? `<image href="${escapeXml(backgroundUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />` : ""}
  ${showPhoto ? drawPhotoBlock(photoUrlRaw, themeLayout?.photo) : ""}
  ${themeLayout?.clientNameMask ? drawMaskBlock(themeLayout.clientNameMask, `clientNameMask-${activeThemeName || "default"}`) : ""}
  ${isVisible(visibility?.title) ? drawTextBlock(titleText, titleStyle) : ""}
  ${hideClientName || !isVisible(visibility?.clientName) ? "" : drawTextBlock(clientNameText, clientNameStyle)}
  ${hideBody || !isVisible(visibility?.body) ? "" : drawTextBlock(bodyText, bodyStyle)}
  ${isVisible(visibility?.footerLead) ? drawTextBlock(footerLeadText, footerLeadStyle) : ""}
  ${isVisible(visibility?.consultant) ? drawTextBlock(consultantNameText, consultantStyle) : ""}
  ${isVisible(visibility?.consultantRole) ? drawTextBlock(consultantRoleText, consultantRoleStyle) : ""}
  ${logoUrl && isVisible(visibility?.logo) ? drawLogoBlock(logoUrl, logoSlot) : ""}
</svg>`;
  return { svg, width, height };
}
export {
  renderCardSvg as r
};

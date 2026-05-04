const DEFAULT_ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://vtur.local";
}

export function sanitizeHref(
  value: unknown,
  allowedProtocols: string[] = DEFAULT_ALLOWED_PROTOCOLS,
) {
  const raw = String(value || "").trim();
  if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return "";
  if (/^(javascript|vbscript|data):/i.test(raw)) return "";

  if (raw.startsWith("/")) {
    return raw.startsWith("//") || raw.startsWith("/\\") ? "" : raw;
  }

  try {
    const parsed = new URL(raw, getBaseUrl());
    if (!allowedProtocols.includes(parsed.protocol)) return "";
    return raw;
  } catch {
    return "";
  }
}

export function safeOpenNewTab(value: unknown, allowedProtocols?: string[]) {
  const href = sanitizeHref(value, allowedProtocols);
  if (!href || typeof window === "undefined") return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}

export function sanitizeAbsoluteHttpUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return "";
  if (/^(javascript|vbscript|data):/i.test(raw)) return "";

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

export function encodeStoragePathSegment(value: unknown) {
  return String(value || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

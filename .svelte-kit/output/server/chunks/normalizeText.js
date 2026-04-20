function normalizeText(value, options = {}) {
  let normalized = (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (options.collapseWhitespace) {
    normalized = normalized.replace(/\s+/g, " ");
  }
  if (options.trim) {
    normalized = normalized.trim();
  }
  return normalized;
}
export {
  normalizeText as n
};

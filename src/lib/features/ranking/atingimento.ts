/**
 * Cor e percentual de atingimento de meta usados no Ranking de vendas e no Placar (Fase 5.3).
 * Código movido sem alteração da tela do ranking, para as duas telas mostrarem o mesmo número e a mesma cor.
 */

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function interpolateRgb(from: [number, number, number], to: [number, number, number], t: number) {
  const ratio = clamp(t, 0, 1);
  const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
  const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
  const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Vermelho (0%) → laranja (80%) → verde (100% ou mais). */
export function getAtingimentoColor(percentual: number) {
  const pct = clamp(percentual, 0, 100);
  if (pct < 80) return interpolateRgb([239, 68, 68], [249, 115, 22], pct / 80);
  return interpolateRgb([249, 115, 22], [34, 197, 94], (pct - 80) / 20);
}

/** Mesmo cálculo do resumo do ranking: sem meta, 0%. */
export function percentualDaMeta(realizado: number, meta: number) {
  return meta > 0 ? (realizado / meta) * 100 : 0;
}

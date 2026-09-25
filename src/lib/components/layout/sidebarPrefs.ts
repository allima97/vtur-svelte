/**
 * Preferências visuais do menu lateral (só deste navegador).
 * Não afetam quais itens aparecem: isso continua nas permissões e em "Personalizar Menu".
 */
export const SIDEBAR_EXPANDED_KEY = 'vtur:sidebar-expanded';
export const SIDEBAR_COLLAPSED_SECTIONS_KEY = 'vtur:sidebar-secoes-recolhidas';

/** Menu expandido só quando o usuário escolheu isso antes ('1'). Padrão: recolhido. */
export function readSidebarExpanded(raw: string | null): boolean {
  return raw === '1';
}

/** Lista de títulos de seção recolhidas → mapa { título: true }. Valor inválido → nenhuma. */
export function readCollapsedSections(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    const result: Record<string, boolean> = {};
    for (const entry of parsed) {
      if (typeof entry === 'string' && entry) result[entry] = true;
    }
    return result;
  } catch {
    return {};
  }
}

/** Id estável para ligar o botão da seção (aria-controls) à lista de links. */
export function sectionDomId(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `menu-secao-${slug || 'geral'}`;
}

import { describe, expect, it } from 'vitest';
import { readCollapsedSections, readSidebarExpanded, sectionDomId } from './sidebarPrefs';

describe('sidebarPrefs', () => {
  it('menu recolhido por padrão; expandido só com "1"', () => {
    expect(readSidebarExpanded(null)).toBe(false);
    expect(readSidebarExpanded('0')).toBe(false);
    expect(readSidebarExpanded('true')).toBe(false);
    expect(readSidebarExpanded('1')).toBe(true);
  });

  it('lê as seções recolhidas e ignora lixo', () => {
    expect(readCollapsedSections(null)).toEqual({});
    expect(readCollapsedSections('{quebrado')).toEqual({});
    expect(readCollapsedSections('{"a":1}')).toEqual({});
    expect(readCollapsedSections('["FINANCEIRO", 3, "", "CADASTROS"]')).toEqual({
      FINANCEIRO: true,
      CADASTROS: true
    });
  });

  it('gera ids sem acento nem espaço', () => {
    expect(sectionDomId('OPERAÇÃO')).toBe('menu-secao-operacao');
    expect(sectionDomId('PARÂMETROS')).toBe('menu-secao-parametros');
    expect(sectionDomId('')).toBe('menu-secao-geral');
  });
});

import { describe, expect, it } from 'vitest';
import { clamp, getAtingimentoColor, percentualDaMeta } from './atingimento';

describe('atingimento de meta (ranking e placar)', () => {
  it('percentual: sem meta é 0', () => {
    expect(percentualDaMeta(500, 0)).toBe(0);
    expect(percentualDaMeta(500, 1000)).toBe(50);
    expect(percentualDaMeta(1500, 1000)).toBe(150);
  });
  it('cor: vermelho, laranja em 80%, verde a partir de 100%', () => {
    expect(getAtingimentoColor(0)).toBe('rgb(239, 68, 68)');
    expect(getAtingimentoColor(80)).toBe('rgb(249, 115, 22)');
    expect(getAtingimentoColor(100)).toBe('rgb(34, 197, 94)');
    expect(getAtingimentoColor(250)).toBe('rgb(34, 197, 94)');
    expect(getAtingimentoColor(-5)).toBe('rgb(239, 68, 68)');
  });
  it('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});

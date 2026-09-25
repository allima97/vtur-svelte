/**
 * Guardas estáticas contra dois defeitos já encontrados (25/09/2026).
 * Leem os arquivos .svelte e falham se o padrão problemático voltar.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function svelteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...svelteFiles(full));
    else if (name.endsWith('.svelte')) out.push(full);
  }
  return out;
}

const files = svelteFiles(SRC).map((file) => ({
  path: relative(process.cwd(), file).replace(/\\/g, '/'),
  text: readFileSync(file, 'utf8')
}));

describe('guardas', () => {
  it('nenhum `$: x = fn();` sem argumentos (modo legado não enxerga as variáveis dentro de fn)', () => {
    // Exceções conscientes: dependem só da data de hoje, ou demonstram o problema de propósito.
    const permitidos = new Set([
      'src/routes/(app)/relatorios/ranking/+page.svelte:diasRestantesNoMes',
      'src/lib/testing/dom/harness/LegacyReactivityHarness.svelte:keyViaFuncao'
    ]);
    const achados: string[] = [];
    for (const { path, text } of files) {
      for (const match of text.matchAll(/^\s*\$:\s*(\w+)\s*=\s*\w+\(\s*\)\s*;?\s*$/gm)) {
        const id = `${path}:${match[1]}`;
        if (!permitidos.has(id)) achados.push(id);
      }
    }
    expect(achados, 'Escreva a expressão na própria linha do $: (ver PROGRESSO-MIGRACAO.md, "Filtros que não recarregavam")').toEqual([]);
  });

  it('a URL da própria tela é sincronizada com replaceState(), não com goto(..., { replaceState: true })', () => {
    // goto() dispara o beforeNavigate do layout raiz, que cancela as leituras em andamento;
    // a leitura cancelada por navegação nunca termina e a tela fica em "carregando".
    const achados = files
      .filter(({ text }) => /goto\([^)]*\{[^}]*replaceState:\s*true/s.test(text))
      .map(({ path }) => path);
    expect(achados).toEqual([]);
  });
});

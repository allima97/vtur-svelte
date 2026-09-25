/**
 * Documenta a armadilha que deixava os relatórios presos no mês atual (25/09):
 * no modo legado do Svelte, `$: chave = montarChave()` só reage às variáveis escritas
 * NA PRÓPRIA LINHA — as usadas dentro da função não contam. A chave escrita direto na linha reage.
 * Se um dia o Svelte mudar esse comportamento, este teste avisa.
 */
import { expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import LegacyReactivityHarness from './harness/LegacyReactivityHarness.svelte';

it('$: x = fn() não reage às variáveis usadas dentro de fn(); a expressão na linha reage', () => {
  const log: string[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(LegacyReactivityHarness as any, { target, props: { log } });
  flushSync();
  const input = target.querySelector('input') as HTMLInputElement;
  input.value = '2026-02';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
  expect(log.at(-1)).toBe('funcao=mes|2026-09 direta=mes|2026-02');
  unmount(app);
  target.remove();
});

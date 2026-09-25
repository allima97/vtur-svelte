/** Fase 3.6: o Dialog aberto é anunciado pelo leitor de tela com o próprio título e descrição. */
import { describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import Dialog from '$lib/components/ui/Dialog.svelte';

describe('Dialog', () => {
  it('role="dialog" nomeado pelo título (aria-labelledby) e pela descrição (aria-describedby)', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const app = mount(Dialog as any, {
      target,
      props: { open: true, title: 'Excluir venda', description: 'Esta ação não pode ser desfeita.' }
    });
    flushSync();
    await tick();
    const dialogo = document.querySelector('[role="dialog"]')!;
    expect(dialogo).toBeTruthy();
    const titulo = document.getElementById(dialogo.getAttribute('aria-labelledby')!);
    const descricao = document.getElementById(dialogo.getAttribute('aria-describedby')!);
    expect(titulo?.textContent).toBe('Excluir venda');
    expect(descricao?.textContent).toBe('Esta ação não pode ser desfeita.');
    unmount(app);
    target.remove();
  });
});

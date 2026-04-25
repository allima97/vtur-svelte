/**
 * debounce — Svelte action para atrasar chamadas em campos de busca
 *
 * Uso:
 * ```svelte
 * <input use:debounce={{ callback: onSearch }} />
 * <input use:debounce={{ delay: 500, callback: onSearch }} />
 * ```
 */

export interface DebounceParams {
  /** Atraso em ms (padrão: 300) */
  delay?: number;
  /** Função chamada após o atraso, recebe o valor atual do input */
  callback: (value: string) => void;
}

export function debounce(node: HTMLInputElement, params: DebounceParams) {
  let timer: ReturnType<typeof setTimeout>;

  function handleInput(e: Event) {
    clearTimeout(timer);
    const value = (e.target as HTMLInputElement).value;
    timer = setTimeout(() => {
      params.callback(value);
    }, params.delay ?? 300);
  }

  node.addEventListener('input', handleInput);

  return {
    update(newParams: DebounceParams) {
      params = newParams;
    },
    destroy() {
      clearTimeout(timer);
      node.removeEventListener('input', handleInput);
    }
  };
}

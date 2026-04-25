/**
 * inputMask — Svelte action para aplicar máscaras automáticas em inputs
 *
 * Uso:
 * ```svelte
 * <input use:inputMask={{ type: 'cpf' }} bind:value={cpf} />
 * ```
 */

export type MaskType = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'date' | 'rg';

export interface MaskParams {
  type: MaskType;
}

function applyMask(raw: string, type: MaskType): string {
  const n = raw.replace(/\D/g, '');

  switch (type) {
    case 'cpf':
      return n
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    case 'cnpj':
      return n
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');

    case 'phone':
      if (n.length <= 10) {
        return n
          .slice(0, 10)
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
      return n
        .slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');

    case 'cep':
      return n.slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');

    case 'date':
      return n
        .slice(0, 8)
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d{1,4})$/, '$1/$2');

    case 'rg':
      return n
        .slice(0, 9)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    default:
      return raw;
  }
}

export function inputMask(node: HTMLInputElement, params: MaskParams) {
  function onInput() {
    const prev = node.value;
    const cursor = node.selectionStart ?? prev.length;
    const masked = applyMask(prev, params.type);

    if (masked !== prev) {
      node.value = masked;
      // Ajusta cursor para não pular por causa dos separadores inseridos
      const diff = masked.length - prev.length;
      const newPos = Math.max(0, cursor + diff);
      node.setSelectionRange(newPos, newPos);
    }

    // Dispara evento 'input' para que bind:value do Svelte atualize
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Aplica imediatamente se já houver valor
  if (node.value) {
    node.value = applyMask(node.value, params.type);
  }

  node.addEventListener('input', onInput, true);

  return {
    update(newParams: MaskParams) {
      params = newParams;
    },
    destroy() {
      node.removeEventListener('input', onInput, true);
    }
  };
}

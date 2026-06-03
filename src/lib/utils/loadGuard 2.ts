import { onDestroy } from 'svelte';

export function createLoadGuard() {
  let controller: AbortController | null = null;
  let seq = 0;
  let destroyed = false;

  onDestroy(() => {
    destroyed = true;
    seq += 1;
    controller?.abort();
  });

  return {
    next() {
      controller?.abort();
      controller = new AbortController();
      seq += 1;
      return { signal: controller.signal, seq };
    },
    isCurrent(requestSeq: number) {
      return !destroyed && requestSeq === seq;
    },
    abort() {
      seq += 1;
      controller?.abort();
    }
  };
}

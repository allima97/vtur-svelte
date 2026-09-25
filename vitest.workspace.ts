import { configDefaults, defineWorkspace } from 'vitest/config';

/**
 * Dois grupos de testes:
 * - unit: os testes de sempre, em Node (arquivos *.test.ts).
 * - dom:  testes que montam componentes Svelte num navegador simulado (jsdom).
 *         Só arquivos *.dom.test.ts. Usam a versão "browser" do Svelte (mount/flushSync).
 */
export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      environment: 'node',
      exclude: [...configDefaults.exclude, '**/*.dom.test.ts']
    }
  },
  {
    extends: './vite.config.ts',
    resolve: { conditions: ['browser'] },
    test: {
      name: 'dom',
      environment: 'jsdom',
      include: ['**/*.dom.test.ts'],
      setupFiles: ['./src/lib/testing/dom/setup.ts']
    }
  }
]);

// Ambiente dos testes *.dom.test.ts (jsdom).
// O jsdom não implementa matchMedia; alguns componentes (Flowbite, layout) consultam na montagem.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    }
  })) as unknown as typeof window.matchMedia;
}

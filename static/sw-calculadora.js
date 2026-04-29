const CACHE_NAME = 'vtur-calculadora-v1';
const STATIC_ASSETS = [
  '/calculadora',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png'
];

// Instala: pré-cache dos assets principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativa: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: responde do cache se disponível, senão busca na rede
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só intercepta requests dentro do escopo da calculadora e mesma origem
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Atualiza em background
        fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          });
        }).catch(() => {});
        return cached;
      }

      return fetch(request).then((response) => {
        // Só cacheia requests GET bem-sucedidos
        if (request.method !== 'GET' || !response || response.status !== 200) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      });
    })
  );
});

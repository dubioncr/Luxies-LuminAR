const CACHE_NAME = 'luxies-luminar-v2'; // 1. Cambiamos a v2 para forzar la limpieza inicial
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icono-192.png',
  './icono-512.png',
  './manifest.json'
];

// Evento de Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Archivos esenciales guardados en caché');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Evento de Activación: Limpia cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Borrando caché antigua', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Evento Fetch: Estrategia Stale-While-Revalidate (Clave para ver actualizaciones)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que vayan a Firebase/Google APIs
  if (event.request.method !== 'GET' || event.request.url.includes('googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Abre la red en paralelo
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Si la respuesta es válida, actualiza la caché en segundo plano
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si no hay internet, no pasa nada, se maneja de forma silenciosa
      });

      // Retorna la respuesta cacheada inmediatamente (velocidad), o la de la red si no estaba en caché
      return cachedResponse || fetchPromise;
    })
  );
});
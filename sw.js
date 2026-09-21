const CACHE_NAME = 'hits20-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza a que este SW se active inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return clients.claim(); // Toma control de los clientes abiertos inmediatamente
    })
  );
});

// Interceptación de peticiones (Network First con fallback a Caché)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Bypass para el streaming de radio
  if (url.includes('stream.radiosmundiales.com') || url.includes('/stream/')) {
    return; // Permite que el navegador gestione la reproducción de audio sin pasar por fetch
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si la red funciona, clonamos la respuesta y actualizamos la caché en el fondo
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si no hay red (offline), servimos desde la caché
        return caches.match(event.request);
      })
  );
});

const CACHE_NAME = 'hits20-cache-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
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
      return clients.claim();
    })
  );
});

// Interceptación de peticiones (Network First con fallback a Caché)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Bypass para el streaming de radio
  if (url.includes('stream.radiosmundiales.com') || url.includes('/stream/')) {
    return;
  }

  // 2. Manejo de peticiones HTTP/HTTPS generales
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Permitimos tipos 'basic' y 'cors' con estado exitoso (200)
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback a la caché si no hay conexión a internet
        return caches.match(event.request);
      })
  );
});

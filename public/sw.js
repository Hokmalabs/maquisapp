// MaquisApp Service Worker
// Stratégie : Network First pour les données, Cache First pour les assets statiques

const CACHE_NAME = 'maquisapp-v1';
const STATIC_CACHE = 'maquisapp-static-v1';

// Assets à mettre en cache immédiatement à l'installation
const STATIC_ASSETS = [
  '/',
  '/offline.html',
];

// ─── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorer les erreurs de cache à l'install (fichiers peut-être pas encore dispo)
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les requêtes Supabase (toujours réseau)
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('api.qrserver.com')) return;

  // Pages /menu/* → Network First (contenu dynamique)
  if (url.pathname.startsWith('/menu/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets statiques (_next/static, images, fonts) → Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff|woff2|ico)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Tout le reste → Network First avec fallback cache
  event.respondWith(networkFirst(request));
});

// ─── Stratégies ───────────────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback offline pour les navigations HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    return new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Asset non disponible', { status: 404 });
  }
}

// ─── Push notifications (optionnel, pour les alertes commandes) ───────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'MaquisApp', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'maquisapp',
      data: data.url ? { url: data.url } : {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
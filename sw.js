// FundFlow Service Worker
// Caches all app assets for full offline functionality

const CACHE_NAME = 'fundflow-v1.0.0';
const STATIC_CACHE = 'fundflow-static-v1.0.0';

// All assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  // CDN libraries — cached on first visit for offline use
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

// ── INSTALL: pre-cache all static assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        // Cache local files strictly, CDN files best-effort
        const localFiles = PRECACHE_URLS.filter(u => !u.startsWith('http'));
        const cdnFiles   = PRECACHE_URLS.filter(u => u.startsWith('http'));

        return cache.addAll(localFiles)
          .then(() => Promise.allSettled(
            cdnFiles.map(url =>
              fetch(url, { mode: 'cors' })
                .then(res => res.ok ? cache.put(url, res) : null)
                .catch(() => null)
            )
          ));
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for static, network-first for navigation ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Navigation requests → serve index.html (SPA fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(cached => cached || fetch(request))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets & CDN libs → cache-first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => {
            // Offline fallback for images
            if (request.destination === 'image') return new Response('', { status: 404 });
            return new Response('Offline — no cached version available', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// ── BACKGROUND SYNC: notify clients of updates ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

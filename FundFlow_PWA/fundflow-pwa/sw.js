/* ═══════════════════════════════════════════════════
   FundFlow PWA — Service Worker
   Strategy:
   • App shell (HTML) → Cache First, fallback to network
   • CDN scripts (Chart.js, jsPDF etc.) → Cache First (versioned)
   • Fonts → Cache First, long TTL
   • Everything else → Network First
═══════════════════════════════════════════════════ */

const SW_VERSION   = 'fundflow-v1.0.0';
const CACHE_STATIC = SW_VERSION + '-static';
const CACHE_CDN    = SW_VERSION + '-cdn';
const CACHE_FONTS  = SW_VERSION + '-fonts';

/* Resources to pre-cache on install */
const PRECACHE_STATIC = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/maskable-512x512.png',
];

const PRECACHE_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

const PRECACHE_FONTS = [
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap',
];

/* ── INSTALL ── */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(c => c.addAll(PRECACHE_STATIC)),
      caches.open(CACHE_CDN).then(c =>
        Promise.allSettled(PRECACHE_CDN.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => res.ok ? c.put(url, res) : null)
            .catch(() => null)
        ))
      ),
      caches.open(CACHE_FONTS).then(c =>
        Promise.allSettled(PRECACHE_FONTS.map(url =>
          fetch(url).then(res => res.ok ? c.put(url, res) : null).catch(() => null)
        ))
      ),
    ]).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE — clean old caches ── */
self.addEventListener('activate', event => {
  const VALID = [CACHE_STATIC, CACHE_CDN, CACHE_FONTS];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET & chrome-extension requests */
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* CDN scripts — Cache First */
  if (url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(cacheFirst(request, CACHE_CDN));
    return;
  }

  /* Google Fonts — Cache First */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_FONTS));
    return;
  }

  /* App shell — Cache First with network fallback */
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  /* Icons & manifest — Cache First */
  if (url.pathname.includes('/icons/') || url.pathname.endsWith('manifest.json')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  /* Everything else — Network First */
  event.respondWith(networkFirst(request, CACHE_STATIC));
});

/* ── STRATEGIES ── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return offlineFallback();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>FundFlow — Offline</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;
        justify-content:center;background:#0a0e17;color:#e8edf5;
        font-family:'DM Sans',system-ui,sans-serif;text-align:center;padding:24px}
      .icon{font-size:56px;margin-bottom:20px}
      h1{font-size:24px;color:#00e5a0;margin-bottom:10px}
      p{color:#7e8fad;max-width:280px;line-height:1.6;font-size:14px}
      button{margin-top:24px;background:#00e5a0;color:#0a0e17;border:none;
        padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}
    </style></head>
    <body>
      <div class="icon">📊</div>
      <h1>You're Offline</h1>
      <p>FundFlow needs a connection to load. Please check your internet and try again.</p>
      <button onclick="location.reload()">Try Again</button>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

/* ── BACKGROUND SYNC (future-proof) ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

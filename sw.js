/* ACIDRATCHET Service Worker — macht die Suite offline lauffaehig.
   Strategie: beim Installieren alles in den Cache, danach network-first mit
   Cache als Rueckfall. So bekommst du online immer den frischen Stand und
   ohne Netz trotzdem die App. Beim Versionswechsel CACHE hochzaehlen. */
const CACHE = 'acidratchet-v2';
const FILES = [
  './',
  './index.html',
  './ACIDRATCHET_TD3MO_TRANSLATOR.html',
  './ACIDRATCHET_SONGBOOK.html',
  './ACIDRATCHET_FX_LAB.html',
  './acidratchet-voice.js',
  './acidratchet-fx-core.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      /* Einzeln statt addAll: eine fehlende Datei soll nicht die ganze
         Installation scheitern lassen. */
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fremde Hosts nicht anfassen
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

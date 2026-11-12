// Service worker van de preview: eerst het netwerk, zonder verbinding de laatst bewaarde versie.
const CACHE = 'lc-preview-v1';
const SHELL = [
  'gast.html', 'manifest.webmanifest', 'app/tokens.css', 'app/gast.css', 'app/gast.js', 'app/store.js', 'app/util.js',
  'app/qr.js', 'app/site-data.js', 'assets/vendor/gsap.min.js', 'assets/icon.svg',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});

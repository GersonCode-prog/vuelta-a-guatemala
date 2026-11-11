// Guarda el juego en el teléfono: la página siempre busca la versión nueva primero,
// y lo demás (código, fuentes, imágenes) sale de lo guardado para cargar rápido y sin señal.
const CACHE = 'vag-0.7.0';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const save = (res) => {
    if (res.ok) {
      const c = res.clone();
      caches.open(CACHE).then((ca) => ca.put(r, c));
    }
    return res;
  };
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(save).catch(() => caches.match(r).then((m) => m || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then(save)));
});

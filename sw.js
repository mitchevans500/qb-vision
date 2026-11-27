/* QB Vision service worker: keeps a complete copy of the game on the device so it plays with no connection.
   Every file comes from this same folder. Nothing is fetched from anywhere else and nothing is sent anywhere. */
const BUILD = '2026.11.26-f6978f';
const CACHE = 'qb-vision-' + BUILD;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './coach.mp3', './coach-2.mp3'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // all or nothing: a half-saved game must never count as installed
    await Promise.all(FILES.map(async (f) => {
      // the build tag in the address makes the host's own cache hand over this build's file, never the previous one
      const res = await fetch(new Request(f + '?v=' + BUILD, { cache: 'reload' }));
      if (!res.ok || res.redirected) throw new Error('could not save ' + f);
      await cache.put(f, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.indexOf('qb-vision-') === 0 && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // saved copy first, always: the game opens instantly and identically with or without a connection
    const hit = req.mode === 'navigate' ? await cache.match('./index.html') : await cache.match(req, { ignoreSearch: true });
    return hit || fetch(req);
  })());
});

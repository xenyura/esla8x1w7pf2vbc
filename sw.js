/* Service worker My Life: cache cangkang aplikasi + notifikasi alarm. Path relatif agar jalan di github.io/NAMA-REPO/ */
const V = 'mylife-v2';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'manifest.json', 'assets/awan.png', 'assets/cakrawala.png', 'assets/kartu.jpg', 'assets/lampu.png', 'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; /* googleapis/gsi tidak di-cache */
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});

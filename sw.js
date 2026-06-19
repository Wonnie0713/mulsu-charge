/* 멀스 모니터링 PWA 서비스워커 — 앱 셸 오프라인 캐시 */
const CACHE = 'mulsu-shell-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 동적 데이터(Firestore/Cloudinary 등)는 캐시하지 않고 항상 네트워크
  if (/firestore|googleapis|firebaseio|cloudinary/.test(url.hostname)) return;

  // 같은 출처(앱 셸): 캐시 우선, 없으면 네트워크
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }

  // CDN(Firebase SDK·Leaflet·jszip·OSM 타일 등): stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      const net = fetch(req).then(resp => { if (resp && resp.ok) c.put(req, resp.clone()); return resp; }).catch(() => cached);
      return cached || net;
    })
  );
});

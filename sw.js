// Service worker:
//  - App shell (HTML/CSS/JS/icons): stale-while-revalidate.
//  - Google Sheet CSV: network-first with cache fallback (app also keeps a
//    localStorage copy; a bad/empty response never overwrites a good cache).
const CACHE_NAME = 'grocery-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './print.css',
  './manifest.json',
  './main.js',
  './router.js',
  './state.js',
  './dom.js',
  './data.js',
  './storage.js',
  './sheets.js',
  './session.js',
  './share.js',
  './screens/home.js',
  './screens/shop.js',
  './screens/summary.js',
  './screens/settings.js',
  './screens/history.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      // addAll fails the whole install if one asset 404s; tolerate misses.
      .then(c => Promise.all(STATIC_ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isSheet(url) {
  return url.hostname.includes('docs.google.com') || url.hostname.includes('googleusercontent.com');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for the Google Sheet CSV. On failure, fall back to any cached
  // copy. We only cache responses that look like a real CSV body (not HTML/empty).
  if (isSheet(url)) {
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          copy.text().then(body => {
            const looksHtml = /^\s*</.test(body);
            if (body && body.trim() && !looksHtml) {
              caches.open(CACHE_NAME).then(c => c.put(req, resp.clone()));
            }
          });
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Stale-while-revalidate for the app shell.
  e.respondWith(
    caches.match(req).then(cached => {
      const fetching = fetch(req).then(resp => {
        if (resp && resp.status === 200 && url.origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetching;
    })
  );
});

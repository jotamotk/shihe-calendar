// 时和 · 离线缓存 Service Worker(纯静态,无追踪;失败不影响在线使用)
// 策略:网络优先(始终拿最新),离线时回退缓存——避免更新后看到旧版本。
const CACHE = 'shihe-v57';
const ASSETS = [
  './', './index.html', './onboarding.html', './privacy.html', './terms.html',
  './app_data.js', './engine_bundle.js', './analytics.js', './consent.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png',
  './assets/img/share-high.jpg', './assets/img/share-calm.jpg', './assets/img/share-rest.jpg',
  './assets/img/report-cover.jpg',
  './assets/img/sec-rhythm.jpg', './assets/img/sec-wellness.jpg', './assets/img/sec-timing.jpg',
  './assets/img/arch-vine.jpg', './assets/img/arch-sun.jpg', './assets/img/arch-lamp.jpg',
  './assets/img/arch-mountain.jpg', './assets/img/arch-field.jpg', './assets/img/arch-steel.jpg',
  './assets/img/arch-jade.jpg', './assets/img/arch-river.jpg', './assets/img/arch-rain.jpg',
  './assets/img/arch-tree.jpg',
  './assets/img/season-spring.jpg', './assets/img/season-summer.jpg',
  './assets/img/season-autumn.jpg', './assets/img/season-winter.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  let sameOrigin = false;
  try { sameOrigin = new URL(e.request.url).origin === location.origin; } catch (_) {}
  if (!sameOrigin) return; // 跨域资源不拦截
  // 网络优先:始终取最新;成功则顺手更新缓存;失败(离线)才回退缓存。
  e.respondWith(
    fetch(e.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});

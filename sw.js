// 时和 · 离线缓存 Service Worker(纯静态,无追踪;失败不影响在线使用)
// 策略:网络优先(始终拿最新),离线时回退缓存——避免更新后看到旧版本。
const CACHE = 'shihe-v177';
// 核心资源:首屏必需,原子预缓存(任一失败则整体失败,保证一致)
const CORE = [
  './', './index.html', './onboarding.html', './privacy.html', './about.html', './terms.html',
  './app_data.js', './engine_bundle.js', './analytics.js', './consent.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png'
];
// 次要资源:图片等,逐个 best-effort 缓存(单张失败不拖挂整个 SW 安装)。
// geocities.json(1.1MB,仅 onboarding 城市搜索用)不预缓存,由 fetch 处理器首次访问时按需缓存。
const EXTRA = [
  './assets/img/share-high.jpg', './assets/img/share-calm.jpg', './assets/img/share-rest.jpg',
  './assets/img/report-cover.jpg',
  './assets/img/sec-rhythm.jpg', './assets/img/sec-wellness.jpg', './assets/img/sec-timing.jpg',
  './assets/img/arch-vine.jpg', './assets/img/arch-sun.jpg', './assets/img/arch-lamp.jpg',
  './assets/img/arch-mountain.jpg', './assets/img/arch-field.jpg', './assets/img/arch-steel.jpg',
  './assets/img/arch-jade.jpg', './assets/img/arch-river.jpg', './assets/img/arch-rain.jpg',
  './assets/img/arch-tree.jpg',
  './assets/img/season-spring.jpg', './assets/img/season-summer.jpg',
  './assets/img/season-autumn.jpg', './assets/img/season-winter.jpg',
  './assets/fonts/notoserif-Regular.woff', './assets/fonts/notoserif-Bold.woff', './lxgw_common.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE).then(() => Promise.allSettled(EXTRA.map((u) => c.add(u)))))
      .then(() => self.skipWaiting())
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
  // 缓存优先 + 后台静默更新(stale-while-revalidate):
  //   旧「网络优先」在境内访问 github.io 时,每个资源都要先等一轮慢网络才回缓存 → 每次打开都卡。
  //   黄历内容由本地引擎计算,不依赖网络新鲜度;版本更新由 sw.js 自身的更新机制驱动
  //   (deploy 每次 bump CACHE → 浏览器后台装新 SW → 预取新资源 → 下次打开即新版)。
  // ignoreSearch:页面请求 engine_bundle.js?v=NNN,预缓存键不带 ?v → 不忽略则首次离线必 miss(缓存名已按版本隔离,忽略查询串安全)
  const isNav = e.request.mode === 'navigate';
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(e.request).then((res) => {
        if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, clone)); }
        return res;
      }).catch(() => {
        if (hit) return hit;
        // 只有页面导航才回退 index.html;JS/字体/图片 miss 绝不能拿 HTML 顶替(会解析报错)
        if (isNav) return caches.match('./index.html', { ignoreSearch: true });
        return Response.error();
      });
      if (hit) { try { e.waitUntil(refresh.catch(() => {})); } catch (_) {} return hit; }
      return refresh;
    })
  );
});

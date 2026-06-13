// 每次更新JS文件后，把版本号+1，手机会自动拉取新版本
const CACHE = 'wealthvault-v23';

const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // 本地 vendor（离线可用，不依赖 CDN）
  './js/vendor/react.min.js',
  './js/vendor/react-dom.min.js',
  './js/vendor/htm.umd.js',
  // 应用脚本
  './js/utils.js',
  './js/components-charts.js',
  './js/components-settings.js',
  './js/components-tx.js',
  './js/components-account.js',
  './js/components-liability.js',
  './js/components-investment.js',
  './js/auth.js',
  './js/page-overview.js',
  './js/page-accounts.js',
  './js/page-investments.js',
  './js/page-fx.js',
  './js/page-transfer.js',
  './js/page-data.js',
  './js/app.js',
];

// 安装：预缓存所有文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

// 激活：删除旧版本缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，忽略 URL 版本参数（?v=4 等）
self.addEventListener('fetch', e => {
  // 只处理 GET，跳过非 http(s) 请求
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.protocol.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(cached => cached || fetch(e.request).then(resp => {
        // 动态缓存同源资源
        if (resp.ok && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }))
  );
});

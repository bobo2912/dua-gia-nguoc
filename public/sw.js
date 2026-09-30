// Service worker tối giản: mỗi lần mở app luôn lấy index.html mới nhất từ máy chủ.
// Không lưu gì để chạy offline (tránh kẹt bản cũ). Các file JS/CSS đã có mã băm nên vẫn dùng bộ nhớ đệm bình thường.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate';
  const isVersion = url.pathname.endsWith('/version.json');
  if (!isPage && !isVersion) return;
  e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => fetch(req)));
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { store } from './engine/game';

// Mở ?debug trên URL để truy cập engine từ console trình duyệt (phục vụ kiểm thử)
if (location.search.includes('debug')) (window as unknown as { __store: unknown }).__store = store;

// ---------- Khớp chiều cao app với màn hình thật ----------
// iPhone mở app từ màn hình chính đôi khi báo chiều cao thiếu đúng bằng thanh trạng thái,
// làm hở một dải ở đáy. Đo chiều cao thật và đặt vào biến CSS --app-h.
const standalone =
  (navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
document.documentElement.classList.toggle('standalone', standalone);
function safeTop(): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
  document.body.appendChild(probe);
  const v = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return v;
}
function fitHeight() {
  const root = document.documentElement;
  if (window.innerWidth >= 520) {
    root.style.removeProperty('--app-h');
    return;
  }
  let h = window.innerHeight;
  // App tràn dưới thanh trạng thái (có tai thỏ) → vùng hiển thị là toàn bộ màn hình
  if (standalone && safeTop() > 0) {
    const portrait = window.innerHeight >= window.innerWidth;
    const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    h = Math.max(h, full);
  }
  root.style.setProperty('--app-h', `${h}px`);
}
fitHeight();
window.addEventListener('resize', fitHeight);
window.addEventListener('orientationchange', () => setTimeout(fitHeight, 300));
window.visualViewport?.addEventListener('resize', fitHeight);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

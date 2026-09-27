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
function probe(css: string, read: (el: HTMLElement) => number): number {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:0;width:1px;visibility:hidden;pointer-events:none;${css}`;
  document.body.appendChild(el);
  const v = read(el);
  el.remove();
  return v;
}
/** Khoảng tai thỏ phía trên (0 nếu app không vẽ dưới thanh trạng thái) */
const safeTop = () => probe('top:0;padding-top:env(safe-area-inset-top,0px)', (el) => parseFloat(getComputedStyle(el).paddingTop) || 0);
/** Chiều cao vùng mà trình duyệt thực sự dùng để hiển thị phần tử cố định */
const fixedHeight = () => probe('top:0;bottom:0', (el) => el.getBoundingClientRect().height);

function fitHeight() {
  const root = document.documentElement;
  if (window.innerWidth >= 520) {
    root.style.removeProperty('--app-h');
    return;
  }
  const fixed = fixedHeight();
  const vv = window.visualViewport?.height ?? window.innerHeight;
  let h: number;
  if (standalone && safeTop() > 0) {
    // App vẽ tràn dưới thanh trạng thái: vùng hiển thị là toàn bộ màn hình.
    // (iPhone có lỗi báo thiếu đúng bằng chiều cao thanh trạng thái → hở dải ở đáy)
    const portrait = window.innerHeight >= window.innerWidth;
    const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    h = Math.max(fixed, Math.min(full, fixed + safeTop()));
  } else {
    // Thanh trạng thái đặc (nền trắng/đen): lấy số NHỎ nhất để menu dưới không bao giờ bị cắt
    h = Math.min(fixed || vv, vv, window.innerHeight);
  }
  root.style.setProperty('--app-h', `${Math.round(h)}px`);
}
fitHeight();
window.addEventListener('resize', fitHeight);
window.addEventListener('orientationchange', () => setTimeout(fitHeight, 300));
window.visualViewport?.addEventListener('resize', fitHeight);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && setTimeout(fitHeight, 100));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

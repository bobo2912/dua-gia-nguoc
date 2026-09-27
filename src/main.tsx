import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Mở ?debug trên URL để truy cập engine từ console trình duyệt (phục vụ kiểm thử)
if (location.search.includes('debug')) {
  import('./engine/game').then((m) => ((window as unknown as { __store: unknown }).__store = m.store));
}

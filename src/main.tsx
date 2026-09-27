import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { store } from './engine/game';

// Mở ?debug trên URL để truy cập engine từ console trình duyệt (phục vụ kiểm thử)
if (location.search.includes('debug')) (window as unknown as { __store: unknown }).__store = store;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

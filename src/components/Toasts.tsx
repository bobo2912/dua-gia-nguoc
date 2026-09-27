import { IcClose, IcGavel } from './Icons';

export interface ToastItem {
  id: string;
  text: string;
  title?: string;
  tone: 'good' | 'warn' | 'info';
  action?: { label: string; run: () => void };
}

/** Mô phỏng thông báo đẩy trong bản web */
export function Toasts({ items, onClose }: { items: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: '#F5B301', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcGavel size={22} color="#1C1712" />
          </div>
          <div className="col grow" style={{ gap: 2 }}>
            <span className="xs muted">Đấu giá · vừa xong</span>
            {t.title && <b style={{ fontSize: 14 }}>{t.title}</b>}
            <span style={{ fontSize: 13 }}>{t.text}</span>
          </div>
          {t.action && (
            <button
              className="btn sm"
              style={{ height: 40, padding: '0 12px', flexShrink: 0 }}
              onClick={() => {
                t.action!.run();
                onClose(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="icon-btn light" style={{ width: 32, height: 32 }} aria-label="Đóng thông báo" onClick={() => onClose(t.id)}>
            <IcClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

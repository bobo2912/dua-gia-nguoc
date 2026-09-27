import { useEffect, useRef } from 'react';
import { Bee } from './Bee';

/** Hiệu ứng gõ búa ~2 giây, sau đó tự chuyển sang màn kết quả */
export function GavelOverlay({ won, onDone }: { won: boolean; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    try {
      navigator.vibrate?.([80, 60, 120]);
    } catch {
      /* không hỗ trợ rung */
    }
    const t = window.setTimeout(() => done.current(), 2100);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="gavel-stage" role="alert" aria-label="Búa đã gõ">
      <div className="slam">
        <svg className="gavel-hit" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
          <rect x="62" y="40" width="14" height="86" rx="6" fill="#8A5A00" stroke="#FFF6E0" strokeWidth="3" transform="rotate(-40 69 83)" />
          <rect x="20" y="20" width="70" height="36" rx="10" fill="#D4A017" stroke="#FFF6E0" strokeWidth="3" transform="rotate(-40 55 38)" />
        </svg>
      </div>
      <div className="display" style={{ fontSize: 44, fontWeight: 800 }}>
        GÕ BÚA!
      </div>
      <Bee size={72} mood={won ? 'joy' : 'shock'} onDark />
      <div style={{ color: 'var(--cream)', fontSize: 14 }}>Đang công bố kết quả…</div>
    </div>
  );
}

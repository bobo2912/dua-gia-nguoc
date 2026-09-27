import { useEffect, type ReactNode } from 'react';
import { useGame, useNav } from '../nav';
import { IcChart, IcDrop, IcHex, IcTrophy } from './Icons';

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div className="overlay-bg" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}

export function BottomNav() {
  const { screen, go } = useNav();
  const g = useGame();
  const pending = g.state.profile.prizes.filter((p) => p.status === 'pending').length;
  const items = [
    { id: 'lobby', label: 'Sảnh', icon: (on: boolean) => <IcHex size={24} color={on ? '#1C1712' : '#6B5E4E'} fill={on ? '#F5B301' : 'none'} /> },
    { id: 'wallet', label: 'Ví mật', icon: (on: boolean) => <IcDrop size={24} color={on ? '#1C1712' : '#6B5E4E'} fill={on ? '#F5B301' : 'none'} /> },
    { id: 'rank', label: 'Hạng', icon: (on: boolean) => <IcTrophy size={24} color={on ? '#1C1712' : '#6B5E4E'} fill={on ? '#F5B301' : 'none'} /> },
    { id: 'history', label: 'Kết quả', icon: (on: boolean) => <IcChart size={24} color={on ? '#1C1712' : '#6B5E4E'} /> },
  ] as const;
  return (
    <nav className="nav" aria-label="Điều hướng chính">
      {items.map((it) => {
        const on = screen.name === it.id;
        return (
          <button key={it.id} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={() => go({ name: it.id })}>
            {it.icon(on)}
            {it.label}
            {it.id === 'history' && pending > 0 && <span className="dot-badge">{pending}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export function PrizeImage({ size = 88, label = 'Ảnh quà' }: { size?: number; label?: string }) {
  return (
    <div className="placeholder-img" style={{ width: size, height: size }}>
      <svg width={size > 70 ? 28 : 22} height={size > 70 ? 28 : 22} viewBox="0 0 24 24" fill="none" stroke="#8A5A00" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="9" width="18" height="12" rx="2" />
        <path d="M3 13h18M12 9v12M12 9c-2-4-7-4-6-1 1 2 6 1 6 1zm0 0c2-4 7-4 6-1-1 2-6 1-6 1z" />
      </svg>
      {label}
    </div>
  );
}

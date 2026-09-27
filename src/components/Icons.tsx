// Bộ icon nét (stroke) dùng chung
import type { CSSProperties } from 'react';

interface P {
  size?: number;
  color?: string;
  style?: CSSProperties;
  fill?: string;
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const });

export const IcBack = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
);
export const IcClose = ({ size = 20, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IcDrop = ({ size = 20, color = 'currentColor', fill }: P) => (
  <svg {...base(size)} fill={fill ?? color} stroke={fill ? color : 'none'} strokeWidth="2"><path d="M12 2.5C12 2.5 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5z" /></svg>
);
export const IcHex = ({ size = 20, color = 'currentColor', fill = 'none' }: P) => (
  <svg {...base(size)} fill={fill} stroke={color} strokeWidth="2" strokeLinejoin="round"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" /></svg>
);
export const IcTrophy = ({ size = 24, color = 'currentColor', fill = 'none' }: P) => (
  <svg {...base(size)} fill={fill} stroke={color} strokeWidth="2" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1 5 3 5M17 6h3c0 3-1 5-3 5" /></svg>
);
export const IcChart = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M4 20h16M7 16V9M12 16V5M17 16v-4" /></svg>
);
export const IcClock = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></svg>
);
export const IcUsers = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6" /></svg>
);
export const IcFlame = ({ size = 16, color = '#E8591A' }: P) => (
  <svg {...base(size)} fill={color}><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 2-8 1 1 2 3 3 3 0-3 0-5 1-7z" /></svg>
);
export const IcGift = ({ size = 28, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12M12 9c-2-4-7-4-6-1 1 2 6 1 6 1zm0 0c2-4 7-4 6-1-1 2-6 1-6 1z" /></svg>
);
export const IcBell = ({ size = 18, color = 'currentColor', fill = 'none' }: P) => (
  <svg {...base(size)} fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" /></svg>
);
export const IcLock = ({ size = 20, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const IcGavel = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4l6 6M11 7l6 6M12.5 5.5l-6 6 6 6 6-6zM9 14l-6 6" /></svg>
);
export const IcCrown = ({ size = 14, color = '#fff' }: P) => (
  <svg {...base(size)} fill={color}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
);
export const IcX = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IcCircle = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.5"><circle cx="12" cy="12" r="8" /></svg>
);
export const IcSearch = ({ size = 28, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
);
export const IcThermo = ({ size = 28, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z" /><path d="M12 10v7" /></svg>
);
export const IcSnow = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M4 6l16 12M20 6L4 18M9 3l3 3 3-3M9 21l3-3 3 3" /></svg>
);
export const IcSwords = ({ size = 30, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l10 10M4 4h4M4 4v4M20 4L10 14M20 4h-4M20 4v4M7 17l-3 3M17 17l3 3M12 14l-3 3M12 14l3 3" /></svg>
);
export const IcShield = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>
);
export const IcTransfer = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h14l-4-4M20 16H6l4 4" /></svg>
);
export const IcQr = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></svg>
);
export const IcBill = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>
);
export const IcPiggy = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"><path d="M5 10c0-3 3-5 7-5s7 2 7 5v5c0 2-1 3-2 4H7c-1-1-2-2-2-4z" /><path d="M12 9v6M10 11h4" /></svg>
);
export const IcInvite = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6" /></svg>
);
export const IcCheck = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
);
export const IcSettings = ({ size = 20, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);

export function HoneyJar({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size * (80 / 72)} viewBox="0 0 72 80" aria-hidden="true">
      <rect x="14" y="6" width="44" height="12" rx="4" fill="#1C1712" />
      <path d="M10 22h52c4 0 6 4 6 8v34c0 8-6 12-14 12H18c-8 0-14-4-14-12V30c0-4 2-8 6-8z" fill="#FFF6E0" stroke="#1C1712" strokeWidth="2.5" />
      <path d="M6 36h60v16H6z" fill="#D98E04" />
      <path d="M20 22c0 6 4 6 4 12s-4 4-4 8" stroke="#D98E04" strokeWidth="5" fill="none" strokeLinecap="round" />
      <text x="36" y="49" textAnchor="middle" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="13" fill="#FFF6E0">MẬT</text>
    </svg>
  );
}

export function HexPattern() {
  return (
    <svg style={{ position: 'absolute', right: -20, top: -10, opacity: 0.18, pointerEvents: 'none' }} width="220" height="200" viewBox="0 0 220 200" aria-hidden="true">
      <g fill="none" stroke="#F5B301" strokeWidth="2">
        <path d="M40 20l26 15v30l-26 15-26-15V35z" />
        <path d="M92 50l26 15v30l-26 15-26-15V65z" />
        <path d="M144 20l26 15v30l-26 15-26-15V35z" />
        <path d="M196 50l26 15v30l-26 15-26-15V65z" />
        <path d="M144 80l26 15v30l-26 15-26-15V95z" />
        <path d="M92 110l26 15v30l-26 15-26-15v-30z" />
        <path d="M196 110l26 15v30l-26 15-26-15v-30z" />
      </g>
    </svg>
  );
}

// Mascot "Ong Bee Săn Giá" – nhân vật gốc, vẽ bằng SVG
export type BeeMood = 'happy' | 'joy' | 'worried' | 'determined' | 'shock';

interface Props {
  size?: number;
  mood?: BeeMood;
  gavel?: 'none' | 'side' | 'raised';
  onDark?: boolean;
  bodyColor?: string;
  className?: string;
}

export function Bee({ size = 80, mood = 'happy', gavel = 'none', onDark = false, bodyColor = '#F5B301', className }: Props) {
  const ink = '#1C1712';
  const outline = onDark ? '#FFF6E0' : ink;
  return (
    <svg width={size} height={size * (120 / 124)} viewBox="0 0 124 120" aria-hidden="true" className={className}>
      <path d="M50 32L42 12" stroke={outline} strokeWidth="3" strokeLinecap="round" />
      <path d="M70 32L78 12" stroke={outline} strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="12" r="5" fill={onDark ? '#F5B301' : ink} />
      <circle cx="78" cy="12" r="5" fill={onDark ? '#F5B301' : ink} />
      <ellipse cx="28" cy="46" rx="16" ry="22" fill="#EAF6FF" stroke={ink} strokeWidth="3" transform="rotate(-30 28 46)" />
      <ellipse cx="92" cy="46" rx="16" ry="22" fill="#EAF6FF" stroke={ink} strokeWidth="3" transform="rotate(30 92 46)" />
      <ellipse cx="60" cy="72" rx="38" ry="36" fill={bodyColor} stroke={outline} strokeWidth="3" />
      <path d="M29 90Q60 100 91 90" stroke={ink} strokeWidth="7" fill="none" strokeLinecap="round" />
      {mood === 'happy' && (
        <>
          <circle cx="47" cy="62" r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="73" cy="62" r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="48" cy="63" r="3.5" fill={ink} />
          <circle cx="74" cy="63" r="3.5" fill={ink} />
          <path d="M50 76Q60 86 70 76" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="39" cy="74" r="4" fill="#F28C6B" opacity="0.7" />
          <circle cx="81" cy="74" r="4" fill="#F28C6B" opacity="0.7" />
        </>
      )}
      {mood === 'joy' && (
        <>
          <path d="M41 62Q47 55 53 62" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M67 62Q73 55 79 62" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M48 74Q60 90 72 74Z" fill={ink} />
          <circle cx="38" cy="74" r="5" fill="#F28C6B" opacity="0.8" />
          <circle cx="82" cy="74" r="5" fill="#F28C6B" opacity="0.8" />
        </>
      )}
      {mood === 'worried' && (
        <>
          <path d="M40 52L53 56" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M80 52L67 56" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <circle cx="47" cy="64" r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="73" cy="64" r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="47" cy="65" r="3.5" fill={ink} />
          <circle cx="73" cy="65" r="3.5" fill={ink} />
          <path d="M50 84Q60 74 70 84" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M98 48c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" fill="#7CC3F0" stroke={ink} strokeWidth="2" />
        </>
      )}
      {mood === 'determined' && (
        <>
          <path d="M40 55L53 59" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M80 55L67 59" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <circle cx="47" cy="66" r="4" fill={ink} />
          <circle cx="73" cy="66" r="4" fill={ink} />
          <path d="M50 80H70" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === 'shock' && (
        <>
          <circle cx="47" cy="64" r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="73" cy="64" r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx="47" cy="66" r="3.5" fill={ink} />
          <circle cx="73" cy="66" r="3.5" fill={ink} />
          <ellipse cx="60" cy="81" rx="6" ry="7" fill={ink} />
        </>
      )}
      <path d="M50 97L60 102L50 107Z" fill="#D4A017" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M70 97L60 102L70 107Z" fill="#D4A017" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      {gavel === 'side' && (
        <g transform="rotate(-30 104 80)">
          <rect x="101" y="70" width="6" height="34" rx="3" fill="#8A5A00" stroke={ink} strokeWidth="2" />
          <rect x="91" y="60" width="26" height="14" rx="4" fill="#D4A017" stroke={ink} strokeWidth="2" />
        </g>
      )}
      {gavel === 'raised' && (
        <g transform="rotate(25 104 50)">
          <rect x="101" y="36" width="6" height="36" rx="3" fill="#8A5A00" stroke={ink} strokeWidth="2" />
          <rect x="89" y="22" width="30" height="16" rx="4" fill="#D4A017" stroke={ink} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

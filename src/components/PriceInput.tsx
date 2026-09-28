import { useEffect, useRef, useState } from 'react';
import type { PriceRule } from '../config';
import { fmtNum, fmtVnd, randInt } from '../engine/util';

/** Làm tròn một số tiền về bội số gần nhất của bước giá, trong khoảng cho phép */
export function snapPrice(v: number, rule: PriceRule): number {
  if (!v) return 0;
  const k = Math.max(1, Math.min(rule.levels, Math.round(v / rule.step)));
  return k * rule.step;
}

interface Props {
  rule: PriceRule;
  text: string;
  onText: (t: string) => void;
  onSubmit: () => void;
  typicalSteps: number;
  dark?: boolean;
}

/**
 * Ô nhập giá:
 * - gõ số tự do, rời ô sẽ tự làm tròn theo bước giá
 * - nút −/+ nhảy 1 bước, giữ nút thì chạy nhanh dần
 * - thanh kéo bắt vào bước giá
 */
export function PriceInput({ rule, text, onText, onSubmit, typicalSteps, dark }: Props) {
  const value = parseInt(text, 10) || 0;
  const [note, setNote] = useState('');
  const hold = useRef<{ t: number | null; n: number }>({ t: null, n: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;

  const setK = (k: number) => {
    setNote('');
    onText(String(Math.max(1, Math.min(rule.levels, k)) * rule.step));
  };
  const stepBy = (d: number) => {
    const cur = valueRef.current ? Math.round(valueRef.current / rule.step) : 0;
    setK(cur + d);
  };

  const stopHold = () => {
    if (hold.current.t !== null) window.clearTimeout(hold.current.t);
    hold.current = { t: null, n: 0 };
  };
  const startHold = (dir: 1 | -1) => {
    stopHold();
    stepBy(dir);
    const tick = () => {
      hold.current.n++;
      stepBy(dir * (hold.current.n > 15 ? 10 : 1));
      hold.current.t = window.setTimeout(tick, hold.current.n > 5 ? 60 : 140);
    };
    hold.current.t = window.setTimeout(tick, 380);
  };
  useEffect(() => stopHold, []);

  const round = () => {
    if (!value) return;
    const snapped = snapPrice(value, rule);
    if (snapped !== value) {
      onText(String(snapped));
      setNote(`Đã làm tròn thành ${fmtVnd(snapped)} theo bước giá ${fmtVnd(rule.step)}`);
    }
  };

  const k = value ? Math.round(value / rule.step) : 1;
  const stepBtn = (dir: 1 | -1) => (
    <button
      className="btn outline"
      aria-label={dir > 0 ? `Tăng ${fmtVnd(rule.step)}` : `Giảm ${fmtVnd(rule.step)}`}
      style={{ width: 44, height: 44, padding: 0, fontSize: 22, borderRadius: 12, background: 'var(--cream)', color: 'var(--ink)', touchAction: 'none', userSelect: 'none', flexShrink: 0 }}
      onPointerDown={(e) => {
        e.preventDefault();
        startHold(dir);
      }}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          stepBy(dir);
        }
      }}
    >
      {dir > 0 ? '+' : '−'}
    </button>
  );

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        {stepBtn(-1)}
        <label className="grow" style={{ position: 'relative', minWidth: 0 }}>
          <span className="visually-hidden">Giá bạn muốn ra (đồng)</span>
          <input
            id="bid-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={text ? fmtNum(value) : ''}
            onChange={(e) => {
              setNote('');
              onText(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9));
            }}
            onBlur={round}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                round();
                (e.target as HTMLInputElement).blur();
                onSubmit();
              }
            }}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: 'var(--honey-soft)',
              border: '2px solid var(--honey-deep)',
              textAlign: 'center',
              fontFamily: 'var(--display)',
              fontSize: value >= 10_000_000 ? 22 : 26,
              fontWeight: 800,
              color: 'var(--ink)',
              padding: '0 34px 0 10px',
              minWidth: 0,
            }}
          />
          <span className="display" style={{ position: 'absolute', right: 12, top: 9, fontSize: 20, fontWeight: 800, color: 'var(--honey-text)', pointerEvents: 'none' }}>
            đ
          </span>
        </label>
        {stepBtn(1)}
      </div>

      <label className="no-swipe" style={{ display: 'block' }}>
        <span className="visually-hidden">Kéo để chọn giá</span>
        <input
          type="range"
          min={1}
          max={rule.levels}
          step={1}
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#1C1712', height: 22, margin: 0 }}
        />
      </label>
      <div className="row between xs" style={{ marginTop: -4, opacity: 0.75 }}>
        <span>{fmtVnd(rule.min)}</span>
        <span>
          Bước giá <b>{fmtVnd(rule.step)}</b> · {fmtNum(rule.levels)} mức
        </span>
        <span>{fmtVnd(rule.max)}</span>
      </div>

      <div className="row" style={{ gap: 8 }}>
        {[-10, 10].map((d) => (
          <button
            key={d}
            className="btn outline sm"
            style={{ flex: 1, height: 34, border: '1.5px solid var(--line)', padding: 0, background: '#fff', color: 'var(--ink)', fontSize: 12, borderRadius: 10 }}
            onClick={() => stepBy(d)}
          >
            {d > 0 ? '+' : '−'}10 bước
          </button>
        ))}
        <button
          className="btn outline sm"
          style={{ flex: 1.2, height: 34, border: '1.5px solid var(--line)', padding: 0, background: '#fff', color: 'var(--ink)', fontSize: 12, borderRadius: 10 }}
          onClick={() => setK(randInt(1, Math.min(rule.levels, typicalSteps * 3)))}
        >
          Ngẫu nhiên
        </button>
      </div>
      {note && (
        <div className="xs" style={{ fontWeight: 600, color: dark ? 'var(--honey)' : 'var(--honey-text)' }} aria-live="polite">
          {note}
        </div>
      )}
    </div>
  );
}

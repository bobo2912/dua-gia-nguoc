import { useState } from 'react';
import { priceRule, SCAN_HALF } from '../config';
import { snapPrice } from './PriceInput';
import { roomCfg, store } from '../engine/game';
import { fmtNum, fmtTime, fmtVnd } from '../engine/util';
import { useGame } from '../nav';
import { Bee } from './Bee';
import { Sheet } from './common';
import { IcSearch, IcThermo } from './Icons';

export function ToolSheet({ kind, roomId, center, onClose }: { kind: 'scan' | 'thermo'; roomId: string; center: number; onClose: () => void }) {
  const g = useGame();
  if (!g.state.rooms[roomId].session) return null;
  return kind === 'scan' ? <ScanSheet roomId={roomId} center={center} onClose={onClose} /> : <ThermoSheet roomId={roomId} onClose={onClose} />;
}

// ---------------- Soi vùng giá ----------------
type Cell = { price: number; taken: boolean; mine: boolean };

/** Gửi giá được chọn về ô nhập giá của tổ săn */
export const PICK_EVENT = 'dau-gia:pick-price';

function ScanSheet({ roomId, center, onClose }: { roomId: string; center: number; onClose: () => void }) {
  const cfg = roomCfg(roomId);
  const rule = priceRule(cfg);
  const s = store.state.rooms[roomId].session!;
  const [text, setText] = useState(String(snapPrice(center, rule)));
  const [res, setRes] = useState<{ cells: Cell[]; at: number } | null>(null);
  const [err, setErr] = useState('');
  const c = snapPrice(parseInt(text, 10) || 0, rule);
  const left = store.scanQuota(roomId) - s.toolsUsed.scan;

  const run = () => {
    if (!c) {
      setErr('Nhập giá bạn định ra');
      return;
    }
    setText(String(c));
    const r = store.useScan(roomId, c);
    if (!r.ok) setErr(r.error!);
    else setRes({ cells: r.cells!, at: r.at! });
  };
  const pickPrice = (price: number) => {
    window.dispatchEvent(new CustomEvent(PICK_EVENT, { detail: { roomId, price } }));
    onClose();
  };

  const free = res ? res.cells.filter((x) => !x.taken && !x.mine).length : 0;

  return (
    <Sheet onClose={onClose} label="Soi vùng giá">
      <div className="row">
        <IcSearch />
        <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>
          Soi vùng giá
        </div>
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          Còn {left} lần
        </span>
      </div>

      {!res ? (
        <>
          <div className="card flat" style={{ gap: 8, padding: 14, fontSize: 14, lineHeight: 1.55 }}>
            <span>
              Xem <b>{2 * SCAN_HALF + 1} mức giá</b> quanh giá bạn định ra. Mức nào ghi <b style={{ color: 'var(--lead)' }}>Còn trống</b> là chưa ai chọn: bạn chọn mức đó sẽ là <b>người duy nhất</b> ở đó.
            </span>
            <span className="small muted">Kết quả tính tại lúc soi. Người khác vẫn có thể chọn trùng sau đó.</span>
          </div>
          <label className="field">
            Giá bạn định ra
            <div style={{ position: 'relative' }}>
              <input
                id="scan-center"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={text ? fmtNum(parseInt(text, 10) || 0) : ''}
                onChange={(e) => {
                  setErr('');
                  setText(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9));
                }}
                onBlur={() => c && setText(String(c))}
                style={{ width: '100%', paddingRight: 32 }}
              />
              <span style={{ position: 'absolute', right: 14, top: 13, fontWeight: 700 }}>đ</span>
            </div>
          </label>
          {c > 0 && (
            <span className="small muted" style={{ marginTop: -6 }}>
              Sẽ soi từ {fmtVnd(Math.max(rule.min, c - SCAN_HALF * rule.step))} đến {fmtVnd(Math.min(rule.max, c + SCAN_HALF * rule.step))} (bước {fmtVnd(rule.step)})
            </span>
          )}
          {err && <div style={{ color: 'var(--dup-text)', fontWeight: 600, fontSize: 14 }}>{err}</div>}
          <button className="btn big" onClick={run} disabled={left <= 0}>
            {left > 0 ? 'Soi ngay' : 'Hết lượt soi phiên này'}
          </button>
        </>
      ) : (
        <>
          <div className="row" style={{ background: free ? 'var(--lead-soft)' : 'var(--dup-soft)', borderRadius: 16, padding: 12, gap: 12 }}>
            <Bee size={48} mood={free >= 4 ? 'joy' : free > 0 ? 'happy' : 'worried'} />
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              {free > 0 ? (
                <>
                  Có <b>{free} mức giá còn trống</b> quanh {fmtVnd(c)}. Bấm vào một mức để chọn luôn.
                </>
              ) : (
                <>Vùng này đã kín. Thử soi vùng giá khác nhé.</>
              )}
            </div>
          </div>
          <div className="col" style={{ gap: 6 }}>
            {res.cells.map((cell) => {
              const isFree = !cell.taken && !cell.mine;
              const label = cell.mine ? (cell.taken ? 'Giá của bạn · bị trùng' : 'Giá của bạn · duy nhất') : cell.taken ? 'Đã có người chọn' : 'Còn trống';
              return (
                <button
                  key={cell.price}
                  className="row"
                  disabled={!isFree}
                  onClick={() => pickPrice(cell.price)}
                  style={{
                    minHeight: 48,
                    padding: '0 14px',
                    borderRadius: 14,
                    border: isFree ? '2px solid var(--lead)' : '1.5px solid var(--line)',
                    background: isFree ? '#fff' : cell.mine ? 'var(--honey-soft)' : '#F3EDE0',
                    opacity: 1,
                    cursor: isFree ? 'pointer' : 'default',
                    textAlign: 'left',
                    color: 'var(--ink)',
                    outline: cell.price === c ? '2px dashed var(--ink)' : undefined,
                    outlineOffset: 2,
                  }}
                >
                  <b className="display grow" style={{ fontSize: 19, color: isFree ? 'var(--ink)' : '#8C7F6E' }}>
                    {fmtVnd(cell.price)}
                  </b>
                  <span className="small" style={{ fontWeight: 700, color: isFree ? 'var(--lead)' : cell.mine ? 'var(--honey-text-strong)' : 'var(--muted)' }}>
                    {label}
                  </span>
                  {isFree && <span className="xs" style={{ fontWeight: 700, color: 'var(--lead)' }}>Chọn ›</span>}
                </button>
              );
            })}
          </div>
          <div className="xs muted">Kết quả lúc {fmtTime(res.at)}. Để công bằng, công cụ không cho biết mỗi mức có bao nhiêu người.</div>
          <button className="btn outline" onClick={onClose}>
            Quay lại ra giá
          </button>
          {left > 0 && (
            <button className="btn link" onClick={() => setRes(null)}>
              Soi vùng khác (còn {left} lần)
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

// ---------------- Nhiệt kế ----------------
function ThermoSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const cfg = roomCfg(roomId);
  const s = store.state.rooms[roomId].session!;
  const zones = store.thermoZones(roomId);
  const [res, setRes] = useState<{ zone: number | null; at: number } | null>(null);
  const [err, setErr] = useState('');
  const left = cfg.tools.thermo - s.toolsUsed.thermo;
  const names = ['THẤP', 'TRUNG', 'CAO'];
  const zoneText = (i: number) => (i === 2 ? `từ ${fmtVnd(zones[i][0])} trở lên` : `${fmtVnd(zones[i][0])} – ${fmtVnd(zones[i][1])}`);

  const run = () => {
    const r = store.useThermo(roomId);
    if (!r.ok) setErr(r.error!);
    else setRes({ zone: r.zone ?? null, at: r.at! });
  };

  return (
    <Sheet onClose={onClose} label="Nhiệt kế">
      <div className="row">
        <IcThermo />
        <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>
          Nhiệt kế
        </div>
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          Còn {left} lần
        </span>
      </div>
      {!res ? (
        <>
          <div className="card flat" style={{ gap: 8, padding: 14, fontSize: 14, lineHeight: 1.55 }}>
            Nhiệt kế cho biết <b>giá đang dẫn đầu</b> nằm ở vùng nào, nhưng không cho biết con số. Nếu giá dẫn đầu ở vùng thấp, ra giá ở vùng cao gần như chắc chắn thua.
            <div className="col" style={{ gap: 4, marginTop: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="small">
                  Vùng <b>{names[i].toLowerCase()}</b>: {zoneText(i)}
                </span>
              ))}
            </div>
          </div>
          {err && <div style={{ color: 'var(--dup-text)', fontWeight: 600, fontSize: 14 }}>{err}</div>}
          <button className="btn big" onClick={run} disabled={left <= 0}>
            {left > 0 ? 'Đo ngay' : 'Hết lượt đo phiên này'}
          </button>
        </>
      ) : (
        <>
          <div className="row" style={{ alignItems: 'stretch', gap: 16 }}>
            <div
              style={{ width: 56, display: 'flex', flexDirection: 'column-reverse', gap: 6, padding: 6, borderRadius: 28, border: '2.5px solid var(--ink)', background: '#fff' }}
              aria-hidden="true"
            >
              {zones.map((_, i) => (
                <div key={i} style={{ height: 56, borderRadius: 20, background: res.zone === i ? (i === 0 ? '#17754A' : i === 1 ? '#D98E04' : '#C2361F') : 'var(--line)' }} />
              ))}
            </div>
            <div className="col grow" style={{ justifyContent: 'space-between', gap: 8 }}>
              {[2, 1, 0].map((i) => (
                <div key={i} className="col" style={{ opacity: res.zone === i ? 1 : 0.55 }}>
                  <b style={{ fontSize: 15 }}>
                    Vùng {names[i].toLowerCase()} {res.zone === i && '← giá dẫn đầu ở đây'}
                  </b>
                  <span className="xs muted">{zoneText(i)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="row" style={{ background: 'var(--honey-soft)', borderRadius: 16, padding: 12 }}>
            <Bee size={48} mood={res.zone === null ? 'joy' : 'determined'} />
            <div className="small" style={{ lineHeight: 1.45 }}>
              {res.zone === null ? (
                <b>Chưa ai giữ ngôi đầu. Cơ hội cho bạn!</b>
              ) : (
                <>
                  Giá dẫn đầu đang ở vùng <b>{names[res.zone]}</b>. Muốn giành ngôi, hãy ra giá <b>thấp hơn</b> nó mà không trùng ai.
                </>
              )}
            </div>
          </div>
          <div className="xs muted">Kết quả lúc {fmtTime(res.at)}; người khác vẫn đang ra giá.</div>
          <button className="btn" onClick={onClose}>
            Quay lại ra giá
          </button>
        </>
      )}
    </Sheet>
  );
}

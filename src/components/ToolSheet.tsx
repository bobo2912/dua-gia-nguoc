import { useState } from 'react';
import { roomCfg, store } from '../engine/game';
import { fmtTime, fmtVnd } from '../engine/util';
import { useGame } from '../nav';
import { Bee } from './Bee';
import { Sheet } from './common';
import { IcSearch, IcThermo } from './Icons';

export function ToolSheet({ kind, roomId, onClose }: { kind: 'scan' | 'thermo'; roomId: string; onClose: () => void }) {
  const g = useGame();
  if (!g.state.rooms[roomId].session) return null;
  return kind === 'scan' ? <ScanSheet roomId={roomId} onClose={onClose} /> : <ThermoSheet roomId={roomId} onClose={onClose} />;
}

// ---------------- Soi vùng giá ----------------
function ScanSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const cfg = roomCfg(roomId);
  const s = store.state.rooms[roomId].session!;
  const maxWidth = Math.min(20, cfg.maxSteps);
  const [from, setFrom] = useState(Math.min(10, Math.max(1, cfg.maxSteps - maxWidth + 1)));
  const [width, setWidth] = useState(Math.min(11, maxWidth));
  const [res, setRes] = useState<{ empty: number; total: number; at: number } | null>(null);
  const [err, setErr] = useState('');
  const to = Math.min(cfg.maxSteps, from + width - 1);
  const left = cfg.tools.scan - s.toolsUsed.scan;

  const run = () => {
    const r = store.useScan(roomId, from, to);
    if (!r.ok) setErr(r.error!);
    else setRes({ empty: r.empty!, total: r.total!, at: r.at! });
  };

  return (
    <Sheet onClose={onClose} label="Soi vùng giá">
      <div className="row">
        <IcSearch />
        <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>
          Soi vùng giá
        </div>
      </div>
      {!res ? (
        <>
          <div className="small" style={{ lineHeight: 1.5 }}>
            Chọn một khoảng giá (tối đa {maxWidth} mức). Hệ thống cho biết có <b>bao nhiêu mức chưa ai chọn</b>, nhưng không nói là mức nào.
          </div>
          <label className="field">
            Từ giá (nghìn đồng)
            <input
              type="number"
              min={1}
              max={cfg.maxSteps}
              value={from}
              onChange={(e) => setFrom(Math.max(1, Math.min(cfg.maxSteps, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="field">
            Độ rộng: {width} mức ({fmtVnd(from * cfg.stepVnd)} – {fmtVnd(to * cfg.stepVnd)})
            <input type="range" min={3} max={maxWidth} value={width} onChange={(e) => setWidth(Number(e.target.value))} style={{ accentColor: '#1C1712', height: 32 }} />
          </label>
          {err && <div style={{ color: 'var(--dup-text)', fontWeight: 600, fontSize: 14 }}>{err}</div>}
          <button className="btn big" onClick={run} disabled={left <= 0}>
            Soi ngay · còn {left} lần
          </button>
        </>
      ) : (
        <>
          <div className="card flat" style={{ gap: 10 }}>
            <div className="small muted">
              {fmtVnd(from * cfg.stepVnd)} – {fmtVnd(to * cfg.stepVnd)}
            </div>
            <div className="display" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
              {res.empty}/{res.total} mức giá chưa ai chọn
            </div>
            <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
              {Array.from({ length: res.total }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 6,
                    background: i < res.empty ? 'var(--honey)' : 'var(--line)',
                    border: i < res.empty ? '1.5px solid var(--ink)' : 'none',
                  }}
                />
              ))}
            </div>
            <div className="xs muted" style={{ lineHeight: 1.5 }}>
              Ô sáng chỉ minh họa tỷ lệ, không phải vị trí thật. Kết quả lúc {fmtTime(res.at)}; người khác vẫn đang ra giá.
            </div>
          </div>
          <div className="row" style={{ background: 'var(--honey-soft)', borderRadius: 16, padding: 12 }}>
            <Bee size={48} mood="happy" />
            <div className="small" style={{ lineHeight: 1.45 }}>
              {res.empty === 0
                ? 'Vùng này đã kín chỗ. Thử nhắm sang vùng khác xem sao!'
                : res.empty / res.total > 0.4
                  ? 'Vùng này còn nhiều chỗ trống, dễ có giá duy nhất hơn.'
                  : 'Vùng này còn ít chỗ trống, cân nhắc kỹ trước khi ra giá.'}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Quay lại ra giá
          </button>
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
      </div>
      {!res ? (
        <>
          <div className="small" style={{ lineHeight: 1.5 }}>
            Khoảng giá của tổ được chia thành 3 vùng. Nhiệt kế cho biết <b>giá đang dẫn đầu nằm ở vùng nào</b>, không cho biết con số.
          </div>
          {err && <div style={{ color: 'var(--dup-text)', fontWeight: 600, fontSize: 14 }}>{err}</div>}
          <button className="btn big" onClick={run} disabled={left <= 0}>
            Đo ngay · còn {left} lần
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
                <div
                  key={i}
                  style={{
                    height: 56,
                    borderRadius: 20,
                    background: res.zone === i ? (i === 0 ? '#17754A' : i === 1 ? '#D98E04' : '#C2361F') : 'var(--line)',
                  }}
                />
              ))}
            </div>
            <div className="col grow" style={{ justifyContent: 'space-between', gap: 8 }}>
              {[2, 1, 0].map((i) => (
                <div key={i} className="col" style={{ opacity: res.zone === i ? 1 : 0.55 }}>
                  <b style={{ fontSize: 15 }}>
                    Vùng {names[i].toLowerCase()} {res.zone === i && '← giá dẫn đầu ở đây'}
                  </b>
                  <span className="xs muted">
                    {fmtVnd(zones[i][0] * cfg.stepVnd)} – {fmtVnd(zones[i][1] * cfg.stepVnd)}
                  </span>
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
                  Giá dẫn đầu đang ở vùng <b>{names[res.zone]}</b>. Ra giá cao hơn vùng này sẽ khó thắng.
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

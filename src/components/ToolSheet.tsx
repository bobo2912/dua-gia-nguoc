import { useState } from 'react';
import { SCAN_RADII } from '../config';
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

// ---------------- Minh họa: mỗi con số là một ô ----------------
type Cell = { n: number; people: number };
const EXAMPLE: Cell[] = [
  { n: 120, people: 3 },
  { n: 121, people: 0 },
  { n: 122, people: 1 },
  { n: 123, people: 5 },
  { n: 124, people: 0 },
  { n: 125, people: 2 },
];

function ExampleRow() {
  return (
    <div className="col" style={{ gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
        {EXAMPLE.map((c) => (
          <div
            key={c.n}
            className="col"
            style={{
              alignItems: 'center',
              gap: 2,
              padding: '6px 0',
              borderRadius: 10,
              background: c.people === 0 ? 'var(--honey)' : c.people === 1 ? 'var(--lead-soft)' : '#EFE6D2',
              border: c.people === 0 ? '1.5px solid var(--ink)' : '1.5px solid transparent',
            }}
          >
            <b style={{ fontSize: 13 }}>{c.n}đ</b>
            <span style={{ fontSize: 10, fontWeight: 600, color: c.people === 1 ? 'var(--lead)' : 'var(--muted)' }}>
              {c.people === 0 ? 'trống' : `${c.people} người`}
            </span>
          </div>
        ))}
      </div>
      <div className="xs muted" style={{ lineHeight: 1.5 }}>
        Ví dụ: 121đ và 124đ đang <b>trống</b>. Nếu bạn chọn một trong hai số này, bạn sẽ là người duy nhất ở đó. 123đ đã có 5 người nên chọn nữa là bị trùng.
      </div>
    </div>
  );
}

// ---------------- Soi vùng giá ----------------
function ScanSheet({ roomId, center, onClose }: { roomId: string; center: number; onClose: () => void }) {
  const cfg = roomCfg(roomId);
  const s = store.state.rooms[roomId].session!;
  const [text, setText] = useState(String(center));
  const [radius, setRadius] = useState(SCAN_RADII[1]);
  const [res, setRes] = useState<{ from: number; to: number; empty: number; total: number; at: number } | null>(null);
  const [err, setErr] = useState('');
  const c = parseInt(text, 10) || 0;
  const from = Math.max(cfg.minVnd, c - radius);
  const to = Math.min(cfg.maxVnd, c + radius);
  const left = store.scanQuota(roomId) - s.toolsUsed.scan;

  const run = () => {
    if (!c) {
      setErr('Nhập con số bạn định ra');
      return;
    }
    const r = store.useScan(roomId, from, to);
    if (!r.ok) setErr(r.error!);
    else setRes({ from, to, empty: r.empty!, total: r.total!, at: r.at! });
  };

  const ratio = res ? res.empty / res.total : 0;
  const verdict = !res ? null : ratio >= 0.5 ? { label: 'Nhiều chỗ trống', color: 'var(--lead)', tip: 'Vùng này dễ có giá duy nhất. Chọn một con số lẻ, ít người nghĩ tới.' } : ratio >= 0.2 ? { label: 'Còn vừa phải', color: 'var(--honey-deep)', tip: 'Vẫn còn cơ hội, nhưng nên tránh số tròn và số "đẹp".' } : { label: 'Gần kín chỗ', color: 'var(--dup)', tip: 'Vùng này đông người. Thử dịch giá sang vùng khác xem sao.' };

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
          <div className="card flat" style={{ gap: 10, padding: 14 }}>
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>
              Mỗi con số tiền là một <b>ô</b>. Muốn thắng, bạn cần đứng ở ô <b>chỉ có mình bạn</b>. Soi vùng giá đếm xem quanh con số bạn định ra còn <b>bao nhiêu ô trống</b>, tức là chưa ai chọn.
            </div>
            <ExampleRow />
          </div>

          <label className="field">
            Con số bạn định ra
            <div style={{ position: 'relative' }}>
              <input
                id="scan-center"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={text ? fmtNum(c) : ''}
                onChange={(e) => {
                  setErr('');
                  setText(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7));
                }}
                style={{ width: '100%', paddingRight: 32 }}
              />
              <span style={{ position: 'absolute', right: 14, top: 13, fontWeight: 700 }}>đ</span>
            </div>
          </label>
          <div className="col" style={{ gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Soi rộng bao nhiêu quanh số đó?</span>
            <div className="seg" role="radiogroup" aria-label="Độ rộng vùng soi">
              {SCAN_RADII.map((r) => (
                <button key={r} role="radio" aria-checked={radius === r} className={radius === r ? 'on' : ''} onClick={() => setRadius(r)}>
                  ±{r}đ
                </button>
              ))}
            </div>
            {c > 0 && (
              <span className="small muted">
                Sẽ soi {to - from + 1} con số, từ {fmtVnd(from)} đến {fmtVnd(to)}
              </span>
            )}
          </div>
          {err && <div style={{ color: 'var(--dup-text)', fontWeight: 600, fontSize: 14 }}>{err}</div>}
          <button className="btn big" onClick={run} disabled={left <= 0}>
            {left > 0 ? 'Soi ngay' : 'Hết lượt soi phiên này'}
          </button>
        </>
      ) : (
        <>
          <div className="card flat" style={{ gap: 12, padding: 16 }}>
            <div className="small muted">
              Từ {fmtVnd(res.from)} đến {fmtVnd(res.to)} ({res.total} con số)
            </div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="display" style={{ fontSize: 44, lineHeight: 1, fontWeight: 800, color: verdict!.color }}>
                {res.empty}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>ô còn trống</span>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <div style={{ height: 14, borderRadius: 7, background: '#EFE6D2', overflow: 'hidden' }} aria-hidden="true">
                <div style={{ width: `${ratio * 100}%`, height: '100%', background: verdict!.color, borderRadius: 7 }} />
              </div>
              <div className="row between small">
                <b style={{ color: verdict!.color }}>{verdict!.label}</b>
                <span className="muted">
                  {Math.round(ratio * 100)}% số trong vùng chưa ai chọn
                </span>
              </div>
            </div>
          </div>
          <div className="row" style={{ background: 'var(--honey-soft)', borderRadius: 16, padding: 12, alignItems: 'flex-start' }}>
            <Bee size={48} mood={ratio >= 0.5 ? 'joy' : ratio >= 0.2 ? 'happy' : 'worried'} />
            <div className="small" style={{ lineHeight: 1.5 }}>
              {verdict!.tip}
              <br />
              <span className="muted">Để công bằng, công cụ không cho biết ô nào trống. Kết quả lúc {fmtTime(res.at)}, người khác vẫn đang ra giá.</span>
            </div>
          </div>
          <button className="btn" onClick={onClose}>
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

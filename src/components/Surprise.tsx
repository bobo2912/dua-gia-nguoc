// Ngai vàng và sự kiện bất ngờ trong phòng săn
import { SURPRISE, THRONE } from '../config';
import { activeEvent, nextEvent } from '../engine/game';
import { ME, type Session, type ThroneRecord } from '../engine/types';
import { fmtClock, fmtDur, fmtSec, fmtVnd } from '../engine/util';
import { Bee } from './Bee';
import { IcCrown, IcEye, IcMoon, IcRain, IcX } from './Icons';
import { PICK_EVENT } from './ToolSheet';

// ------------------------- Đếm ngược tới sự kiện -------------------------
/** Cho người chơi biết sắp có sự kiện, nhưng giữ bí mật là sự kiện gì */
export function NextEventStrip({ s, now }: { s: Session; now: number }) {
  const e = nextEvent(s, now);
  if (!e) return null;
  const left = e.at - now;
  const soon = left <= 10000;
  return (
    <div className={`next-event ${soon ? 'soon' : ''}`} role="timer" aria-label={`Sự kiện bất ngờ sau ${fmtClock(left)}`}>
      <span className="next-icons" aria-hidden="true">
        <IcMoon size={16} />
        <IcEye size={16} />
        <IcRain size={16} />
      </span>
      <span className="grow" style={{ lineHeight: 1.25, minWidth: 0 }}>
        <b style={{ fontSize: 14 }}>{soon ? 'Sự kiện sắp xảy ra!' : 'Sự kiện bất ngờ sau'}</b>
        <span className="xs next-sub">Đến giờ mới biết là gì</span>
      </span>
      <span className={`display next-clock ${soon ? 'pulse' : ''}`}>{fmtClock(left)}</span>
    </div>
  );
}

// ------------------------- Băng sự kiện -------------------------
export function EventBanner({ s, now, myBidPrices }: { s: Session; now: number; myBidPrices: Set<number> }) {
  const e = activeEvent(s, now);
  if (!e) return null;
  const left = e.until - now;
  const total = e.until - e.at;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));

  if (e.kind === 'night') {
    return (
      <div className="event-card night-card" key={e.id} role="status" aria-live="polite">
        <div className="stars" aria-hidden="true" />
        <div className="row" style={{ gap: 12, position: 'relative' }}>
          <div className="event-ic" style={{ background: 'rgba(255,246,224,0.12)' }}>
            <IcMoon color="#FFE7A3" size={26} />
          </div>
          <div className="col grow" style={{ gap: 2 }}>
            <span className="event-tag" style={{ color: '#FFE7A3' }}>SỰ KIỆN · {SURPRISE.night.name.toUpperCase()}</span>
            <b style={{ fontSize: 15, lineHeight: 1.35 }}>{SURPRISE.night.desc}</b>
            <span className="xs" style={{ opacity: 0.8 }}>Công cụ tạm khóa. Trạng thái lộ ra khi trời sáng.</span>
          </div>
          <span className="display event-clock" role="timer">
            {fmtClock(left)}
          </span>
        </div>
        <div className="event-bar" style={{ background: 'rgba(255,246,224,0.15)' }}>
          <div style={{ width: `${pct}%`, background: '#FFE7A3' }} />
        </div>
      </div>
    );
  }

  if (e.kind === 'rain') {
    return (
      <div className="event-card rain-card" key={e.id} role="status" aria-live="polite">
        <div className="raindrops" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i * 0.37) % 1.4}s` }} />
          ))}
        </div>
        <div className="row" style={{ gap: 12, position: 'relative' }}>
          <div className="event-ic" style={{ background: 'var(--ink)' }}>
            <IcRain color="#F5B301" size={26} />
          </div>
          <div className="col grow" style={{ gap: 2 }}>
            <span className="event-tag" style={{ color: 'var(--honey-text-strong)' }}>SỰ KIỆN · {SURPRISE.rain.name.toUpperCase()}</span>
            <b style={{ fontSize: 15, lineHeight: 1.35 }}>Mỗi giá ra lúc này được +{SURPRISE.rain.pointsPerBid} điểm săn!</b>
            <span className="xs" style={{ color: 'var(--honey-text-strong)' }}>
              {e.rainPoints ? `Bạn đã hứng được +${e.rainPoints} điểm` : 'Các thợ săn đang ra giá dồn dập hơn'}
            </span>
          </div>
          <span className="display event-clock" role="timer">
            {fmtClock(left)}
          </span>
        </div>
        <div className="event-bar" style={{ background: 'rgba(28,23,18,0.12)' }}>
          <div style={{ width: `${pct}%`, background: 'var(--ink)' }} />
        </div>
      </div>
    );
  }

  // Hé lộ
  const r = e.reveal!;
  const cells: number[] = [];
  for (let p = r.from; p <= r.to; p += r.step) cells.push(p);
  const dups = new Set(r.dupPrices);
  const pickPrice = (price: number) => window.dispatchEvent(new CustomEvent(PICK_EVENT, { detail: { roomId: s.roomId, price } }));
  return (
    <div className="event-card reveal-card" key={e.id} role="status" aria-live="polite">
      <div className="row" style={{ gap: 12 }}>
        <div className="event-ic" style={{ background: 'var(--dup)' }}>
          <IcEye color="#fff" size={26} />
        </div>
        <div className="col grow" style={{ gap: 2 }}>
          <span className="event-tag" style={{ color: 'var(--dup-text)' }}>SỰ KIỆN · {SURPRISE.reveal.name.toUpperCase()}</span>
          <b style={{ fontSize: 15, lineHeight: 1.35 }}>
            {r.dupPrices.length ? (
              <>
                Vùng {fmtVnd(r.from)} – {fmtVnd(r.to)} có {r.dupPrices.length} mức đang bị trùng
              </>
            ) : (
              <>
                Vùng {fmtVnd(r.from)} – {fmtVnd(r.to)} chưa có mức nào bị trùng
              </>
            )}
          </b>
          <span className="xs muted">Thông tin lúc công bố, ai trong tổ cũng thấy. Bấm ô dấu hỏi để chọn giá đó.</span>
        </div>
        <span className="display event-clock" style={{ color: 'var(--dup-text)' }} role="timer">
          {fmtClock(left)}
        </span>
      </div>
      <div className="reveal-strip">
        {cells.map((p) =>
          dups.has(p) ? (
            <span key={p} className="rv-cell dup" title={`${fmtVnd(p)}: bị trùng`}>
              <IcX size={12} />
              <small>{shortVnd(p)}</small>
            </span>
          ) : (
            <button key={p} className={`rv-cell ${myBidPrices.has(p) ? 'mine' : ''}`} onClick={() => pickPrice(p)} aria-label={`Chọn giá ${fmtVnd(p)}`}>
              ?<small>{shortVnd(p)}</small>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

const shortVnd = (v: number) => (v >= 1_000_000 ? `${+(v / 1_000_000).toFixed(2)}tr` : v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`);

// ------------------------- Ngai vàng -------------------------
export function ThroneCard({
  s,
  now,
  record,
  night,
  myLeadPrice,
}: {
  s: Session;
  now: number;
  record: ThroneRecord | null | undefined;
  night: boolean;
  myLeadPrice: number | null;
  hasBids?: boolean;
}) {
  const reign = s.reign;
  const held = reign ? now - reign.since : 0;
  const mine = !!reign && reign.owner === ME;
  const myTotal = s.myThroneMs + (mine ? held : 0);
  const recMs = record?.ms ?? 0;
  const breaking = !!reign && held > recMs && recMs > 0;

  const recordLine = record ? (
    <span className="throne-rec">
      <IcCrown size={12} color="#D4A017" /> Kỷ lục tổ {fmtDur(Math.max(recMs, breaking ? held : 0))}
    </span>
  ) : null;

  if (night) {
    const e = activeEvent(s, now);
    return (
      <div className="throne-card dark">
        <div className="row between">
          <span className="event-tag" style={{ color: '#FFE7A3' }}>NGAI VÀNG</span>
          {recordLine}
        </div>
        <div className="row" style={{ gap: 12 }}>
          <Bee size={44} mood="worried" onDark />
          <div className="col" style={{ gap: 2 }}>
            <div className="display" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>
              Ngai vàng chìm trong màn đêm
            </div>
            <div className="small" style={{ opacity: 0.85 }}>
              Không ai biết ai đang ngồi ngai. Trời sáng sau {fmtClock((e?.until ?? now) - now)}.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mine) {
    const next = THRONE.milestones[s.reignAwarded];
    const prevSec = s.reignAwarded > 0 ? THRONE.milestones[s.reignAwarded - 1].sec : 0;
    const pct = next ? Math.min(100, ((held / 1000 - prevSec) / (next.sec - prevSec)) * 100) : 100;
    return (
      <div className="throne-card on">
        <div className="throne-glow" aria-hidden="true" />
        <div className="row between" style={{ position: 'relative' }}>
          <span className="event-tag" style={{ color: 'var(--honey)' }}>
            <IcCrown size={13} color="#F5B301" /> BẠN ĐANG NGỒI NGAI VÀNG
          </span>
          {recordLine}
        </div>
        <div className="row" style={{ gap: 12, position: 'relative' }}>
          <Bee size={50} mood="joy" gavel="raised" onDark />
          <div className="col grow" style={{ gap: 0 }}>
            <span className="display throne-timer" role="timer" aria-label={`Đã giữ ngai ${fmtDur(held)}`}>
              {fmtDur(held)}
            </span>
            {myLeadPrice !== null && (
              <span className="small" style={{ opacity: 0.9 }}>
                Giá <b>{fmtVnd(myLeadPrice)}</b> đang thấp nhất và duy nhất
              </span>
            )}
          </div>
        </div>
        <div className="col" style={{ gap: 6, position: 'relative' }}>
          <div className="row between xs" style={{ fontWeight: 700 }}>
            <span>{next ? `Mốc tiếp: ${next.label} · ${fmtSec(next.sec)}` : 'Đã vượt mọi mốc Ngai vàng!'}</span>
            {next && <span style={{ color: 'var(--honey)' }}>+{next.pts} điểm</span>}
          </div>
          <div className="throne-bar">
            <div style={{ width: `${pct}%` }} />
          </div>
          <div className="xs" style={{ opacity: 0.85 }}>
            {breaking ? (
              <b style={{ color: 'var(--honey)' }}>Bạn đang lập kỷ lục mới của tổ!</b>
            ) : record ? (
              <>
                Còn {fmtDur(recMs - held + 999)} nữa để phá kỷ lục của {record.me ? 'chính bạn' : record.name} · +{THRONE.recordBonus} điểm
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="throne-card compact">
      <Bee size={44} mood={reign ? 'determined' : 'happy'} />
      <div className="col grow" style={{ gap: 1, minWidth: 0 }}>
        <span className="event-tag" style={{ color: 'var(--honey-text)' }}>
          <IcCrown size={12} color="#D4A017" /> NGAI VÀNG
        </span>
        {reign ? (
          <>
            <b className="ellipsis" style={{ fontSize: 15 }}>
              {reign.name} đang ngồi ngai
            </b>
            <span className="xs muted">
              Đã giữ <b style={{ color: 'var(--ink)' }}>{fmtDur(held)}</b>
              {record ? ` · kỷ lục tổ ${fmtDur(Math.max(recMs, breaking ? held : 0))}` : ''}
              {breaking && <b style={{ color: 'var(--dup-text)' }}> · sắp lập kỷ lục!</b>}
            </span>
          </>
        ) : (
          <>
            <b style={{ fontSize: 15 }}>Ngai vàng đang trống!</b>
            <span className="xs muted">Ra một giá duy nhất để ngồi ngai ngay{record ? ` · kỷ lục tổ ${fmtDur(recMs)}` : ''}</span>
          </>
        )}
        {myTotal > 0 && (
          <span className="xs" style={{ fontWeight: 600, color: 'var(--honey-text)' }}>
            Phiên này bạn đã ngồi ngai {fmtDur(myTotal)}
          </span>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { activeEvent, nextEvent, isFrozen, isNight, isRunning, myBids, participantsOf, roomCfg, visibleStatuses } from '../engine/game';
import type { BidStatus } from '../engine/types';
import { fmtAgo, fmtClock, fmtVnd, randInt } from '../engine/util';
import { useGame, useNav } from '../nav';
import { priceRule, SURPRISE, type SurpriseKind } from '../config';
import { EventBanner, NextEventStrip, ThroneCard } from '../components/Surprise';
import { PriceInput, snapPrice } from '../components/PriceInput';
import { PICK_EVENT } from '../components/ToolSheet';
import { Bee } from '../components/Bee';
import { IcBack, IcBell, IcCircle, IcCrown, IcDrop, IcGavel, IcLock, IcMoon, IcSearch, IcSnow, IcThermo, IcX } from '../components/Icons';

const STATUS_LABEL: Record<BidStatus, string> = {
  leading: 'Đang dẫn đầu',
  unique: 'Duy nhất',
  dup: 'Bị trùng',
  pending: 'Chờ gõ búa',
  hidden: 'Ẩn trong màn đêm',
};

function StatusPill({ status, frozen }: { status: BidStatus; frozen: boolean }) {
  return (
    <span className={`pill ${status}`}>
      {frozen && status !== 'pending' ? <IcLock size={12} /> : status === 'leading' ? <IcCrown /> : status === 'dup' ? <IcX /> : status === 'unique' ? <IcCircle /> : status === 'hidden' ? <IcMoon size={12} /> : null}
      {STATUS_LABEL[status]}
      {frozen && status !== 'pending' ? ' lúc đóng băng' : ''}
    </span>
  );
}

export function Room({ roomId }: { roomId: string }) {
  const g = useGame();
  const nav = useNav();
  const cfg = roomCfg(roomId);
  const s = g.state.rooms[roomId].session;
  const now = Date.now();
  const rule = priceRule(cfg);
  const [priceText, setPriceText] = useState(() => String(randInt(Math.ceil(cfg.bots.typicalSteps / 2), cfg.bots.typicalSteps * 2) * rule.step));
  const price = snapPrice(parseInt(priceText, 10) || 0, rule);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');

  // nhận giá được chọn từ Soi vùng giá
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ roomId: string; price: number }>).detail;
      if (d.roomId === roomId) {
        setErr('');
        setPriceText(String(d.price));
        window.setTimeout(() => document.getElementById('bid-input')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
      }
    };
    window.addEventListener(PICK_EVENT, on);
    return () => window.removeEventListener(PICK_EVENT, on);
  }, [roomId]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(''), 1800);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!s) {
    return (
      <div className="scroll">
        <header className="hdr">
          <div className="hdr-row">
            <button className="icon-btn" aria-label="Quay lại" onClick={nav.back}>
              <IcBack />
            </button>
            <span className="display grow" style={{ fontSize: 20, fontWeight: 700 }}>
              Tổ {cfg.name}
            </span>
          </div>
        </header>
        <div className="section">Tổ này hiện chưa xuất hiện.</div>
      </div>
    );
  }

  const running = isRunning(s, now);
  const frozen = isFrozen(s, now);
  const statuses = visibleStatuses(s, now);
  const mine = myBids(s);
  const maxBids = g.maxBidsFor(roomId);
  const bal = g.balance(now);
  const entry = g.canEnter(roomId, now);
  const leading = !frozen && statuses.find((x) => x.status === 'leading');
  const night = running && isNight(s, now);
  const ev = running && !frozen ? activeEvent(s, now) : null;
  const throneRecord = g.state.rooms[roomId].throneRecord;
  const bidsPerMin = s.bids.filter((b) => b.at > now - 60000).length;
  const allPrizes = [...s.prizes, ...s.jackpot];
  const remaining = s.endAt - now;
  const freezeTotal = cfg.freezeSec * 1000;

  /** Đưa khung Ra giá lên sát đầu vùng cuộn để thấy ngay trạng thái bên dưới */
  const scrollBidToTop = (delay = 60) => {
    window.setTimeout(() => {
      const card = document.getElementById('bid-card');
      const sc = card?.closest('.scroll') as HTMLElement | null;
      if (!card || !sc) return;
      const top = card.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12;
      sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, delay);
  };

  const submit = () => {
    if (!price) {
      setErr('Nhập giá bạn muốn ra');
      return;
    }
    if (String(price) !== priceText) setPriceText(String(price));
    const r = g.placeBid(roomId, price);
    if (!r.ok) {
      setErr(r.error!);
      return;
    }
    setErr('');
    setFlash(r.rainBonus ? `Đã ra giá ${fmtVnd(price)} · +${r.rainBonus} điểm săn (Mưa điểm)` : `Đã ra giá ${fmtVnd(price)}`);
    scrollBidToTop();
    try {
      navigator.vibrate?.(30);
    } catch {
      /* bỏ qua */
    }
  };

  const canBid = running && entry.ok && mine.length < maxBids && bal > 0;
  const bidBlockReason = !running
    ? 'Tổ chưa mở'
    : !entry.ok
      ? entry.reason
      : mine.length >= maxBids
        ? 'Bạn đã dùng hết lượt của phiên này'
        : bal <= 0
          ? 'Hết giọt mật'
          : '';

  return (
    <div className={`scroll room ${frozen ? 'frozen' : night ? 'night' : ''}`}>
      {/* ---------- Header ---------- */}
      <header className="hdr" style={frozen ? { borderRadius: 0 } : undefined}>
        <div className="hdr-row">
          <button className="icon-btn" aria-label="Quay lại" onClick={nav.back}>
            <IcBack />
          </button>
          <div className="col grow">
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--honey)' }}>{cfg.badge}</span>
            <span className="display" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
              Tổ săn #{s.no}
            </span>
          </div>
          <button className="icon-btn help-btn" aria-label="Luật chơi và hướng dẫn" onClick={nav.openGuide}>
            ?
          </button>
          {frozen ? (
            <span className="pill" style={{ background: 'var(--dup)', color: '#fff', fontSize: 12, letterSpacing: '0.06em' }}>
              {cfg.freezeSec} GIÂY CUỐI
            </span>
          ) : (
            <button className="chip honey" onClick={() => nav.go({ name: 'wallet' })} aria-label={`${bal} giọt mật, mở ví`}>
              <IcDrop size={16} color="#1C1712" />
              {bal}
            </button>
          )}
        </div>

        {frozen ? (
          <div style={{ position: 'relative', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="210" height="210" viewBox="0 0 240 240" aria-hidden="true">
              <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,246,224,0.12)" strokeWidth="14" />
              <circle
                cx="120"
                cy="120"
                r="104"
                fill="none"
                stroke="#E0452B"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(Math.max(0, remaining) / freezeTotal) * 653} 654`}
                transform="rotate(-90 120 120)"
              />
            </svg>
            <div className="col" style={{ position: 'absolute', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#FF8A73' }}>BÚA SẮP GÕ</span>
              <span className={`display ${remaining < 10000 ? 'pulse' : ''}`} style={{ fontSize: 64, lineHeight: 1, fontWeight: 800 }} role="timer">
                {fmtClock(remaining)}
              </span>
              <span className="small" style={{ opacity: 0.8 }}>
                {participantsOf(s).toLocaleString('vi-VN')} thợ săn đang chờ
              </span>
            </div>
            <div style={{ position: 'absolute', right: -4, top: -4 }} className="shake">
              <Bee size={84} mood="determined" gavel="raised" onDark />
            </div>
          </div>
        ) : (
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div className="col">
              <span className="small" style={{ opacity: 0.8 }}>
                {running ? 'Búa gõ sau' : 'Tổ mở sau'}
              </span>
              <span className="display" style={{ fontSize: 52, lineHeight: 1, fontWeight: 800, color: 'var(--honey)' }} role="timer">
                {fmtClock(running ? remaining : s.startAt - now)}
              </span>
            </div>
            <div className="col small" style={{ alignItems: 'flex-end', gap: 4 }}>
              <span>
                <b>{participantsOf(s).toLocaleString('vi-VN')}</b> thợ săn trong tổ
              </span>
              <span>
                <b>{s.bids.length.toLocaleString('vi-VN')}</b> lượt ra giá
              </span>
              <span style={{ color: 'var(--honey)', fontWeight: 700 }}>{bidsPerMin} lượt/phút vừa qua</span>
            </div>
          </div>
        )}
      </header>

      {/* ---------- Đóng băng ---------- */}
      {frozen && (
        <div className="section">
          <div className="row" style={{ background: 'rgba(124,195,240,0.14)', border: '1.5px solid var(--ice)', borderRadius: 16, padding: '12px 14px', alignItems: 'flex-start', gap: 12 }}>
            <IcSnow color="#7CC3F0" />
            <div style={{ fontSize: 14, lineHeight: 1.45 }}>
              <b>Trạng thái đã đóng băng.</b> Bạn vẫn ra giá được, nhưng kết quả chỉ lộ ra khi búa gõ.
            </div>
          </div>
        </div>
      )}

      {/* ---------- Quà ---------- */}
      {!frozen && (
        <div className="section">
          <div className="card" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            <div className="placeholder-img" style={{ width: '100%', height: 110, borderRadius: 0, border: 'none', borderBottom: '2px dashed var(--honey-deep)', fontSize: 13 }}>
              Ảnh quà
            </div>
            <div className="col" style={{ padding: '14px 16px', gap: 4 }}>
              {allPrizes.map((pz, i) => (
                <div key={i} className="display" style={{ fontSize: i === 0 ? 22 : 17, lineHeight: 1.15, fontWeight: 800 }}>
                  {allPrizes.length > 1 && <span style={{ color: 'var(--honey-text)' }}>Quà {i + 1}: </span>}
                  {pz.name}
                </div>
              ))}
              <div className="small muted" style={{ marginTop: 4 }}>
                Giá trị quà {fmtVnd(rule.prizeValue)} · Bước giá {fmtVnd(rule.step)} · Giá từ {fmtVnd(rule.min)} đến {fmtVnd(rule.max)} · {maxBids === Infinity ? 'Không giới hạn lượt ra giá' : `Tối đa ${maxBids} lượt`}
              </div>
              {allPrizes.length > 1 && <div className="small muted">{allPrizes.length} giá duy nhất thấp nhất lần lượt nhận quà.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Ra giá ---------- */}
      <div className="section">
        <div
          id="bid-card"
          className="card"
          style={{ padding: 14, gap: 10, ...(frozen || night ? { background: 'rgba(255,246,224,0.06)', borderColor: 'var(--cream)', boxShadow: 'none', color: 'var(--cream)' } : {}) }}
        >
          <div className="row between">
            <h2 className="section-title" style={{ fontSize: 17 }}>
              Ra giá mới
            </h2>
            <span className="xs" style={{ opacity: 0.75 }}>
              Ví còn <b>{bal}</b> giọt
            </span>
          </div>
          <PriceInput rule={rule} text={priceText} onText={(t) => { setErr(''); setPriceText(t); }} onSubmit={submit} typicalSteps={cfg.bots.typicalSteps} dark={frozen || night} onFocus={() => scrollBidToTop(350)} />
          <button className="btn big" style={{ height: 48, fontSize: 18 }} onClick={submit} disabled={!canBid}>
            <IcGavel size={20} color="#1C1712" />
            Ra giá · 1 giọt mật
          </button>
          <div className="xs" style={{ textAlign: 'center', opacity: 0.8, minHeight: 18 }} aria-live="polite">
            {err ? (
              <span style={{ color: frozen || night ? '#FF8A73' : 'var(--dup-text)', fontWeight: 700, fontSize: 13 }}>{err}</span>
            ) : flash ? (
              <span style={{ color: frozen || night ? 'var(--honey)' : 'var(--lead)', fontWeight: 700, fontSize: 13 }}>{flash}</span>
            ) : bidBlockReason ? (
              <span style={{ fontWeight: 600 }}>{bidBlockReason}</span>
            ) : night ? (
              <span style={{ fontWeight: 600 }}>Màn đêm: giá vẫn được ghi nhận, trạng thái lộ ra khi trời sáng.</span>
            ) : (
              <>
                Giá đã ra không rút lại được.
              </>
            )}
          </div>
          {bal <= 0 && running && (
            <button className="btn outline sm" onClick={() => nav.go({ name: 'wallet' })}>
              Kiếm thêm giọt mật
            </button>
          )}
          {!running && (
            <button
              className="btn outline sm"
              onClick={() => {
                const wasOn = g.state.profile.reminders.includes(roomId);
                g.toggleReminder(roomId);
                if (!wasOn) nav.toast('Sẽ nhắc bạn khi tổ mở', 'good');
              }}
            >
              <IcBell color="#1C1712" />
              {g.state.profile.reminders.includes(roomId) ? 'Đã đặt nhắc' : 'Nhắc tôi khi mở'}
            </button>
          )}
        </div>
      </div>

      {/* ---------- Sự kiện bất ngờ ---------- */}
      {ev ? (
        <div className="section">
          <EventBanner s={s} now={now} myBidPrices={new Set(mine.map((b) => b.price))} />
        </div>
      ) : (
        running &&
        !frozen &&
        nextEvent(s, now) && (
          <div className="section">
            <NextEventStrip s={s} now={now} />
          </div>
        )
      )}

      {/* ---------- Công cụ ---------- */}
      {running && (
        <div className="section" style={{ flexDirection: 'row' }}>
          {(['scan', 'thermo'] as const).map((k) => {
            const left = (k === 'scan' ? g.scanQuota(roomId) : cfg.tools.thermo) - s.toolsUsed[k];
            return (
              <button
                key={k}
                className="card"
                disabled={frozen || night || left <= 0}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 12px', boxShadow: 'none', textAlign: 'left', minHeight: 72, background: frozen || night ? 'transparent' : '#fff', color: 'inherit', borderColor: frozen || night ? 'rgba(255,246,224,0.3)' : 'var(--ink)' }}
                onClick={() => nav.openTool(k, roomId, price || cfg.bots.typicalSteps * rule.step)}
              >
                {k === 'scan' ? <IcSearch /> : <IcThermo />}
                <span className="col">
                  <b style={{ fontSize: 14 }}>{k === 'scan' ? 'Soi vùng giá' : 'Nhiệt kế'}</b>
                  <span className="xs muted">{frozen ? 'Khóa khi đóng băng' : night ? 'Khóa trong màn đêm' : `Còn ${left} lần`}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- Ngai vàng ---------- */}
      {!frozen && running && (
        <div className="section">
          <ThroneCard s={s} now={now} record={throneRecord} night={night} myLeadPrice={leading ? leading.bid.price : null} hasBids={mine.length > 0} />
          {mine.length === 0 && !night && (
            <div className="xs muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>
              Ra giá <b>thấp nhất</b> mà <b>không trùng</b> với ai khi búa gõ là thắng. Mỗi lần ra giá tốn 1 giọt mật.
            </div>
          )}
        </div>
      )}

      {/* ---------- Giá của tôi ---------- */}
      {mine.length > 0 && (
        <div className="section">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <h2 className="section-title" style={{ fontSize: 20 }}>
              Giá của bạn
            </h2>
            <span className="small muted">
              Đã ra {mine.length} giá
            </span>
          </div>
          <div className="card flat" style={{ padding: 0, gap: 0 }}>
            {statuses.map(({ bid, status, frozen: fz }) => (
              <div key={bid.id} className="bidrow">
                <span className={`bidprice ${status === 'dup' ? 'struck' : ''}`}>{fmtVnd(bid.price)}</span>
                <StatusPill status={status} frozen={fz} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Hoạt động ---------- */}
      <div className="section">
        <h2 className="section-title" style={{ fontSize: 20 }}>
          Trong tổ vừa xảy ra
        </h2>
        <div className="col" style={{ gap: 8 }}>
          {s.feed.length === 0 && <div className="small muted">Chưa có hoạt động nào.</div>}
          {s.feed.slice(0, 6).map((f) => (
            <div
              key={f.id}
              className="row"
              style={{ padding: '10px 12px', borderRadius: 14, background: frozen || night ? 'rgba(255,246,224,0.06)' : '#fff', fontSize: 14, gap: 10 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  flexShrink: 0,
                  background: f.tone === 'me' ? 'var(--lead)' : f.tone === 'lead' ? 'var(--honey)' : f.tone === 'dup' ? 'var(--dup)' : f.tone === 'freeze' ? 'var(--ice)' : f.tone === 'event' ? '#7B6CF0' : f.tone === 'throne' ? 'var(--honey-deep)' : 'var(--gold)',
                }}
              />
              <span className="grow" style={{ fontWeight: f.tone === 'me' || f.tone === 'throne' || f.tone === 'event' ? 700 : 400 }}>
                {f.text}
              </span>
              <span className="xs muted">{fmtAgo(now, f.at)}</span>
            </div>
          ))}
        </div>
        <button className="btn link" style={{ alignSelf: 'center', fontSize: 13, color: frozen || night ? '#C9BDA8' : undefined }} onClick={() => g.demoFastForward(roomId)}>
          Công cụ demo: tua đến sát {cfg.freezeSec} giây cuối
        </button>
        {running && !frozen && (
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span className="xs muted" style={{ width: '100%', textAlign: 'center' }}>
              Công cụ demo: gọi sự kiện ngay
            </span>
            {(['night', 'reveal', 'rain'] as SurpriseKind[]).map((k) => (
              <button
                key={k}
                className="btn outline sm"
                style={{ height: 36, fontSize: 13, padding: '0 12px', ...(night ? { background: 'transparent', color: 'var(--cream)', borderColor: 'rgba(255,246,224,0.4)' } : {}) }}
                onClick={() => {
                  const e = g.demoTriggerEvent(roomId, k);
                  if (e) nav.toast(e, 'warn');
                  else window.setTimeout(() => document.getElementById('bid-card')?.closest('.scroll')?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                }}
              >
                {SURPRISE[k].name}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* chừa chỗ để khung Ra giá luôn cuộn được lên đầu màn hình */}
      <div aria-hidden="true" style={{ height: '30vh' }} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { isFrozen, isRunning, myBids, participantsOf, roomCfg, visibleStatuses } from '../engine/game';
import type { BidStatus } from '../engine/types';
import { fmtAgo, fmtClock, fmtNum, fmtVnd, randInt } from '../engine/util';
import { useGame, useNav } from '../nav';
import { Bee } from '../components/Bee';
import { IcBack, IcBell, IcCircle, IcCrown, IcDrop, IcGavel, IcLock, IcSearch, IcSnow, IcThermo, IcX } from '../components/Icons';

const STATUS_LABEL: Record<BidStatus, string> = {
  leading: 'Đang dẫn đầu',
  unique: 'Duy nhất',
  dup: 'Bị trùng',
  pending: 'Chờ gõ búa',
};

function StatusPill({ status, frozen }: { status: BidStatus; frozen: boolean }) {
  return (
    <span className={`pill ${status}`}>
      {frozen && status !== 'pending' ? <IcLock size={12} /> : status === 'leading' ? <IcCrown /> : status === 'dup' ? <IcX /> : status === 'unique' ? <IcCircle /> : null}
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
  const [priceText, setPriceText] = useState(() => String(randInt(Math.ceil(cfg.bots.typicalVnd / 2), cfg.bots.typicalVnd * 2)));
  const price = parseInt(priceText, 10) || 0;
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');

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
  const bidsPerMin = s.bids.filter((b) => b.at > now - 60000).length;
  const allPrizes = [...s.prizes, ...s.jackpot];
  const remaining = s.endAt - now;
  const freezeTotal = cfg.freezeSec * 1000;

  const submit = () => {
    if (!price) {
      setErr('Nhập giá bạn muốn ra');
      return;
    }
    const r = g.placeBid(roomId, price);
    if (!r.ok) {
      setErr(r.error!);
      return;
    }
    setErr('');
    setFlash(`Đã ra giá ${fmtVnd(price)}`);
    try {
      navigator.vibrate?.(30);
    } catch {
      /* bỏ qua */
    }
  };

  const setP = (v: number) => {
    setErr('');
    setPriceText(String(Math.max(cfg.minVnd, Math.min(cfg.maxVnd, Math.round(v)))));
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
    <div className={`scroll room ${frozen ? 'frozen' : ''}`}>
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
            <div className="placeholder-img" style={{ width: '100%', height: 140, borderRadius: 0, border: 'none', borderBottom: '2px dashed var(--honey-deep)', fontSize: 13 }}>
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
                Giá từ {fmtVnd(cfg.minVnd)} đến {fmtVnd(cfg.maxVnd)}, nhập lẻ từng đồng · {maxBids === Infinity ? 'Không giới hạn lượt ra giá' : `Tối đa ${maxBids} lượt`}
              </div>
              {allPrizes.length > 1 && <div className="small muted">{allPrizes.length} giá duy nhất thấp nhất lần lượt nhận quà.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Trạng thái của tôi ---------- */}
      {!frozen && running && (
        <div className="section">
          {leading ? (
            <div className="row" style={{ background: 'var(--lead-soft)', border: '2px solid var(--lead)', borderRadius: 20, padding: '12px 14px', gap: 12 }}>
              <Bee size={64} mood="joy" />
              <div className="col" style={{ gap: 2 }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--lead)' }}>
                  Bạn đang dẫn đầu!
                </div>
                <div className="small">
                  Giá <b>{fmtVnd(leading.bid.price)}</b> đang thấp nhất và duy nhất.
                </div>
                {s.leadSince && (
                  <div className="small" style={{ fontWeight: 600 }}>
                    Giữ ngôi {fmtClock(now - s.leadSince)}
                  </div>
                )}
              </div>
            </div>
          ) : mine.length ? (
            <div className="row" style={{ background: 'var(--honey-soft)', border: '2px solid var(--honey-deep)', borderRadius: 20, padding: '12px 14px', gap: 12 }}>
              <Bee size={60} mood="worried" />
              <div className="col" style={{ gap: 2 }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 800 }}>
                  Chưa giữ ngôi đầu
                </div>
                <div className="small">Có giá duy nhất thấp hơn giá của bạn. Thử một mức khác?</div>
              </div>
            </div>
          ) : (
            <div className="row" style={{ background: '#fff', border: '1.5px solid var(--line)', borderRadius: 20, padding: '12px 14px', gap: 12 }}>
              <Bee size={60} mood="happy" gavel="side" />
              <div className="small" style={{ lineHeight: 1.5 }}>
                Ra giá <b>thấp nhất</b> mà <b>không trùng</b> với ai khi búa gõ là thắng. Mỗi lần ra giá tốn 1 giọt mật.
              </div>
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

      {/* ---------- Ra giá ---------- */}
      <div className="section">
        <div
          className="card"
          style={frozen ? { background: 'rgba(255,246,224,0.06)', borderColor: 'var(--cream)', boxShadow: 'none', color: 'var(--cream)' } : undefined}
        >
          <h2 className="section-title" style={{ fontSize: 20 }}>
            Ra giá mới
          </h2>
          <div className="row" style={{ gap: 12 }}>
            <button
              className="btn outline"
              aria-label="Giảm 1 đồng"
              style={{ width: 52, height: 52, padding: 0, fontSize: 26, background: 'var(--cream)', color: 'var(--ink)' }}
              onClick={() => setP(price - 1)}
            >
              −
            </button>
            <label className="grow" style={{ position: 'relative' }}>
              <span className="visually-hidden">Giá bạn muốn ra (đồng)</span>
              <input
                id="bid-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={priceText ? fmtNum(price) : ''}
                onChange={(e) => {
                  setErr('');
                  setPriceText(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                style={{
                  width: '100%',
                  height: 60,
                  borderRadius: 16,
                  background: 'var(--honey-soft)',
                  border: '2px solid var(--honey-deep)',
                  textAlign: 'center',
                  fontFamily: 'var(--display)',
                  fontSize: 34,
                  fontWeight: 800,
                  color: 'var(--ink)',
                  paddingRight: 40,
                  paddingLeft: 12,
                  minWidth: 0,
                }}
              />
              <span className="display" style={{ position: 'absolute', right: 14, top: 12, fontSize: 26, fontWeight: 800, color: 'var(--honey-text)', pointerEvents: 'none' }}>
                đ
              </span>
            </label>
            <button
              className="btn outline"
              aria-label="Tăng 1 đồng"
              style={{ width: 52, height: 52, padding: 0, fontSize: 26, background: 'var(--cream)', color: 'var(--ink)' }}
              onClick={() => setP(price + 1)}
            >
              +
            </button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {[-10, 10, 100].map((d) => (
              <button
                key={d}
                className="btn outline sm"
                style={{ flex: 1, height: 40, border: '1.5px solid var(--line)', padding: 0, background: '#fff', color: 'var(--ink)' }}
                onClick={() => setP(price + d)}
              >
                {d > 0 ? '+' : '−'}
                {Math.abs(d)}đ
              </button>
            ))}
            <button
              className="btn outline sm"
              style={{ flex: 1.3, height: 40, border: '1.5px solid var(--line)', padding: 0, background: '#fff', color: 'var(--ink)' }}
              onClick={() => setP(randInt(1, cfg.bots.typicalVnd * 3))}
            >
              Ngẫu nhiên
            </button>
          </div>
          <button className="btn big" onClick={submit} disabled={!canBid}>
            <IcGavel color="#1C1712" />
            Ra giá · 1 giọt mật
          </button>
          <div className="xs" style={{ textAlign: 'center', opacity: 0.8, minHeight: 18 }} aria-live="polite">
            {err ? (
              <span style={{ color: frozen ? '#FF8A73' : 'var(--dup-text)', fontWeight: 700, fontSize: 13 }}>{err}</span>
            ) : flash ? (
              <span style={{ color: frozen ? 'var(--honey)' : 'var(--lead)', fontWeight: 700, fontSize: 13 }}>{flash}</span>
            ) : bidBlockReason ? (
              <span style={{ fontWeight: 600 }}>{bidBlockReason}</span>
            ) : (
              <>
                Giá đã ra không rút lại được. Mỗi lần ra giá tốn 1 giọt · ví còn {bal} giọt.
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

      {/* ---------- Công cụ ---------- */}
      {running && (
        <div className="section" style={{ flexDirection: 'row' }}>
          {(['scan', 'thermo'] as const).map((k) => {
            const left = (k === 'scan' ? g.scanQuota(roomId) : cfg.tools.thermo) - s.toolsUsed[k];
            return (
              <button
                key={k}
                className="card"
                disabled={frozen || left <= 0}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 12px', boxShadow: 'none', textAlign: 'left', minHeight: 72, background: frozen ? 'transparent' : '#fff', color: 'inherit', borderColor: frozen ? 'rgba(255,246,224,0.3)' : 'var(--ink)' }}
                onClick={() => nav.openTool(k, roomId, price || cfg.bots.typicalVnd)}
              >
                {k === 'scan' ? <IcSearch /> : <IcThermo />}
                <span className="col">
                  <b style={{ fontSize: 14 }}>{k === 'scan' ? 'Soi vùng giá' : 'Nhiệt kế'}</b>
                  <span className="xs muted">{frozen ? 'Khóa khi đóng băng' : `Còn ${left} lần`}</span>
                </span>
              </button>
            );
          })}
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
              style={{ padding: '10px 12px', borderRadius: 14, background: frozen ? 'rgba(255,246,224,0.06)' : '#fff', fontSize: 14, gap: 10 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  flexShrink: 0,
                  background: f.tone === 'me' ? 'var(--lead)' : f.tone === 'lead' ? 'var(--honey)' : f.tone === 'dup' ? 'var(--dup)' : f.tone === 'freeze' ? 'var(--ice)' : 'var(--gold)',
                }}
              />
              <span className="grow" style={{ fontWeight: f.tone === 'me' ? 700 : 400 }}>
                {f.text}
              </span>
              <span className="xs muted">{fmtAgo(now, f.at)}</span>
            </div>
          ))}
        </div>
        <button className="btn link" style={{ alignSelf: 'center', fontSize: 13, color: frozen ? '#C9BDA8' : undefined }} onClick={() => g.demoFastForward(roomId)}>
          Công cụ demo: tua đến sát {cfg.freezeSec} giây cuối
        </button>
      </div>
    </div>
  );
}

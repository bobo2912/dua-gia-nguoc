import { ROOMS, type RoomConfig } from '../config';
import { isRunning, myBids, participantsOf, rankIndex, rankOf, nextRank } from '../engine/game';
import type { GameStore } from '../engine/game';
import { fmtAgo, fmtClock, fmtVnd } from '../engine/util';
import { useGame, useNav } from '../nav';
import { versionLabel } from '../version';
import { Bee } from '../components/Bee';
import { BottomNav, PrizeImage } from '../components/common';
import { HexPattern, HoneyJar, IcBack, IcBell, IcClock, IcDrop, IcFlame, IcGift, IcHex, IcLock, IcSettings, IcUsers } from '../components/Icons';

function heat(g: GameStore, roomId: string, now: number): number {
  const s = g.state.rooms[roomId].session;
  if (!s) return 0;
  const n = s.bids.filter((b) => b.at > now - 60000).length;
  return n >= 12 ? 3 : n >= 5 ? 2 : n > 0 ? 1 : 0;
}

export function Lobby() {
  const g = useGame();
  const nav = useNav();
  const now = Date.now();
  const p = g.state.profile;
  const rank = rankOf(p.huntPoints);
  const bal = g.balance(now);

  const jackpots = ROOMS.flatMap((cfg) => {
    const rt = g.state.rooms[cfg.id];
    const pot = [...(rt.session?.jackpot ?? []), ...rt.pendingJackpot];
    return pot.length ? [{ cfg, pot, rolls: rt.session?.rolloverCount ?? rt.pendingRollovers }] : [];
  });
  const potValue = jackpots.reduce((s, j) => s + j.pot.reduce((a, b) => a + b.valueVnd, 0), 0);

  const running: RoomConfig[] = [];
  const later: RoomConfig[] = [];
  for (const cfg of ROOMS) {
    const s = g.state.rooms[cfg.id].session;
    if (s && isRunning(s, now) && rankIndex(rank.id) >= rankIndex(cfg.minRank)) running.push(cfg);
    else later.push(cfg);
  }
  const pendingPrizes = p.prizes.filter((x) => x.status === 'pending');

  return (
    <>
      <div className="scroll">
        <header className="hdr" style={{ paddingBottom: 24 }}>
          <HexPattern />
          <div className="hdr-row" style={{ justifyContent: 'space-between' }}>
            <button className="icon-btn" aria-label="Quay lại ngân hàng" onClick={() => nav.toast('Bản demo: nút này sẽ đưa bạn về app ngân hàng.')}>
              <IcBack />
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Mini app</div>
            <button className="icon-btn" aria-label="Công cụ demo" onClick={nav.openDemo}>
              <IcSettings />
            </button>
          </div>
          <div className="hdr-row" style={{ gap: 12 }}>
            <Bee size={84} gavel="side" onDark />
            <div className="col">
              <h1 className="display" style={{ fontSize: 40, lineHeight: 1, fontWeight: 800, color: 'var(--honey)' }}>
                Đấu giá
              </h1>
              <div className="display" style={{ fontSize: 18, lineHeight: 1.2, fontWeight: 600 }}>
                Mua đồ luxury giá bình dân
              </div>
            </div>
          </div>
          <div className="hdr-row">
            <button className="chip honey grow" style={{ height: 44, borderRadius: 14, fontSize: 15 }} onClick={() => nav.go({ name: 'wallet' })}>
              <IcDrop color="#1C1712" />
              {bal} giọt mật
              <span style={{ marginLeft: 'auto', fontSize: 20, lineHeight: 1 }}>+</span>
            </button>
            <button className="chip ghost grow" style={{ height: 44, borderRadius: 14 }} onClick={() => nav.go({ name: 'rank' })}>
              <IcHex color={rank.color} />
              {rank.name} · {rank.bee}
            </button>
          </div>
        </header>

        {pendingPrizes.length > 0 && (
          <div className="section">
            <button
              className="card"
              style={{ background: 'var(--lead-soft)', borderColor: 'var(--lead)', flexDirection: 'row', alignItems: 'center', textAlign: 'left' }}
              onClick={() => nav.go({ name: 'win', sessionId: pendingPrizes[0].sessionId })}
            >
              <IcGift color="#17754A" />
              <div className="col grow">
                <b style={{ color: 'var(--lead)' }}>Bạn có {pendingPrizes.length} quà chờ nhận</b>
                <span className="small">{pendingPrizes[0].prize.name}</span>
              </div>
              <span className="btn sm" style={{ height: 40 }}>
                Nhận
              </span>
            </button>
          </div>
        )}

        <div className="section">
          <div className="card" style={{ background: 'var(--honey)', flexDirection: 'row', alignItems: 'center', boxShadow: '0 5px 0 var(--ink)', borderRadius: 22 }}>
            <div className="col grow" style={{ gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>HŨ MẬT JACKPOT</div>
              {jackpots.length ? (
                <>
                  <div className="display" style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>
                    Quà {fmtVnd(potValue)} đang dồn
                  </div>
                  {jackpots.map((j) => (
                    <div key={j.cfg.id} className="small" style={{ fontWeight: 500 }}>
                      Tổ {j.cfg.name}: {j.pot.map((x) => x.name.replace(' (dồn)', '')).join(', ')} · đã dồn {j.rolls} lần
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="display" style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800 }}>
                    Hũ mật đang trống
                  </div>
                  <div className="small">Phiên không có giá duy nhất sẽ dồn quà vào đây.</div>
                </>
              )}
            </div>
            <HoneyJar />
          </div>
        </div>

        <div className="section">
          <div className="row" style={{ gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--dup)' }} className="pulse" />
            <h2 className="section-title">Đang diễn ra</h2>
          </div>
          {running.length === 0 && <div className="small muted">Chưa có tổ nào đang mở. Xem lịch bên dưới nhé.</div>}
          {running.map((cfg) => (
            <RoomCard key={cfg.id} cfg={cfg} now={now} />
          ))}
        </div>

        <div className="section">
          <h2 className="section-title">Sắp mở</h2>
          {later.map((cfg) => (
            <RoomCard key={cfg.id} cfg={cfg} now={now} />
          ))}
        </div>

        <div className="section">
          <h2 className="section-title">Vừa săn được</h2>
          <div className="card flat" style={{ padding: 0, gap: 0 }}>
            {g.state.hall.slice(0, 5).map((h) => (
              <div key={h.id} className="bidrow" style={{ gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: h.me ? 'var(--lead-soft)' : 'var(--honey-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: h.me ? 'var(--lead)' : 'var(--honey-text)',
                    flexShrink: 0,
                  }}
                >
                  {h.me ? '★' : h.name.split(' ').slice(-2, -1)[0]?.[0] ?? 'T'}
                </div>
                <div className="col grow" style={{ fontSize: 14 }}>
                  <span>
                    <b>{h.name}</b> · {h.prize}
                  </span>
                  <span className="xs muted">{fmtAgo(now, h.at)} trước</span>
                </div>
                <div className="display" style={{ fontSize: 17, fontWeight: 800, color: 'var(--lead)' }}>
                  {fmtVnd(h.priceVnd)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="version-tag btn link" style={{ width: '100%', display: 'block' }} onClick={nav.openDemo}>
          Đấu giá {versionLabel()}
        </button>
      </div>
      <BottomNav />
    </>
  );
}

function RoomCard({ cfg, now }: { cfg: RoomConfig; now: number }) {
  const g = useGame();
  const nav = useNav();
  const rt = g.state.rooms[cfg.id];
  const s = rt.session;
  const p = g.state.profile;
  const rank = rankOf(p.huntPoints);
  const locked = rankIndex(rank.id) < rankIndex(cfg.minRank);
  const prizeName = cfg.prizes[0].name + (cfg.prizes.length > 1 ? ` + ${cfg.prizes.length - 1} quà khác` : '');

  // Phòng VIP bị khóa theo hạng
  if (locked) {
    const need = nextRank(p.huntPoints);
    const target = need?.minPoints ?? 1;
    return (
      <div className="card" style={{ background: '#F3EAD3', boxShadow: 'none' }}>
        <div className="row between">
          <span className="badge" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
            {cfg.badge} · HẠNG VÀNG
          </span>
          <IcLock />
        </div>
        <div className="display" style={{ fontSize: 20, lineHeight: 1.15, fontWeight: 700 }}>
          {prizeName}
        </div>
        <div className="small" style={{ fontWeight: 600 }}>
          Còn {target - p.huntPoints} điểm săn để mở khóa
        </div>
        <div style={{ height: 10, borderRadius: 5, background: '#fff', border: '1.5px solid var(--ink)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (p.huntPoints / 1000) * 100)}%`, height: '100%', background: 'var(--gold)' }} />
        </div>
        <button className="btn link" style={{ alignSelf: 'flex-start', padding: '8px 0', color: 'var(--honey-text)' }} onClick={() => nav.go({ name: 'rank' })}>
          Xem cách lên hạng
        </button>
      </div>
    );
  }

  // Phòng Bí Mật chưa xuất hiện
  if (cfg.secret && !s) {
    return (
      <div className="card" style={{ background: 'var(--ink)', color: 'var(--cream)', boxShadow: '0 4px 0 var(--honey-deep)', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <svg width="64" height="72" viewBox="0 0 64 72" aria-hidden="true">
          <path d="M32 3l27 15v36L32 69 5 54V18z" fill="none" stroke="#F5B301" strokeWidth="3" />
          <text x="32" y="47" textAnchor="middle" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="34" fill="#F5B301">
            ?
          </text>
        </svg>
        <div className="col grow" style={{ gap: 8 }}>
          <div className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--honey)' }}>
            Tổ Bí Mật
          </div>
          <div className="small" style={{ lineHeight: 1.45 }}>
            Xuất hiện bất ngờ, chỉ báo trước ít phút và kéo dài rất ngắn.
          </div>
          <button
            className="btn sm"
            style={{ alignSelf: 'flex-start', border: 'none' }}
            aria-pressed={p.secretAlert}
            onClick={() => {
              const wasOn = p.secretAlert;
              g.toggleSecretAlert();
              nav.toast(wasOn ? 'Đã tắt báo Tổ Bí Mật' : 'Bạn sẽ được báo khi Tổ Bí Mật xuất hiện', 'good');
            }}
          >
            <IcBell size={16} color="#1C1712" fill={p.secretAlert ? '#1C1712' : 'none'} />
            {p.secretAlert ? 'Đã bật thông báo' : 'Bật thông báo'}
          </button>
        </div>
      </div>
    );
  }
  if (!s) return null;

  const running = isRunning(s, now);
  const mine = myBids(s);
  const parts = participantsOf(s);
  const seatsLeft = cfg.maxParticipants - parts;
  const lowSeats = seatsLeft / cfg.maxParticipants < 0.25;
  const entry = g.canEnter(cfg.id, now);
  const h = heat(g, cfg.id, now);
  const upcomingSecret = cfg.secret && !running;

  return (
    <div className="card" style={upcomingSecret ? { borderColor: 'var(--dup)', boxShadow: '0 4px 0 var(--dup)' } : undefined}>
      <div className="row between">
        <span className="badge">
          {cfg.badge} · {Math.round(cfg.durationSec / 60)} PHÚT
        </span>
        {running ? (
          h > 0 && (
            <span className="row" style={{ gap: 2, color: 'var(--dup)', fontSize: 12, fontWeight: 700 }}>
              {Array.from({ length: h }, (_, i) => (
                <IcFlame key={i} />
              ))}
              {h === 3 ? 'Rất sôi động' : h === 2 ? 'Sôi động' : 'Đang ấm'}
            </span>
          )
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: upcomingSecret ? 'var(--dup-text)' : undefined }}>
            Mở sau {fmtClock(s.startAt - now)}
          </span>
        )}
      </div>
      <div className="row" style={{ gap: 12 }}>
        <PrizeImage />
        <div className="col grow" style={{ gap: 6 }}>
          <div className="display" style={{ fontSize: 20, lineHeight: 1.15, fontWeight: 700 }}>
            {prizeName}
          </div>
          {s.jackpot.length > 0 && (
            <div className="small" style={{ fontWeight: 700, color: 'var(--honey-text)' }}>
              + Hũ mật: {s.jackpot.map((j) => j.name.replace(' (dồn)', '')).join(', ')}
            </div>
          )}
          {running ? (
            <div className="row small muted" style={{ gap: 12, fontWeight: 500, flexWrap: 'wrap' }}>
              <span className="row" style={{ gap: 4 }}>
                <IcClock color="#C2361F" />
                <b style={{ color: 'var(--dup)' }}>{fmtClock(s.endAt - now)}</b>
              </span>
              <span className="row" style={{ gap: 4 }}>
                <IcUsers />
                {parts.toLocaleString('vi-VN')} thợ săn
              </span>
            </div>
          ) : (
            <div className="small muted">
              Giá từ {fmtVnd(cfg.minVnd)} · không giới hạn lượt
            </div>
          )}
          {running && lowSeats && (
            <>
              <div className="small" style={{ fontWeight: 700, color: 'var(--dup)' }}>
                Chỉ còn {seatsLeft}/{cfg.maxParticipants} chỗ
              </div>
              <div className={`bar ${seatsLeft / cfg.maxParticipants < 0.1 ? 'pulse' : ''}`} style={{ background: 'var(--dup-soft)' }}>
                <div style={{ width: `${(parts / cfg.maxParticipants) * 100}%`, background: 'var(--dup)' }} />
              </div>
            </>
          )}
          {mine.length > 0 && (
            <div className="small" style={{ fontWeight: 700, color: 'var(--lead)' }}>
              Bạn đã ra {mine.length} giá
            </div>
          )}
        </div>
      </div>
      {running ? (
        entry.ok ? (
          <button className="btn" onClick={() => nav.go({ name: 'room', roomId: cfg.id })}>
            {mine.length ? 'Quay lại tổ' : lowSeats ? 'Giành chỗ ngay' : 'Vào tổ săn'}
          </button>
        ) : (
          <button className="btn outline" disabled>
            {entry.reason} · đợi phiên sau
          </button>
        )
      ) : (
        <button
          className="btn outline"
          aria-pressed={p.reminders.includes(cfg.id)}
          onClick={() => {
            const wasOn = p.reminders.includes(cfg.id);
            g.toggleReminder(cfg.id);
            if (!wasOn) nav.toast(`Sẽ nhắc bạn khi Tổ ${cfg.name} mở`, 'good');
          }}
        >
          <IcBell color="#1C1712" fill={p.reminders.includes(cfg.id) ? '#F5B301' : 'none'} />
          {p.reminders.includes(cfg.id) ? 'Đã đặt nhắc' : 'Nhắc tôi khi mở'}
        </button>
      )}
    </div>
  );
}

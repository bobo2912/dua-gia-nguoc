import { useState } from 'react';
import { ROOMS, RANKS, priceRule, type RoomConfig, type Prize } from '../config';
import type { Session } from '../engine/types';
import { isFrozen, isRunning, myBids, participantsOf, rankIndex, rankOf, visibleStatuses } from '../engine/game';
import type { GameStore } from '../engine/game';
import { fmtAgo, fmtClock, fmtVnd } from '../engine/util';
import { useGame, useNav } from '../nav';
import { versionLabel } from '../version';
import { Bee } from '../components/Bee';
import { BottomNav } from '../components/common';
import { HexPattern, HoneyJar, IcBack, IcBell, IcClock, IcDrop, IcGift, IcHex, IcLock, IcSettings } from '../components/Icons';

// =====================================================================
// SẢNH: dải Hũ mật + 3 tab (Đang mở · Sắp mở · Của tôi) + danh sách dòng gọn
// =====================================================================

type Tab = 'live' | 'soon' | 'mine';
/** Nhớ tab đang chọn khi đi vào tổ rồi quay lại */
let lastTab: Tab = 'live';

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
  const pendingPrizes = p.prizes.filter((x) => x.status === 'pending');

  const infos = sortRooms(ROOMS.map((cfg) => roomInfo(g, cfg, now)));
  const open = useOpenRoom();
  const groups: Record<Tab, RoomInfo[]> = {
    live: infos.filter((r) => r.kind === 'running'),
    soon: infos.filter((r) => r.kind !== 'running'),
    mine: infos.filter((r) => r.status),
  };
  const [tab, setTabState] = useState<Tab>(lastTab);
  const setTab = (t: Tab) => {
    lastTab = t;
    setTabState(t);
  };
  const list = groups[tab];
  const empty: Record<Tab, string> = {
    live: 'Chưa có tổ nào đang mở. Xem tab Sắp mở để đặt nhắc nhé.',
    soon: 'Không có tổ nào sắp mở.',
    mine: 'Bạn chưa ra giá ở tổ nào. Vào một tổ đang mở để bắt đầu săn.',
  };

  return (
    <>
      <div className="scroll">
        <header className="hdr" style={{ paddingBottom: 16, gap: 12 }}>
          <HexPattern />
          <div className="hdr-row" style={{ gap: 10 }}>
            <button className="icon-btn" aria-label="Quay lại ngân hàng" onClick={() => nav.toast('Bản demo: nút này sẽ đưa bạn về app ngân hàng.')}>
              <IcBack />
            </button>
            <Bee size={40} onDark />
            <div className="col grow">
              <h1 className="display" style={{ fontSize: 26, lineHeight: 1, fontWeight: 800, color: 'var(--honey)' }}>
                Đấu giá
              </h1>
              <span className="xs" style={{ opacity: 0.8 }}>
                Mua đồ luxury giá bình dân
              </span>
            </div>
            <button className="icon-btn" aria-label="Công cụ demo" onClick={nav.openDemo}>
              <IcSettings />
            </button>
          </div>
          <div className="hdr-row">
            <button className="chip honey grow" style={{ height: 40, borderRadius: 12, fontSize: 14 }} onClick={() => nav.go({ name: 'wallet' })}>
              <IcDrop size={18} color="#1C1712" />
              {bal} giọt mật
              <span style={{ marginLeft: 'auto', fontSize: 18, lineHeight: 1 }}>+</span>
            </button>
            <button className="chip ghost grow" style={{ height: 40, borderRadius: 12, fontSize: 13 }} onClick={() => nav.go({ name: 'rank' })}>
              <IcHex size={18} color={rank.color} />
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

        <JackpotStrip infos={infos} />

        <div className="section" style={{ paddingTop: 16 }}>
          <div className="seg" role="tablist" aria-label="Lọc tổ săn">
            {(
              [
                ['live', 'Đang mở'],
                ['soon', 'Sắp mở'],
                ['mine', 'Của tôi'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {label}
                <span className={`tab-count ${id === 'live' ? 'live' : ''}`}>{groups[id].length}</span>
              </button>
            ))}
          </div>
          <div className="row-list" role="tabpanel">
            {list.length === 0 && (
              <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: 20, gap: 8 }}>
                <Bee size={52} mood="happy" />
                <span className="small muted">{empty[tab]}</span>
              </div>
            )}
            {list.map((r) => (
              <RoomRow key={r.cfg.id} r={r} onOpen={open} />
            ))}
          </div>
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

type Tone = 'lead' | 'unique' | 'dup' | 'frozen';
const TONE_COLORS: Record<Tone, { bg: string; fg: string; dot: string }> = {
  lead: { bg: 'var(--lead)', fg: '#fff', dot: 'var(--lead)' },
  unique: { bg: 'var(--honey-soft)', fg: 'var(--honey-text-strong)', dot: 'var(--honey-deep)' },
  dup: { bg: 'var(--dup-soft)', fg: 'var(--dup-text)', dot: 'var(--dup)' },
  frozen: { bg: '#E3F1FB', fg: '#1D5B80', dot: '#3C8DC0' },
};

/** Trạng thái giá của người chơi trong một tổ (null nếu chưa ra giá) */
function statusOf(g: GameStore, roomId: string, now: number): { tone: Tone; text: string; short: string; n: number } | null {
  const s = g.state.rooms[roomId].session;
  if (!s || !myBids(s).length) return null;
  const st = visibleStatuses(s, now);
  const lead = st.find((x) => x.status === 'leading');
  const uniq = st.filter((x) => x.status === 'unique');
  const n = st.length;
  if (isFrozen(s, now))
    return { tone: 'frozen', n, short: 'Đóng băng', text: `Đang đóng băng · ${lead ? `bạn dẫn đầu với ${fmtVnd(lead.bid.price)} lúc đóng băng` : 'chờ gõ búa'}` };
  if (lead) return { tone: 'lead', n, short: 'Dẫn đầu', text: `Bạn đang dẫn đầu · ${fmtVnd(lead.bid.price)} thấp nhất và duy nhất` };
  if (uniq.length) return { tone: 'unique', n, short: 'Duy nhất', text: `Có ${uniq.length} giá duy nhất nhưng chưa thấp nhất` };
  return { tone: 'dup', n, short: 'Bị trùng', text: n === 1 ? 'Giá của bạn đang bị trùng' : `Cả ${n} giá của bạn đều bị trùng` };
}

type Kind = 'running' | 'upcoming' | 'locked' | 'hidden';
interface RoomInfo {
  cfg: RoomConfig;
  s: Session | null;
  kind: Kind;
  jackpot: Prize[];
  timer: string;
  parts: number;
  heat: number;
  status: ReturnType<typeof statusOf>;
}

function roomInfo(g: GameStore, cfg: RoomConfig, now: number): RoomInfo {
  const rt = g.state.rooms[cfg.id];
  const s = rt.session;
  const rank = rankOf(g.state.profile.huntPoints);
  const locked = rankIndex(rank.id) < rankIndex(cfg.minRank);
  const kind: Kind = locked ? 'locked' : !s ? 'hidden' : isRunning(s, now) ? 'running' : 'upcoming';
  const timer = !s ? '' : kind === 'running' ? fmtClock(s.endAt - now) : fmtClock(s.startAt - now);
  return {
    cfg,
    s,
    kind,
    jackpot: [...(s?.jackpot ?? []), ...rt.pendingJackpot],
    timer,
    parts: s ? participantsOf(s) : 0,
    heat: heat(g, cfg.id, now),
    status: statusOf(g, cfg.id, now),
  };
}

/** Bấm vào một tổ: vào tổ, xem cách lên hạng, hoặc bật báo Tổ Bí Mật */
function useOpenRoom() {
  const g = useGame();
  const nav = useNav();
  return (r: RoomInfo) => {
    if (r.kind === 'locked') return nav.go({ name: 'rank' });
    if (r.kind === 'hidden') {
      const wasOn = g.state.profile.secretAlert;
      g.toggleSecretAlert();
      return nav.toast(wasOn ? 'Đã tắt báo Tổ Bí Mật' : 'Bạn sẽ được báo khi Tổ Bí Mật xuất hiện', 'good');
    }
    nav.go({ name: 'room', roomId: r.cfg.id });
  };
}

const prizeTitle = (cfg: RoomConfig) => cfg.prizes[0].name + (cfg.prizes.length > 1 ? ` +${cfg.prizes.length - 1}` : '');
const sortRooms = (xs: RoomInfo[]) => {
  const w = (r: RoomInfo) => (r.jackpot.length ? 0 : 10) + (r.status ? 0 : 5) + ({ running: 0, upcoming: 1, hidden: 2, locked: 3 } as const)[r.kind];
  return [...xs].sort((a, b) => w(a) - w(b));
};

function StatusDot({ status }: { status: RoomInfo['status'] }) {
  if (!status) return null;
  const c = TONE_COLORS[status.tone];
  return (
    <span className="row" style={{ gap: 5, fontSize: 12, fontWeight: 700, color: status.tone === 'lead' ? 'var(--lead)' : c.fg }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c.dot, flexShrink: 0 }} />
      {status.short}
    </span>
  );
}

function RoomIcon({ r, size = 44 }: { r: RoomInfo; size?: number }) {
  const bg = r.jackpot.length ? 'var(--ink)' : r.kind === 'running' ? 'var(--honey)' : r.kind === 'hidden' ? 'var(--ink)' : '#EFE6D2';
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: r.jackpot.length ? '2px solid var(--honey)' : 'none' }}>
      {r.jackpot.length ? (
        <HoneyJar size={size * 0.62} />
      ) : r.kind === 'locked' ? (
        <IcLock size={20} />
      ) : r.kind === 'hidden' ? (
        <span className="display" style={{ color: 'var(--honey)', fontSize: 22, fontWeight: 800 }}>
          ?
        </span>
      ) : (
        <IcGift size={22} color="#1C1712" />
      )}
    </div>
  );
}

function Timer({ r }: { r: RoomInfo }) {
  if (r.kind === 'running')
    return (
      <span className="row" style={{ gap: 4, color: 'var(--dup)', fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
        <IcClock size={14} color="#C2361F" />
        {r.timer}
      </span>
    );
  if (r.kind === 'upcoming') return <span className="xs muted" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>Mở sau {r.timer}</span>;
  if (r.kind === 'locked') return <span className="xs muted" style={{ fontWeight: 700 }}>Hạng {RANKS.find((x) => x.id === r.cfg.minRank)!.name}</span>;
  return <span className="xs muted" style={{ fontWeight: 700 }}>Bất ngờ</span>;
}

function RoomRow({ r, onOpen }: { r: RoomInfo; onOpen: (r: RoomInfo) => void }) {
  const rule = priceRule(r.cfg);
  return (
    <button className={`room-row ${r.jackpot.length ? 'jp' : ''}`} onClick={() => onOpen(r)}>
      <RoomIcon r={r} />
      <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
        <b className="ellipsis" style={{ fontSize: 15 }}>
          {prizeTitle(r.cfg)}
        </b>
        <span className="xs muted ellipsis">
          {r.jackpot.length ? <b style={{ color: 'var(--honey-text)' }}>+ Hũ mật · </b> : null}
          {r.cfg.name} · bước {fmtVnd(rule.step)}
          {r.kind === 'running' ? ` · ${r.parts} thợ săn` : ''}
        </span>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <Timer r={r} />
        <StatusDot status={r.status} />
        {!r.status && <AlertMark r={r} />}
      </div>
    </button>
  );
}

function JackpotStrip({ infos }: { infos: RoomInfo[] }) {
  const open = useOpenRoom();
  const jps = infos.filter((r) => r.jackpot.length);
  if (!jps.length) return null;
  return (
    <div className="section" style={{ paddingTop: 12 }}>
      {jps.map((r) => (
        <button key={r.cfg.id} className="jp-strip" onClick={() => open(r)}>
          <HoneyJar size={30} />
          <div className="col grow" style={{ gap: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--honey)' }}>HŨ MẬT · TỔ {r.cfg.name.toUpperCase()}</span>
            <b className="ellipsis" style={{ fontSize: 14 }}>
              Thêm {fmtVnd(r.jackpot.reduce((a, b) => a + b.valueVnd, 0))} quà đang chờ
            </b>
          </div>
          <Timer r={r} />
        </button>
      ))}
    </div>
  );
}


/** Dấu chuông: đã đặt nhắc tổ sắp mở / đã bật báo Tổ Bí Mật */
function AlertMark({ r }: { r: RoomInfo }) {
  const g = useGame();
  const p = g.state.profile;
  const on = r.kind === 'hidden' ? p.secretAlert : r.kind === 'upcoming' && p.reminders.includes(r.cfg.id);
  if (r.kind !== 'hidden' && r.kind !== 'upcoming') return null;
  if (r.kind === 'upcoming' && !on) return null;
  return (
    <span className="row" style={{ gap: 4, fontSize: 12, fontWeight: 700, color: on ? 'var(--honey-text)' : 'var(--muted)' }}>
      <IcBell size={13} color="currentColor" fill={on ? 'currentColor' : 'none'} />
      {r.kind === 'hidden' ? (on ? 'Đã bật báo' : 'Bấm để bật báo') : 'Đã đặt nhắc'}
    </span>
  );
}

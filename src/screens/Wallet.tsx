import { EARN_RULES, LOYALTY, STREAK, type EarnActionId } from '../config';
import { dayKey, addDays, fmtClock, fmtDate, fmtTime, windowRemaining } from '../engine/util';
import { useGame, useNav } from '../nav';
import { BottomNav } from '../components/common';
import { IcBack, IcBill, IcCheck, IcClock, IcInvite, IcPiggy, IcQr, IcTransfer } from '../components/Icons';
import type { JSX } from 'react';

const ICONS: Record<EarnActionId, JSX.Element> = {
  login: <IcCheck color="#17754A" />,
  transfer: <IcTransfer />,
  qr: <IcQr />,
  bill: <IcBill />,
  savings: <IcPiggy />,
  invite: <IcInvite />,
};
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function Wallet() {
  const g = useGame();
  const nav = useNav();
  const now = Date.now();
  const p = g.state.profile;
  const bal = g.balance(now);
  const exp = g.expiringSoon(now);
  const golden = g.isGoldenHour(now);
  const streak = g.streak(now);
  const playedToday = g.playedToday(now);
  // 7 ô của chuỗi: từ ngày bắt đầu chu kỳ hiện tại
  // vị trí của hôm nay trong chu kỳ 7 ngày
  const pos = playedToday ? (streak - 1) % STREAK.days : streak % STREAK.days;
  const inCycle = streak % STREAK.days;
  const days = Array.from({ length: STREAK.days }, (_, i) => {
    const ts = addDays(now, i - pos);
    return { key: dayKey(ts), label: WD[new Date(ts).getDay()], done: p.playedDays.includes(dayKey(ts)), today: dayKey(ts) === dayKey(now) };
  });
  const lastDay = !playedToday && inCycle === STREAK.days - 1;

  return (
    <>
      <div className="scroll">
        <header className="hdr">
          <div className="hdr-row">
            <button className="icon-btn" aria-label="Về sảnh" onClick={() => nav.go({ name: 'lobby' })}>
              <IcBack />
            </button>
            <span className="display grow" style={{ fontSize: 20, fontWeight: 700 }}>
              Ví giọt mật
            </span>
          </div>
          <div className="hdr-row" style={{ gap: 12 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="#F5B301" stroke="#FFF6E0" strokeWidth="1" aria-hidden="true">
              <path d="M12 2.5C12 2.5 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5z" />
            </svg>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="display" style={{ fontSize: 56, lineHeight: 1, fontWeight: 800, color: 'var(--honey)' }}>
                {bal}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>giọt mật</span>
            </div>
          </div>
          {exp && (
            <div className="row pulse" style={{ alignSelf: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--dup)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <IcClock color="#fff" />
              {exp.amount} giọt hết hạn lúc {fmtTime(exp.at).slice(0, 5)} {dayKey(exp.at) === dayKey(now) ? 'hôm nay' : fmtDate(exp.at)}
            </div>
          )}
        </header>

        <div className="section">
          <div className="card" style={{ gap: 10 }}>
            <div className="row between">
              <b style={{ fontSize: 15 }}>Chuỗi {streak} ngày liên tiếp</b>
              <span className="small" style={{ fontWeight: 700, color: 'var(--honey-text)' }}>
                +{STREAK.rewardDrops} giọt ở ngày {STREAK.days}
              </span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {days.map((d) => (
                <div
                  key={d.key}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 10,
                    background: d.done ? 'var(--honey)' : '#fff',
                    border: d.done ? '1.5px solid var(--ink)' : d.today ? '2px dashed var(--dup)' : '1.5px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: d.today && !d.done ? 'var(--dup-text)' : undefined,
                  }}
                >
                  {d.label}
                </div>
              ))}
            </div>
            {!playedToday && streak > 0 && (
              <div className="small" style={{ fontWeight: 600, color: 'var(--dup-text)' }}>
                {lastDay ? `Chỉ còn hôm nay để nhận thưởng chuỗi ${STREAK.days} ngày!` : `Đừng để mất chuỗi ${streak} ngày! Săn một phiên hôm nay nhé.`}
              </div>
            )}
            {playedToday && <div className="small" style={{ fontWeight: 600, color: 'var(--lead)' }}>Hôm nay bạn đã giữ chuỗi.</div>}
          </div>
        </div>

        {/* ---------- Đổi điểm Loyalty ---------- */}
        <div className="section">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <h2 className="section-title">Đổi điểm Loyalty</h2>
            <span style={{ fontSize: 14 }}>
              Bạn có <b>{p.loyaltyPoints.toLocaleString('vi-VN').replace(/,/g, '.')} điểm</b>
            </span>
          </div>

          <div className="card" style={{ background: 'var(--ink)', color: 'var(--cream)', boxShadow: golden ? '0 4px 0 var(--honey)' : 'none' }}>
            <div className="row between">
              <span className="badge" style={{ background: golden ? 'var(--honey)' : 'rgba(255,246,224,0.15)', color: golden ? 'var(--ink)' : 'var(--cream)' }}>
                GIỜ VÀNG · X2
              </span>
              <span className="small">
                {golden ? (
                  <>
                    Còn <b style={{ color: 'var(--honey)' }}>{p.demoGolden ? 'đang bật (demo)' : fmtClock(windowRemaining(now, LOYALTY.goldenHour.end))}</b>
                  </>
                ) : (
                  <>
                    Mỗi ngày {LOYALTY.goldenHour.start}–{LOYALTY.goldenHour.end}
                  </>
                )}
              </span>
            </div>
            <div className="row">
              <div className="col grow">
                <span className="display" style={{ fontSize: 22, fontWeight: 800 }}>
                  100 điểm = {g.exchangeDrops('le')} giọt
                </span>
                <span className="xs" style={{ opacity: 0.8 }}>
                  {golden ? 'Đang nhân đôi. Ngoài giờ vàng: 100 điểm = 1 giọt' : 'Trong giờ vàng: 100 điểm = 2 giọt'}
                </span>
              </div>
              <ExchangeBtn pkg="le" label="Đổi" />
            </div>
          </div>

          <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
            {LOYALTY.packages
              .filter((x) => x.id !== 'le')
              .map((pk) => {
                const locked = pk.goldenOnly && !golden;
                return (
                  <div
                    key={pk.id}
                    className="card"
                    style={{
                      flex: 1,
                      padding: 14,
                      gap: 6,
                      background: pk.goldenOnly ? 'var(--honey-soft)' : '#fff',
                      boxShadow: pk.goldenOnly && golden ? 'var(--shadow)' : 'none',
                      opacity: locked ? 0.75 : 1,
                    }}
                  >
                    <span className="xs" style={{ fontWeight: 700, color: 'var(--honey-text-strong)', letterSpacing: '0.06em' }}>
                      {pk.name.toUpperCase()}
                    </span>
                    <span className="display" style={{ fontSize: 26, lineHeight: 1, fontWeight: 800 }}>
                      {pk.drops} giọt
                    </span>
                    <span className="small">
                      {pk.points} điểm · {pk.goldenOnly ? 'chỉ trong giờ vàng' : 'tiết kiệm 10%'}
                    </span>
                    <ExchangeBtn pkg={pk.id} label={locked ? 'Chờ giờ vàng' : 'Đổi ngay'} disabled={locked} />
                  </div>
                );
              })}
          </div>

          <div className="col" style={{ gap: 6 }}>
            <div className="row between small">
              <span>Đã đổi hôm nay</span>
              <b>
                {p.counters.loyaltyDrops}/{LOYALTY.dailyDropLimit} giọt
              </b>
            </div>
            <div className="bar">
              <div style={{ width: `${Math.min(100, (p.counters.loyaltyDrops / LOYALTY.dailyDropLimit) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* ---------- Kiếm từ giao dịch ---------- */}
        <div className="section">
          <h2 className="section-title">Kiếm từ giao dịch</h2>
          <div className="card flat" style={{ padding: 0, gap: 0 }}>
            {EARN_RULES.map((r) => {
              const used = g.usedCount(r.id);
              const done = used >= r.limit;
              return (
                <div key={r.id} className="bidrow" style={{ gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: done ? 'var(--lead-soft)' : 'var(--honey-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {done ? <IcCheck color="#17754A" /> : ICONS[r.id]}
                  </div>
                  <div className="col grow">
                    <b style={{ fontSize: 14 }}>{r.label}</b>
                    <span className="xs" style={{ color: done ? 'var(--lead)' : 'var(--muted)', fontWeight: done ? 600 : 400 }}>
                      {r.id === 'login' ? (done ? 'Đã nhận hôm nay' : r.note) : r.limit === 99 ? r.note : `${used}/${r.limit} ${r.period === 'day' ? 'hôm nay' : 'tháng này'}`}
                    </span>
                  </div>
                  <span className="display" style={{ fontSize: 17, fontWeight: 800, color: done ? 'var(--lead)' : 'var(--honey-text)' }}>
                    +{r.drops}
                  </span>
                  {r.id !== 'login' && (
                    <button className="btn outline sm" style={{ padding: '0 12px', fontSize: 13 }} onClick={() => nav.openBank(r.id)}>
                      {r.id === 'invite' ? 'Mời' : 'Làm ngay'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="xs muted" style={{ lineHeight: 1.5 }}>
            Giọt mật từ giao dịch hết hạn vào Chủ nhật 23:59, từ đổi điểm hết hạn sau 30 ngày. Không mua được giọt mật bằng tiền.
          </div>
        </div>

        <div className="section">
          <h2 className="section-title" style={{ fontSize: 20 }}>
            Lịch sử ví
          </h2>
          <div className="card flat" style={{ padding: 0, gap: 0 }}>
            {p.ledger.length === 0 && <div className="bidrow small muted">Chưa có giao dịch giọt mật nào.</div>}
            {p.ledger.slice(0, 12).map((l) => (
              <div key={l.id} className="bidrow" style={{ padding: '10px 14px' }}>
                <div className="col grow">
                  <span style={{ fontSize: 14 }}>{l.text}</span>
                  <span className="xs muted">
                    {fmtTime(l.at).slice(0, 5)} {fmtDate(l.at)}
                  </span>
                </div>
                <b style={{ color: l.delta > 0 ? 'var(--lead)' : 'var(--dup-text)' }}>
                  {l.delta > 0 ? '+' : ''}
                  {l.delta}
                </b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}

function ExchangeBtn({ pkg, label, disabled }: { pkg: string; label: string; disabled?: boolean }) {
  const g = useGame();
  const nav = useNav();
  return (
    <button
      className="btn sm"
      disabled={disabled}
      style={{ marginTop: 4 }}
      onClick={() => {
        const r = g.exchange(pkg);
        nav.toast(r.message, r.ok ? 'good' : 'warn');
      }}
    >
      {label}
    </button>
  );
}

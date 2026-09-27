import { HUNT_POINTS, RANKS } from '../config';
import { nextRank, rankOf } from '../engine/game';
import { endOfMonth } from '../engine/util';
import { useGame, useNav } from '../nav';
import { Bee } from '../components/Bee';
import { BottomNav } from '../components/common';
import { IcBack } from '../components/Icons';

const TOP = [
  { name: 'Anh H*** N***', pts: 4820 },
  { name: 'Chị T*** M***', pts: 4115 },
  { name: 'Anh K***', pts: 3690 },
];

function Hex({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 84 92" aria-hidden="true">
      <path d="M42 3l37 21v44L42 89 5 68V24z" fill={color} stroke="#1C1712" strokeWidth="4" />
    </svg>
  );
}

export function Rank() {
  const g = useGame();
  const nav = useNav();
  const now = Date.now();
  const p = g.state.profile;
  const rank = rankOf(p.huntPoints);
  const next = nextRank(p.huntPoints);
  const seasonEnd = endOfMonth(now);
  const leftMs = seasonEnd - now;
  const leftDays = Math.floor(leftMs / 86400000);
  const leftH = Math.floor((leftMs % 86400000) / 3600000);
  const month = new Date(now).getMonth() + 1;
  const prevMin = rank.minPoints;
  const pct = next ? ((p.huntPoints - prevMin) / (next.minPoints - prevMin)) * 100 : 100;

  // Bảng xếp hạng minh họa: 3 thợ săn ảo dẫn đầu + vị trí ước tính của bạn
  const board = [...TOP.map((t) => ({ ...t, me: false })), { name: 'Bạn', pts: p.huntPoints, me: true }].sort((a, b) => b.pts - a.pts);
  const myPos = board.findIndex((b) => b.me);
  const myRankNo = myPos < 3 ? myPos + 1 : Math.max(4, Math.round(1600 - p.huntPoints * 0.5));

  return (
    <>
      <div className="scroll">
        <header className="hdr" style={{ paddingBottom: 80, gap: 8 }}>
          <div className="hdr-row">
            <button className="icon-btn" aria-label="Về sảnh" onClick={() => nav.go({ name: 'lobby' })}>
              <IcBack />
            </button>
            <span className="display grow" style={{ fontSize: 20, fontWeight: 700 }}>
              Hạng mùa
            </span>
          </div>
          <div className="display" style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: 'var(--honey)' }}>
            Mùa tháng {month}
          </div>
          <div className="small">
            Kết thúc sau{' '}
            <b style={{ color: 'var(--honey)' }}>
              {leftDays} ngày {leftH} giờ
            </b>
          </div>
        </header>

        <div className="section" style={{ marginTop: -60, paddingTop: 0 }}>
          <div className="card" style={{ borderRadius: 22 }}>
            <div className="row" style={{ gap: 14 }}>
              <div style={{ position: 'relative', width: 84, height: 92, flexShrink: 0 }}>
                <Hex color={rank.color} size={84} />
                <div style={{ position: 'absolute', left: 12, top: 18 }}>
                  <Bee size={60} mood="happy" />
                </div>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span className="small muted">Hạng hiện tại</span>
                <span className="display" style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 800 }}>
                  {rank.name} · {rank.bee}
                </span>
                <span style={{ fontSize: 14 }}>
                  <b>{p.huntPoints.toLocaleString('vi-VN').replace(/,/g, '.')}</b> điểm săn
                </span>
              </div>
            </div>
            {next ? (
              <div className="col" style={{ gap: 6 }}>
                <div style={{ height: 12, borderRadius: 6, background: '#F3EAD3', border: '1.5px solid var(--ink)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: next.color }} />
                </div>
                <div className="row between small">
                  <span>
                    Còn <b>{next.minPoints - p.huntPoints} điểm</b> lên hạng {next.name}
                  </span>
                  {next.id === 'vang' && <span style={{ fontWeight: 700, color: 'var(--honey-text)' }}>Mở phòng VIP</span>}
                </div>
              </div>
            ) : (
              <div className="small" style={{ fontWeight: 700, color: 'var(--lead)' }}>
                Bạn đang ở hạng cao nhất!
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Bậc thang đàn ong</h2>
          {[...RANKS].reverse().map((r) => {
            const me = r.id === rank.id;
            return (
              <div
                key={r.id}
                className="row"
                style={{ padding: '12px 14px', borderRadius: 16, background: me ? 'var(--honey-soft)' : '#fff', border: me ? '2px solid var(--ink)' : '1.5px solid var(--line)', gap: 12 }}
              >
                <Hex color={r.color} />
                <div className="col grow">
                  <b style={{ fontSize: 15 }}>
                    {r.name} · {r.bee} {me && <span style={{ fontSize: 12, color: 'var(--honey-text)' }}>(bạn)</span>}
                  </b>
                  <span className="xs muted">{r.perk}</span>
                </div>
                <span className="small" style={{ fontWeight: 700 }}>
                  {r.minPoints.toLocaleString('vi-VN').replace(/,/g, '.')}
                </span>
              </div>
            );
          })}
          <div className="xs muted">Đầu mỗi mùa, hạng hạ một bậc. Hãy tiếp tục săn để giữ quyền vào VIP.</div>
        </div>

        <div className="section">
          <h2 className="section-title">Cách kiếm điểm săn</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {[
              [`+${HUNT_POINTS.joinSession}`, 'Tham gia một phiên'],
              [`+${HUNT_POINTS.holdLeadEvery}`, `Mỗi ${HUNT_POINTS.holdLeadIntervalSec} giây giữ ngôi đầu (bản demo)`],
              [`+${HUNT_POINTS.win}`, 'Thắng một phiên'],
              [`+${HUNT_POINTS.streak7}`, 'Hoàn thành chuỗi 7 ngày'],
            ].map(([n, t]) => (
              <div key={t} className="card flat" style={{ padding: 12, gap: 2 }}>
                <span className="display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--honey-text)' }}>
                  {n}
                </span>
                <span className="small">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Top thợ săn mùa này</h2>
          <div className="card flat" style={{ padding: 0, gap: 0 }}>
            {board.slice(0, 3).map((b, i) => (
              <div key={b.name} className="bidrow" style={{ padding: '10px 14px', gap: 12, background: b.me ? 'var(--honey-soft)' : undefined }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: ['#D4A017', '#C9CDD2', '#B87333'][i],
                    color: i === 2 ? '#fff' : 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {i + 1}
                </span>
                <span className="grow" style={{ fontSize: 14, fontWeight: 600 }}>
                  {b.name}
                </span>
                <b style={{ fontSize: 14 }}>{b.pts.toLocaleString('vi-VN').replace(/,/g, '.')}</b>
              </div>
            ))}
            {myPos >= 3 && (
              <div className="bidrow" style={{ padding: '10px 14px', gap: 12, background: 'var(--honey-soft)', borderRadius: '0 0 18px 18px' }}>
                <span
                  style={{ minWidth: 28, height: 28, borderRadius: 14, background: 'var(--ink)', color: 'var(--honey)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, padding: '0 4px' }}
                >
                  {myRankNo}
                </span>
                <span className="grow" style={{ fontSize: 14, fontWeight: 700 }}>
                  Bạn
                </span>
                <b style={{ fontSize: 14 }}>{p.huntPoints.toLocaleString('vi-VN').replace(/,/g, '.')}</b>
              </div>
            )}
          </div>
          <div className="xs muted">Bảng xếp hạng trong bản demo là dữ liệu minh họa.</div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}

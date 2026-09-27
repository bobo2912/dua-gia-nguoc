import { ME } from '../engine/types';
import { fmtDate, fmtTime, fmtVnd } from '../engine/util';
import { useGame, useNav } from '../nav';
import { Bee } from '../components/Bee';
import { BottomNav, PrizeImage } from '../components/common';
import { IcBack } from '../components/Icons';

export function History() {
  const g = useGame();
  const nav = useNav();
  const prizes = g.state.profile.prizes;
  const hist = g.state.history;

  return (
    <>
      <div className="scroll">
        <header className="hdr">
          <div className="hdr-row">
            <button className="icon-btn" aria-label="Về sảnh" onClick={() => nav.go({ name: 'lobby' })}>
              <IcBack />
            </button>
            <span className="display grow" style={{ fontSize: 20, fontWeight: 700 }}>
              Kết quả của bạn
            </span>
          </div>
        </header>

        {prizes.length > 0 && (
          <div className="section">
            <h2 className="section-title">Quà của tôi</h2>
            {prizes.map((p) => (
              <button
                key={p.id}
                className="card"
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, textAlign: 'left', boxShadow: p.status === 'pending' ? 'var(--shadow)' : 'none' }}
                onClick={() => nav.go({ name: 'win', sessionId: p.sessionId })}
              >
                <PrizeImage size={56} label="" />
                <div className="col grow" style={{ gap: 2 }}>
                  <b style={{ fontSize: 15 }}>{p.prize.name}</b>
                  <span className="xs muted">
                    Tổ {p.roomName} · giá chốt {fmtVnd(p.priceVnd)}
                  </span>
                  <span className="xs" style={{ fontWeight: 700, color: p.status === 'pending' ? 'var(--dup-text)' : 'var(--lead)' }}>
                    {p.status === 'pending' ? `Chờ xác nhận trước ${fmtDate(p.deadline)}` : `Đã xác nhận · ${p.method}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="section">
          <h2 className="section-title">Các phiên đã tham gia</h2>
          {hist.length === 0 && (
            <div className="card flat" style={{ alignItems: 'center', textAlign: 'center' }}>
              <Bee size={72} mood="happy" gavel="side" />
              <div className="small">Bạn chưa tham gia phiên nào. Vào một tổ săn và ra giá đầu tiên nhé!</div>
              <button className="btn" onClick={() => nav.go({ name: 'lobby' })}>
                Về sảnh
              </button>
            </div>
          )}
          {hist.length > 0 && (
            <div className="card flat" style={{ padding: 0, gap: 0 }}>
              {hist.map((h) => {
                const won = h.result.winners.some((w) => w.owner === ME);
                const best = h.result.my.find((m) => m.status !== 'dup');
                return (
                  <button
                    key={h.sessionId}
                    className="bidrow"
                    style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
                    onClick={() => nav.go({ name: 'result', sessionId: h.sessionId })}
                  >
                    <div className="col grow">
                      <b style={{ fontSize: 14 }}>
                        Tổ {h.roomName} #{h.no}
                      </b>
                      <span className="xs muted">
                        {fmtTime(h.endAt).slice(0, 5)} {fmtDate(h.endAt)} · {h.result.my.length} giá ·{' '}
                        {h.result.winners.length ? `giá chốt ${fmtVnd(h.result.winners[0].price * h.stepVnd)}` : 'không có người thắng'}
                      </span>
                    </div>
                    <span className={`pill ${won ? 'win' : best ? 'unique' : 'dup'}`} style={{ fontSize: 12 }}>
                      {won ? 'Thắng' : best ? 'Suýt thắng' : 'Bị trùng'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}

import { priceRule } from '../config';
import { roomCfg } from '../engine/game';
import { fmtDate, fmtDur, fmtTime, fmtVnd } from '../engine/util';
import { useGame, useNav } from '../nav';
import { Bee } from '../components/Bee';
import { IcBack, IcCrown, IcGavel, IcShield } from '../components/Icons';
import { ME } from '../engine/types';

export function Result({ sessionId }: { sessionId: string }) {
  const g = useGame();
  const nav = useNav();
  const item = g.state.history.find((h) => h.sessionId === sessionId);
  if (!item) {
    return (
      <div className="scroll">
        <div className="section">
          Không tìm thấy kết quả.{' '}
          <button className="btn link" onClick={() => nav.go({ name: 'lobby' })}>
            Về sảnh
          </button>
        </div>
      </div>
    );
  }
  const r = item.result;
  const step = item.stepVnd;
  const cfg = roomCfg(item.roomId);
  const iWon = r.winners.some((w) => w.owner === ME);
  const winPrices = new Set(r.winners.map((w) => w.price));
  const myPrices = new Set(r.my.map((m) => m.price));

  // Biểu đồ: 24 con số quanh giá thắng (hoặc quanh giá của bạn nếu không có người thắng)
  const center = r.winners[0]?.price ?? r.my[0]?.price ?? r.counts[0]?.[0] ?? 1;
  const rule = priceRule(cfg);
  const startK = Math.max(1, Math.round(center / rule.step) - 10);
  const endK = Math.min(rule.levels, startK + 23);
  const countMap = new Map(r.counts);
  const cols = Array.from({ length: endK - startK + 1 }, (_, i) => (startK + i) * rule.step);
  const short = (v: number) => (v >= 1_000_000 ? `${+(v / 1_000_000).toFixed(2)}tr` : v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`);
  const maxC = Math.max(1, ...cols.map((c) => countMap.get(c) ?? 0));
  const barH = (c: number) => (c === 0 ? 0 : Math.max(6, Math.sqrt(c / maxC) * 120));

  const downloadCsv = () => {
    const blob = new Blob([r.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-gia-to-${item.roomId}-${item.no}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="scroll">
      <header className="hdr" style={{ paddingBottom: 72 }}>
        <div className="hdr-row">
          <button className="icon-btn" aria-label="Quay lại" onClick={nav.back}>
            <IcBack />
          </button>
          <span className="small" style={{ opacity: 0.85 }}>
            Tổ săn #{item.no} · {item.roomName} · {fmtTime(item.endAt).slice(0, 5)} {fmtDate(item.endAt)}
          </span>
        </div>
        <div className="hdr-row" style={{ gap: 12 }}>
          <IcGavel size={52} color="#F5B301" />
          <div className="display" style={{ fontSize: 40, lineHeight: 1, fontWeight: 800, color: 'var(--honey)' }}>
            Búa đã gõ!
          </div>
        </div>
      </header>

      <div className="section" style={{ marginTop: -56, paddingTop: 0 }}>
        {r.winners.map((w, i) => (
          <div key={i} className="card" style={{ alignItems: 'center', textAlign: 'center', gap: 6, borderRadius: 22, background: w.owner === ME ? 'var(--lead-soft)' : '#fff' }}>
            <svg width="40" height="32" viewBox="0 0 24 18" fill="#D4A017" stroke="#1C1712" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 5l5 4 5-7 5 7 5-4-2 11H4z" />
            </svg>
            <div className="small muted">{r.winners.length > 1 ? `Thợ săn thắng quà ${i + 1}` : 'Thợ săn chiến thắng'}</div>
            <div className="display" style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 800 }}>
              {w.owner === ME ? `Bạn (${w.name})` : w.name}
            </div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14 }}>Giá chốt</span>
              <span className="display" style={{ fontSize: 40, lineHeight: 1, fontWeight: 800, color: 'var(--lead)' }}>
                {fmtVnd(w.price * step)}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Săn được {w.prize.name}</div>
          </div>
        ))}
        {r.winners.length === 0 && (
          <div className="card" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
            <Bee size={72} mood="shock" />
            <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>
              Không có giá duy nhất nào!
            </div>
          </div>
        )}
        {(r.rolledOver.length > 0 || r.voided.length > 0) && (
          <div className="card flat small" style={{ gap: 4, background: r.rolledOver.length ? 'var(--honey-soft)' : '#fff' }}>
            {r.rolledOver.length > 0 && (
              <span>
                <b>Dồn Hũ mật:</b> {r.rolledOver.map((x) => x.name.replace(' (dồn)', '')).join(', ')} được cộng vào phiên sau của Tổ {item.roomName}.
              </span>
            )}
            {r.voided.length > 0 && (
              <span>
                <b>Bỏ phiên:</b> {r.voided.map((x) => x.name).join(', ')} không có người nhận và được trả về kho theo thể lệ.
              </span>
            )}
          </div>
        )}
        {r.demoBoost && (
          <div className="xs" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--honey-text)' }}>
            Kết quả được công cụ demo hỗ trợ (bánh răng → Hỗ trợ thắng)
          </div>
        )}
        <div className="xs muted" style={{ textAlign: 'center' }}>
          {r.participants.toLocaleString('vi-VN')} thợ săn · {r.totalBids.toLocaleString('vi-VN')} lượt ra giá
        </div>
        <button className="btn outline sm" onClick={() => nav.openReveal(sessionId)}>
          Xem lại màn lật bài
        </button>
      </div>

      {!iWon && r.my.length > 0 && (
        <div className="section">
          <div className="row" style={{ background: 'var(--honey-soft)', border: '2px solid var(--honey-deep)', borderRadius: 20, padding: 14, gap: 12 }}>
            <Bee size={72} mood={r.nearMiss ? 'shock' : 'worried'} />
            <div className="col" style={{ gap: 4 }}>
              <div className="display" style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800 }}>
                {r.nearMiss ? 'Suýt nữa!' : 'Tiếc quá!'}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.45 }}>
                {r.nearMiss ? (
                  <>
                    Giá <b>{fmtVnd(r.nearMiss.myPrice)}</b> của bạn là duy nhất, chỉ cao hơn giá chốt đúng <b>{fmtVnd(r.nearMiss.diff)}</b>.
                  </>
                ) : (
                  'Tất cả giá của bạn đều bị trùng. Lần sau thử một vùng giá khác nhé.'
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {iWon && (
        <div className="section">
          <button className="btn big" onClick={() => nav.go({ name: 'win', sessionId })}>
            Nhận quà của bạn
          </button>
        </div>
      )}

      <div className="section">
        <h2 className="section-title" style={{ fontSize: 20 }}>
          Phân bố giá trong phiên
        </h2>
        <div className="card flat" style={{ padding: '16px 12px 12px', gap: 10 }}>
          <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', gap: 3, borderBottom: '1.5px solid var(--ink)' }} role="img" aria-label="Biểu đồ số lượt ra giá ở mỗi mức giá">
            {cols.map((c) => {
              const n = countMap.get(c) ?? 0;
              const win = winPrices.has(c);
              const mineC = myPrices.has(c);
              const bg = win ? 'var(--lead)' : n === 1 ? 'var(--honey)' : '#D6C9AE';
              return (
                <div key={c} className="col" style={{ flex: 1, alignItems: 'center', gap: 2, minWidth: 0 }}>
                  {n > 0 && (
                    <span style={{ fontSize: 9, color: win ? 'var(--lead)' : 'var(--muted)', fontWeight: win || mineC ? 700 : 400 }}>{n}</span>
                  )}
                  <div
                    style={{
                      width: '100%',
                      height: barH(n),
                      borderRadius: '3px 3px 0 0',
                      background: n ? bg : 'transparent',
                      border: mineC ? '2px solid var(--ink)' : undefined,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3, fontSize: 9, color: 'var(--muted)', textAlign: 'center' }} aria-hidden="true">
            {cols.map((c) => (
              <span key={c} style={{ flex: 1, minWidth: 0, fontWeight: winPrices.has(c) ? 700 : 400, color: winPrices.has(c) ? 'var(--lead)' : undefined }}>
                {(c / rule.step) % 4 === 0 || winPrices.has(c) ? short(c) : ''}
              </span>
            ))}
          </div>
          <div className="row xs" style={{ flexWrap: 'wrap', gap: 12 }}>
            <Legend color="var(--lead)" label="Giá thắng" />
            <Legend color="var(--honey)" label="Duy nhất" />
            <Legend color="#D6C9AE" label="Bị trùng" />
            <Legend outline label="Giá của bạn" />
          </div>
          <div className="xs muted" style={{ lineHeight: 1.5 }}>
            Mỗi cột là một mức giá (bước {fmtVnd(rule.step)}), số trên cột là số lượt chọn mức đó. Biểu đồ hiện 24 mức quanh giá thắng. Chiều cao cột theo thang căn bậc hai để thấy rõ các mức ít người chọn.
          </div>
        </div>
      </div>

      {r.my.length > 0 && (
        <div className="section">
          <h2 className="section-title" style={{ fontSize: 20 }}>
            Bạn trong phiên này
          </h2>
          <div className="card flat" style={{ padding: 0, gap: 0 }}>
            {r.my.map((m) => (
              <div key={m.price} className="bidrow" style={{ padding: '10px 14px' }}>
                <span style={{ flex: 1, fontWeight: 700, color: m.status === 'dup' ? '#8C7F6E' : undefined }}>{fmtVnd(m.price * step)}</span>
                <span className="small" style={{ fontWeight: 600, color: m.status === 'win' ? 'var(--lead)' : m.status === 'unique' ? 'var(--honey-text-strong)' : 'var(--dup-text)' }}>
                  {m.status === 'win' ? `Thắng · hạng ${m.uniqueRank}` : m.status === 'unique' ? `Duy nhất · hạng ${m.uniqueRank}` : 'Bị trùng'}
                </span>
              </div>
            ))}
            {r.throne && (r.throne.myTotalMs > 0 || r.throne.newRecord) && (
              <div className="bidrow" style={{ padding: '10px 14px', gap: 8 }}>
                <IcCrown size={16} color="#D4A017" />
                <span className="grow small">
                  Ngồi ngai tổng <b>{fmtDur(r.throne.myTotalMs)}</b> · lâu nhất <b>{fmtDur(r.throne.myBestMs)}</b>
                </span>
                {r.throne.newRecord && (
                  <span className="pill unique" style={{ fontSize: 12 }}>
                    Phá kỷ lục
                  </span>
                )}
              </div>
            )}
            <div className="row" style={{ padding: '12px 14px', background: 'var(--ink)', color: 'var(--cream)', borderRadius: '0 0 18px 18px' }}>
              <span className="grow small">Điểm săn nhận được</span>
              <span className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--honey)' }}>
                +{r.pointsEarned}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div style={{ border: '1.5px dashed #D6C9AE', borderRadius: 16, padding: '12px 14px' }} className="col">
          <div className="row small" style={{ fontWeight: 700, gap: 8 }}>
            <IcShield color="#17754A" />
            Kết quả minh bạch
          </div>
          <div className="xs muted" style={{ fontFamily: 'monospace', wordBreak: 'break-all', margin: '6px 0' }}>
            Mã kiểm chứng (SHA-256): {r.hash}
          </div>
          <button className="btn link" style={{ alignSelf: 'flex-start', padding: '8px 0', color: 'var(--honey-text)', fontSize: 14 }} onClick={downloadCsv}>
            Tải danh sách giá ẩn danh (.csv)
          </button>
          <div className="xs muted">Băm lại file tải về bằng SHA-256 sẽ ra đúng mã trên.</div>
        </div>
      </div>

      <div className="section">
        <button className="btn big" onClick={() => nav.go({ name: 'lobby' })}>
          Săn tiếp
        </button>
      </div>
    </div>
  );
}

function Legend({ color, label, outline }: { color?: string; label: string; outline?: boolean }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: outline ? 'transparent' : color, border: outline ? '2px solid var(--ink)' : undefined }} />
      {label}
    </span>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bee } from './Bee';
import { IcCrown, IcX } from './Icons';
import { store } from '../engine/game';
import { ME, type SessionResult } from '../engine/types';
import { fmtVnd } from '../engine/util';

// =====================================================================
// GÕ BÚA KIỂU "LẬT BÀI"
// Nhịp 1: búa gõ. Nhịp 2: lật từng mức giá từ thấp lên, mức nào trùng bị loại,
// đến mức DUY NHẤT đầu tiên là người thắng. Giá của bạn được đánh dấu khi lật tới.
// =====================================================================

type Step =
  | { kind: 'level'; price: number; count: number; mine: boolean; winIdx: number | null; drum: boolean }
  | { kind: 'skip'; n: number; bids: number; from: number; to: number };

/** Dựng chuỗi lật bài. Mức không quan trọng ở giữa được gộp lại để màn lật không quá dài. */
export function buildSteps(r: SessionResult): Step[] {
  const myP = new Set(r.my.map((m) => m.price));
  const winIdx = new Map(r.winners.map((w, i) => [w.price, i]));
  const lastWin = r.winners.length ? r.winners[r.winners.length - 1].price : null;
  let levels = r.counts.filter(([p]) => lastWin === null || p <= lastWin);
  if (lastWin === null) levels = levels.slice(0, 40);
  const n = levels.length;
  const winPos = levels.map(([p], i) => (winIdx.has(p) ? i : -1)).filter((i) => i >= 0);
  const keep = levels.map(([p], i) => {
    if (i < 5 || myP.has(p) || winIdx.has(p)) return true;
    if (winPos.some((w) => i < w && w - i <= 4)) return true;
    if (lastWin === null && i >= n - 4) return true;
    return false;
  });
  const steps: Step[] = [];
  let i = 0;
  while (i < n) {
    if (keep[i]) {
      const [p, c] = levels[i];
      const drum = winPos.some((w) => i < w && w - i <= 3);
      steps.push({ kind: 'level', price: p, count: c, mine: myP.has(p), winIdx: winIdx.get(p) ?? null, drum });
      i++;
      continue;
    }
    let j = i;
    while (j < n && !keep[j]) j++;
    const run = levels.slice(i, j);
    if (run.length >= 3) {
      steps.push({ kind: 'skip', n: run.length, bids: run.reduce((t, [, c]) => t + c, 0), from: run[0][0], to: run[run.length - 1][0] });
    } else {
      for (const [p, c] of run) steps.push({ kind: 'level', price: p, count: c, mine: myP.has(p), winIdx: winIdx.get(p) ?? null, drum: false });
    }
    i = j;
  }
  return steps;
}

/** Thời gian chờ trước khi lật bước này (ms) */
function delayOf(st: Step, firstWin: boolean): number {
  if (st.kind === 'skip') return 850;
  if (st.winIdx !== null) return firstWin ? DRUM_MS : 1500;
  if (st.drum) return 1050;
  if (st.mine) return 900;
  return 520;
}

/** Hồi trống trước lá thắng đầu tiên: đếm 3 – 2 – 1 */
const DRUM_MS = 2700;

export function GavelOverlay({
  sessionId,
  won,
  replay,
  onDone,
}: {
  sessionId: string;
  won: boolean;
  replay?: boolean;
  onDone: (target: 'win' | 'result') => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  const item = store.state.history.find((h) => h.sessionId === sessionId);
  const r = item?.result;
  const steps = useMemo(() => (r ? buildSteps(r) : []), [r]);
  const iWon = !!r?.winners.some((w) => w.owner === ME) || won;

  const [shown, setShown] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const finished = shown >= steps.length;
  const firstWinPos = steps.findIndex((st) => st.kind === 'level' && st.winIdx !== null);
  /** Lá sắp lật là lá thắng đầu tiên: dành một hồi trống */
  const firstWinNext = !finished && shown === firstWinPos;

  // Búa gõ và màn lật bài hiện cùng lúc, để người chơi biết kết quả đang được công bố
  useEffect(() => {
    if (!replay) {
      try {
        navigator.vibrate?.([80, 60, 120]);
      } catch {
        /* không hỗ trợ rung */
      }
    }
    // Không có dữ liệu kết quả (hiếm): chỉ gõ búa rồi chuyển sang màn kết quả
    if (!r) {
      const t = window.setTimeout(() => done.current(won ? 'win' : 'result'), 1200);
      return () => window.clearTimeout(t);
    }
  }, [r, won, replay]);

  // Lật từng bước
  useEffect(() => {
    if (!r || shown >= steps.length) return;
    const t = window.setTimeout(() => {
      const st = steps[shown];
      setShown((x) => x + 1);
      if (st.kind === 'level' && st.winIdx !== null) {
        try {
          navigator.vibrate?.(st.mine ? [60, 40, 60, 40, 220] : 90);
        } catch {
          /* bỏ qua */
        }
      }
    }, firstWinNext ? DRUM_MS : shown === 0 ? (replay ? 300 : 650) : delayOf(steps[shown], false));
    return () => window.clearTimeout(t);
  }, [r, shown, steps, replay, firstWinNext]);

  // Đếm 3 – 2 – 1 trên lá úp trước khi lật lá thắng đầu tiên
  const [drum, setDrum] = useState(0);
  useEffect(() => {
    if (!firstWinNext) {
      setDrum(0);
      return;
    }
    setDrum(3);
    const per = DRUM_MS / 3;
    const t1 = window.setTimeout(() => setDrum(2), per);
    const t2 = window.setTimeout(() => setDrum(1), per * 2);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [firstWinNext, shown]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Kết thúc mà bạn thắng: cuộn tới dòng giá thắng của bạn; còn lại luôn bám theo lá vừa lật
    const myWin = finished && iWon ? el.querySelector<HTMLElement>('.flip-row.win.mine') : null;
    if (myWin) el.scrollTo({ top: myWin.offsetTop - el.clientHeight / 2 + myWin.clientHeight / 2, behavior: 'smooth' });
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [shown, finished, iWon]);

  if (!r || !item) {
    return (
      <div className="gavel-stage" role="alert" aria-label="Búa đã gõ">
        <div className="slam">
          <svg className="gavel-hit" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
            <rect x="62" y="40" width="14" height="86" rx="6" fill="#8A5A00" stroke="#FFF6E0" strokeWidth="3" transform="rotate(-40 69 83)" />
            <rect x="20" y="20" width="70" height="36" rx="10" fill="#D4A017" stroke="#FFF6E0" strokeWidth="3" transform="rotate(-40 55 38)" />
          </svg>
        </div>
        <div className="display" style={{ fontSize: 44, fontWeight: 800 }}>
          GÕ BÚA!
        </div>
        <Bee size={72} mood="determined" onDark />
        <div style={{ color: 'var(--cream)', fontSize: 14 }}>Chuẩn bị lật bài…</div>
      </div>
    );
  }

  const visible = steps.slice(0, shown);
  const lastShown = visible[visible.length - 1];
  const nextStep = steps[shown];
  const winnersShown = visible.filter((s) => s.kind === 'level' && s.winIdx !== null).length;
  const firstWin = r.winners[0];
  const myUniqueAbove = r.my.filter((m) => m.status === 'unique');

  let caption = 'Lật từ giá thấp nhất. Mức nào trùng sẽ bị loại…';
  if (firstWinNext) caption = shown === 0 ? 'Mức thấp nhất của phiên… có ai trùng không?' : 'Mức tiếp theo… có ai trùng không?';
  else if (nextStep?.kind === 'level' && nextStep.winIdx !== null) caption = 'Còn một phần quà nữa…';
  else if (nextStep?.kind === 'level' && nextStep.drum) caption = 'Sắp tới rồi…';
  else if (lastShown?.kind === 'level' && lastShown.mine && lastShown.winIdx === null) caption = 'Giá của bạn bị trùng mất rồi!';
  if (finished) {
    caption = iWon
      ? 'BẠN THẮNG RỒI!'
      : r.winners.length
        ? myUniqueAbove.length
          ? 'Suýt nữa! Giá của bạn duy nhất nhưng chưa thấp nhất.'
          : 'Phiên này chưa phải của bạn.'
        : 'Không có giá duy nhất nào!';
  }
  const mood = finished ? (iWon ? 'joy' : myUniqueAbove.length ? 'shock' : 'worried') : firstWinNext ? 'shock' : 'determined';

  return (
    <div className={`gavel-stage flip-stage ${finished && iWon ? 'won' : ''}`} role="dialog" aria-label="Lật bài kết quả">
      {finished && iWon && <Confetti />}
      <div className="flip-top">
        <svg className={replay ? '' : 'gavel-hit-once'} width="46" height="46" viewBox="0 0 140 140" aria-hidden="true" style={{ flexShrink: 0 }}>
          <rect x="62" y="40" width="14" height="86" rx="6" fill="#8A5A00" stroke="#FFF6E0" strokeWidth="5" transform="rotate(-40 69 83)" />
          <rect x="20" y="20" width="70" height="36" rx="10" fill="#D4A017" stroke="#FFF6E0" strokeWidth="5" transform="rotate(-40 55 38)" />
        </svg>
        <div className="col grow" style={{ gap: 0 }}>
          <span className={`display ${replay ? '' : 'slam-once'}`} style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: 'var(--honey)' }}>
            {replay ? 'XEM LẠI LẬT BÀI' : 'GÕ BÚA!'}
          </span>
          <span className="event-tag" style={{ color: '#E9DFC9', marginTop: 3 }}>
            TỔ {item.roomName.toUpperCase()} #{item.no} · {finished ? 'ĐÃ CÔNG BỐ' : 'ĐANG LẬT BÀI'}
          </span>
          <span className="xs" style={{ color: '#C9BDA8' }}>
            {r.participants.toLocaleString('vi-VN')} thợ săn · {r.totalBids.toLocaleString('vi-VN')} lượt ra giá
          </span>
        </div>
        {!finished && (
          <button className="chip ghost" onClick={() => setShown(steps.length)}>
            Lật hết
          </button>
        )}
      </div>

      <div className="flip-hero">
        <Bee size={64} mood={mood} gavel={finished && iWon ? 'raised' : 'none'} onDark />
        <div className={`display flip-caption ${finished ? 'end' : ''}`} aria-live="polite">
          {caption}
        </div>
      </div>

      <div className="flip-list" ref={listRef}>
        {visible.map((st, i) =>
          st.kind === 'skip' ? (
            <div key={i} className="flip-row skip">
              <span className="grow">
                {fmtVnd(st.from)} → {fmtVnd(st.to)}: {st.n} mức tiếp theo đều trùng
              </span>
              <span className="flip-badge dup">{st.bids} lượt</span>
            </div>
          ) : (
            <div key={i} className={`flip-row ${st.winIdx !== null ? 'win' : 'dup'} ${st.mine ? 'mine' : ''}`}>
              <span className="display flip-price">{fmtVnd(st.price)}</span>
              {st.mine && <span className="flip-me">BẠN</span>}
              <span className="grow" />
              {st.winIdx !== null ? (
                <span className="flip-badge win">
                  <IcCrown size={13} color="#1C1712" />
                  DUY NHẤT{r.winners.length > 1 ? ` · QUÀ ${st.winIdx + 1}` : ''}
                </span>
              ) : (
                <span className="flip-badge dup">
                  <IcX size={12} />
                  {st.count} người
                </span>
              )}
            </div>
          ),
        )}
        {nextStep && (
          <div className={`flip-row facedown ${firstWinNext ? 'tense drum' : ''}`} aria-hidden="true">
            {firstWinNext && drum > 0 ? (
              <span key={drum} className="display drum-num">
                {drum}
              </span>
            ) : (
              <span className="display flip-price">? ? ?</span>
            )}
          </div>
        )}
      </div>

      {finished && (
        <div className="flip-end">
          {firstWin ? (
            <div className="flip-summary">
              <span className="small" style={{ opacity: 0.8 }}>
                {r.winners.length > 1 ? `${winnersShown} người thắng · giá chốt thấp nhất` : 'Giá chốt'}
              </span>
              <span className="display" style={{ fontSize: 40, lineHeight: 1, fontWeight: 800, color: 'var(--honey)' }}>
                {fmtVnd(firstWin.price)}
              </span>
              <span className="small">
                {iWon ? `Bạn săn được ${r.winners.find((w) => w.owner === ME)!.prize.name}` : `${firstWin.name} săn được ${firstWin.prize.name}`}
              </span>
              {!iWon && myUniqueAbove.length > 0 && (
                <span className="xs" style={{ color: '#FFB8A8', fontWeight: 600 }}>
                  Giá {fmtVnd(myUniqueAbove[0].price)} của bạn duy nhất, đứng hạng {myUniqueAbove[0].uniqueRank} trong các giá duy nhất.
                </span>
              )}
            </div>
          ) : (
            <div className="flip-summary">
              <span className="small">
                {r.rolledOver.length ? 'Quà được dồn vào Hũ mật phiên sau.' : 'Quà không có người nhận và được trả về kho theo thể lệ.'}
              </span>
            </div>
          )}
          <div className="row" style={{ gap: 10, width: '100%' }}>
            {iWon && !replay ? (
              <>
                <button className="btn outline" style={{ flex: 1, background: 'transparent', color: 'var(--cream)', borderColor: 'rgba(255,246,224,0.4)' }} onClick={() => done.current('result')}>
                  Xem kết quả
                </button>
                <button className="btn big" style={{ flex: 1.4 }} onClick={() => done.current('win')}>
                  Nhận quà
                </button>
              </>
            ) : (
              <button className="btn big" style={{ flex: 1 }} onClick={() => done.current('result')}>
                {replay ? 'Đóng' : 'Xem kết quả chi tiết'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const colors = ['#F5B301', '#FFF6E0', '#17754A', '#E0452B', '#7CC3F0'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.12}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}
    </div>
  );
}

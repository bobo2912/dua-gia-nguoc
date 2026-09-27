import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import type { EarnActionId } from './config';
import { store } from './engine/game';
import type { GameEvent } from './engine/types';
import { NavCtx, type Nav, type Screen } from './nav';
import { Lobby } from './screens/Lobby';
import { Room } from './screens/Room';
import { Result } from './screens/Result';
import { Win } from './screens/Win';
import { Wallet } from './screens/Wallet';
import { Rank } from './screens/Rank';
import { History } from './screens/History';
import { OutbidSheet, type OutbidData } from './components/OutbidSheet';
import { BankSheet } from './components/BankSheet';
import { DemoPanel } from './components/DemoPanel';
import { ToolSheet } from './components/ToolSheet';
import { GavelOverlay } from './components/GavelOverlay';
import { BreakModal } from './components/BreakModal';
import { Toasts, type ToastItem } from './components/Toasts';
import { applyUpdate, checkForUpdate, type UpdateInfo } from './version';

export default function App() {
  // Ngăn xếp màn hình: mỗi mục có id riêng để React giữ nguyên màn khi lướt quay lại
  type Entry = { id: number; s: Screen };
  const nextId = useRef(1);
  const [stack, setStack] = useState<Entry[]>([{ id: 0, s: { name: 'lobby' } }]);
  const screen = stack[stack.length - 1].s;
  const [enterId, setEnterId] = useState<number | null>(null);
  const [showUnder, setShowUnder] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [outbid, setOutbid] = useState<OutbidData | null>(null);
  const [bank, setBank] = useState<EarnActionId | null>(null);
  const [demo, setDemo] = useState(false);
  const [tool, setTool] = useState<{ kind: 'scan' | 'thermo'; roomId: string; center: number } | null>(null);
  const [gavel, setGavel] = useState<{ sessionId: string; won: boolean } | null>(null);
  const [brk, setBrk] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const animating = useRef(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  const underRef = useRef<HTMLDivElement | null>(null);

  const TABS = ['lobby', 'wallet', 'rank', 'history'];
  /** Đi tới màn mới (lướt vào từ bên phải). Các tab ở menu dưới không chồng lên nhau. */
  const go = useCallback((s: Screen) => {
    const st = stackRef.current;
    if (s.name === 'lobby') {
      setStack([{ id: 0, s }]);
      return;
    }
    if (TABS.includes(s.name)) {
      setStack([{ id: 0, s: { name: 'lobby' } }, { id: nextId.current++, s }]);
      return;
    }
    if (JSON.stringify(st[st.length - 1].s) === JSON.stringify(s)) return;
    const id = nextId.current++;
    setStack([...st, { id, s }].slice(-20));
    setEnterId(id);
    window.setTimeout(() => setEnterId((x) => (x === id ? null : x)), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Dịch màn trên cùng sang phải x px; màn bên dưới trượt theo kiểu thị sai */
  const setX = (x: number, anim: boolean) => {
    const t = topRef.current;
    const u = underRef.current;
    const w = t?.offsetWidth ?? 390;
    const tr = anim ? 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    if (t) {
      t.style.transition = tr;
      t.style.transform = x > 0 ? `translateX(${x}px)` : '';
    }
    if (u) {
      u.style.transition = tr;
      u.style.transform = `translateX(${-0.3 * (w - x)}px)`;
    }
  };
  const finishBack = () => {
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    setShowUnder(false);
    requestAnimationFrame(() => {
      if (topRef.current) {
        topRef.current.style.transition = 'none';
        topRef.current.style.transform = '';
      }
      animating.current = false;
    });
  };

  /** Quay lại: màn hiện tại lướt sang phải, màn trước hiện ra */
  const back = useCallback(() => {
    if (animating.current || stackRef.current.length <= 1) return;
    animating.current = true;
    setShowUnder(true);
    requestAnimationFrame(() => {
      setX(0, false);
      requestAnimationFrame(() => {
        setX(topRef.current?.offsetWidth ?? 390, true);
        window.setTimeout(finishBack, 250);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vuốt từ trái sang phải để quay lại: màn hình chạy theo ngón tay
  const touch = useRef<{ x: number; y: number; t: number; ok: boolean; drag: boolean; dx: number } | null>(null);
  const overlayOpen = !!(outbid || bank || demo || tool || gavel || brk);
  const onTouchStart = (e: TouchEvent) => {
    const p = e.touches[0];
    const target = e.target as HTMLElement;
    const ok = !overlayOpen && !animating.current && stackRef.current.length > 1 && !target.closest('input, textarea, select, .no-swipe');
    touch.current = { x: p.clientX, y: p.clientY, t: Date.now(), ok, drag: false, dx: 0 };
  };
  const onTouchMove = (e: TouchEvent) => {
    const st = touch.current;
    if (!st || !st.ok) return;
    const p = e.touches[0];
    const dx = p.clientX - st.x;
    const dy = Math.abs(p.clientY - st.y);
    if (!st.drag) {
      if (dy > 12 && dy > Math.abs(dx)) {
        st.ok = false; // đang cuộn dọc
        return;
      }
      if (dx > 12 && dx > dy * 1.2) {
        st.drag = true;
        animating.current = true;
        setShowUnder(true);
      } else return;
    }
    st.dx = Math.max(0, dx);
    setX(st.dx, false);
  };
  const onTouchEnd = () => {
    const st = touch.current;
    touch.current = null;
    if (!st || !st.drag) return;
    const w = topRef.current?.offsetWidth ?? 390;
    const v = st.dx / Math.max(1, Date.now() - st.t);
    if (st.dx > w * 0.3 || v > 0.6) {
      setX(w, true);
      window.setTimeout(finishBack, 250);
    } else {
      setX(0, true);
      window.setTimeout(() => {
        setShowUnder(false);
        animating.current = false;
      }, 250);
    }
  };

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((xs) => [{ ...t, id }, ...xs].slice(0, 3));
    window.setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 5500);
  }, []);

  useEffect(() => {
    const off = store.onEvent((e: GameEvent) => {
      const cur = screenRef.current;
      const inRoom = (roomId: string) => cur.name === 'room' && cur.roomId === roomId;
      switch (e.type) {
        case 'outbid':
          if (inRoom(e.roomId)) setOutbid({ roomId: e.roomId, priceVnd: e.priceVnd, rivalTimes: e.rivalTimes, bestLeftVnd: e.bestLeftVnd });
          else
            pushToast({
              tone: 'warn',
              title: 'Ngôi đầu bị cướp!',
              text: `Giá ${e.priceVnd.toLocaleString('vi-VN').replace(/,/g, '.')}đ của bạn vừa bị trùng.`,
              action: { label: 'Phản công', run: () => go({ name: 'room', roomId: e.roomId }) },
            });
          break;
        case 'result':
          if (inRoom(e.roomId)) {
            setOutbid(null);
            setTool(null);
            setGavel({ sessionId: e.sessionId, won: e.won });
          } else
            pushToast({
              tone: e.won ? 'good' : 'info',
              title: e.won ? 'Bạn đã săn được quà!' : `Tổ ${e.roomName} đã gõ búa`,
              text: e.won ? 'Xác nhận nhận quà trong 7 ngày.' : 'Xem kết quả và giá chốt của phiên.',
              action: { label: 'Xem', run: () => go(e.won ? { name: 'win', sessionId: e.sessionId } : { name: 'result', sessionId: e.sessionId }) },
            });
          break;
        case 'toast':
          pushToast({
            tone: e.tone ?? 'info',
            text: e.text,
            action: e.roomId ? { label: 'Vào tổ', run: () => go({ name: 'room', roomId: e.roomId! }) } : undefined,
          });
          break;
        case 'break':
          setBrk(true);
          break;
      }
    });
    store.start();
    const onVis = () => {
      if (document.visibilityState === 'visible') store.tick();
      else store.save();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', () => store.save());
    return () => {
      off();
      store.stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [go, pushToast]);

  const checkUpdate = useCallback(
    async (manual = false) => {
      const r = await checkForUpdate();
      if (r && r !== 'unavailable') {
        setUpdate(r);
        if (manual) pushToast({ tone: 'good', text: `Đã có bản mới v${r.version} · ${r.build}` });
      } else if (manual) {
        pushToast({ tone: 'info', text: r === 'unavailable' ? 'Không kiểm tra được bản mới ở chế độ này (chỉ có khi mở từ GitHub Pages).' : 'Bạn đang dùng bản mới nhất.' });
      }
    },
    [pushToast],
  );

  // Tự kiểm tra bản mới khi mở app, mỗi 2 phút và mỗi khi quay lại app
  useEffect(() => {
    checkUpdate();
    const t = window.setInterval(() => checkUpdate(), 120000);
    const onVis = () => document.visibilityState === 'visible' && checkUpdate();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [checkUpdate]);

  const nav: Nav = {
    checkUpdate,
    screen,
    go,
    back,
    openBank: setBank,
    openDemo: () => setDemo(true),
    openTool: (kind, roomId, center) => setTool({ kind, roomId, center }),
    toast: (text, tone = 'info') => pushToast({ text, tone }),
  };

  const renderScreen = (sc: Screen) => {
    switch (sc.name) {
      case 'lobby':
        return <Lobby />;
      case 'room':
        return <Room key={sc.roomId} roomId={sc.roomId} />;
      case 'result':
        return <Result sessionId={sc.sessionId} />;
      case 'win':
        return <Win sessionId={sc.sessionId} />;
      case 'wallet':
        return <Wallet />;
      case 'rank':
        return <Rank />;
      case 'history':
        return <History />;
    }
  };
  const visible = stack.filter((_, i) => i === stack.length - 1 || (showUnder && i === stack.length - 2));

  return (
    <NavCtx.Provider value={nav}>
      <div className="app">
        <div className="stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
          {visible.map((en) => {
            const isTop = en.id === stack[stack.length - 1].id;
            return (
              <div
                key={en.id}
                ref={isTop ? topRef : underRef}
                className={`layer ${isTop ? 'top' : 'under'} ${isTop && en.id === enterId ? 'slide-in' : ''}`}
                aria-hidden={!isTop}
              >
                {renderScreen(en.s)}
              </div>
            );
          })}
        </div>
        <Toasts items={toasts} onClose={(id) => setToasts((xs) => xs.filter((x) => x.id !== id))} />
        {outbid && (
          <OutbidSheet
            data={outbid}
            onCounter={() => {
              setOutbid(null);
              window.setTimeout(() => document.getElementById('bid-input')?.focus(), 50);
            }}
            onLater={() => setOutbid(null)}
          />
        )}
        {bank && <BankSheet actionId={bank} onClose={() => setBank(null)} />}
        {demo && <DemoPanel onClose={() => setDemo(false)} />}
        {tool && <ToolSheet kind={tool.kind} roomId={tool.roomId} center={tool.center} onClose={() => setTool(null)} />}
        {gavel && (
          <GavelOverlay
            won={gavel.won}
            onDone={() => {
              const g = gavel;
              setGavel(null);
              go(g.won ? { name: 'win', sessionId: g.sessionId } : { name: 'result', sessionId: g.sessionId });
            }}
          />
        )}
        {brk && <BreakModal onClose={() => setBrk(false)} />}
        {update && !overlayOpen && (
          <div className="update-bar" role="status">
            <div className="col grow" style={{ gap: 1 }}>
              <b style={{ fontSize: 14 }}>Đã có bản mới</b>
              <span className="xs" style={{ opacity: 0.85 }}>
                v{update.version} · {update.build}
              </span>
            </div>
            <button className="btn sm" style={{ height: 40, border: 'none' }} onClick={() => applyUpdate(update)}>
              Cập nhật
            </button>
            <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Để sau" onClick={() => setUpdate(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </NavCtx.Provider>
  );
}

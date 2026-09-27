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

export default function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'lobby' }]);
  const screen = stack[stack.length - 1];
  const [fade, setFade] = useState<'' | 'fade-out' | 'fade-in'>('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [outbid, setOutbid] = useState<OutbidData | null>(null);
  const [bank, setBank] = useState<EarnActionId | null>(null);
  const [demo, setDemo] = useState(false);
  const [tool, setTool] = useState<{ kind: 'scan' | 'thermo'; roomId: string; center: number } | null>(null);
  const [gavel, setGavel] = useState<{ sessionId: string; won: boolean } | null>(null);
  const [brk, setBrk] = useState(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const backing = useRef(false);

  const TABS = ['lobby', 'wallet', 'rank', 'history'];
  /** Đi tới màn mới. Các tab ở menu dưới không chồng lên nhau. */
  const go = useCallback((s: Screen) => {
    setStack((st) => {
      if (s.name === 'lobby') return [{ name: 'lobby' }];
      if (TABS.includes(s.name)) return [{ name: 'lobby' }, s];
      const top = st[st.length - 1];
      if (JSON.stringify(top) === JSON.stringify(s)) return st;
      return [...st, s].slice(-20);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Quay lại: mờ dần màn hiện tại rồi hiện dần màn trước */
  const back = useCallback(() => {
    if (backing.current) return;
    if (stackRef.current.length <= 1) return;
    backing.current = true;
    setFade('fade-out');
    window.setTimeout(() => {
      setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
      setFade('fade-in');
      window.setTimeout(() => {
        setFade('');
        backing.current = false;
      }, 200);
    }, 150);
  }, []);

  // Vuốt từ trái sang phải để quay lại
  const touch = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);
  const overlayOpen = !!(outbid || bank || demo || tool || gavel || brk);
  const onTouchStart = (e: TouchEvent) => {
    const p = e.touches[0];
    const target = e.target as HTMLElement;
    const ok = !overlayOpen && !target.closest('input, textarea, select, .no-swipe');
    touch.current = { x: p.clientX, y: p.clientY, t: Date.now(), ok };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const st = touch.current;
    touch.current = null;
    if (!st || !st.ok) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - st.x;
    const dy = Math.abs(p.clientY - st.y);
    if (dx > 70 && dy < dx * 0.6 && Date.now() - st.t < 700) back();
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

  const nav: Nav = {
    screen,
    go,
    back,
    openBank: setBank,
    openDemo: () => setDemo(true),
    openTool: (kind, roomId, center) => setTool({ kind, roomId, center }),
    toast: (text, tone = 'info') => pushToast({ text, tone }),
  };

  let body;
  switch (screen.name) {
    case 'lobby':
      body = <Lobby />;
      break;
    case 'room':
      body = <Room key={screen.roomId} roomId={screen.roomId} />;
      break;
    case 'result':
      body = <Result sessionId={screen.sessionId} />;
      break;
    case 'win':
      body = <Win sessionId={screen.sessionId} />;
      break;
    case 'wallet':
      body = <Wallet />;
      break;
    case 'rank':
      body = <Rank />;
      break;
    case 'history':
      body = <History />;
      break;
  }

  return (
    <NavCtx.Provider value={nav}>
      <div className="app" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`screen ${fade}`}>{body}</div>
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
      </div>
    </NavCtx.Provider>
  );
}

import { createContext, useContext, useSyncExternalStore } from 'react';
import type { EarnActionId } from './config';
import { store } from './engine/game';

export type Screen =
  | { name: 'lobby' }
  | { name: 'room'; roomId: string }
  | { name: 'result'; sessionId: string }
  | { name: 'win'; sessionId: string }
  | { name: 'wallet' }
  | { name: 'rank' }
  | { name: 'history' };

export interface Nav {
  screen: Screen;
  go: (s: Screen) => void;
  /** Quay lại màn trước (có hiệu ứng mờ) */
  back: () => void;
  openBank: (id: EarnActionId) => void;
  openDemo: () => void;
  /** Mở hướng dẫn luật chơi */
  openGuide: () => void;
  openTool: (kind: 'scan' | 'thermo', roomId: string, center: number) => void;
  toast: (text: string, tone?: 'good' | 'warn' | 'info') => void;
  /** Xem lại màn lật bài của một phiên đã gõ búa */
  openReveal: (sessionId: string) => void;
  /** Kiểm tra bản mới trên máy chủ; hiện nút cập nhật nếu có */
  checkUpdate: (manual?: boolean) => Promise<void>;
}

export const NavCtx = createContext<Nav>(null as unknown as Nav);
export const useNav = () => useContext(NavCtx);

/** Đăng ký nhận cập nhật từ engine (0,5 giây/lần) */
export function useGame() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}

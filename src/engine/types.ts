import type { Prize, RankId, SurpriseKind } from '../config';

/** Trạng thái một mức giá của người chơi */
export type BidStatus = 'leading' | 'unique' | 'dup' | 'pending' | 'hidden';

export const ME = 'me';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Bid {
  id: string;
  owner: string; // 'me' hoặc id thợ săn ảo
  price: number; // tính theo số bước giá (1 = 1 × stepVnd)
  at: number;
}

export interface Bot {
  id: string;
  name: string;
  rank: RankId;
}

export interface FeedItem {
  id: string;
  at: number;
  text: string;
  tone: 'lead' | 'dup' | 'info' | 'me' | 'freeze' | 'event' | 'throne';
}

/** Sự kiện bất ngờ trong phiên */
export interface SurpriseEvent {
  id: string;
  kind: SurpriseKind;
  at: number;
  until: number;
  started: boolean;
  ended?: boolean;
  /** Hé lộ: vùng giá được công bố (đồng) và các mức đang bị trùng lúc công bố */
  reveal?: { from: number; to: number; step: number; dupPrices: number[]; dupBids: number };
  /** Mưa điểm: điểm săn bạn nhận được trong lúc mưa */
  rainPoints?: number;
}

/** Một lượt giữ ngai (ngôi đầu) */
export interface Reign {
  owner: string;
  name: string;
  since: number;
}

export interface ThroneRecord {
  name: string;
  ms: number;
  me: boolean;
  at: number;
}

export interface Winner {
  owner: string;
  name: string;
  price: number;
  prize: Prize;
}

export interface MyFinalBid {
  price: number;
  status: 'win' | 'unique' | 'dup';
  uniqueRank?: number;
}

export interface SessionResult {
  winners: Winner[];
  rolledOver: Prize[];
  voided: Prize[];
  /** [giá, số lượt] tăng dần theo giá */
  counts: [number, number][];
  totalBids: number;
  participants: number;
  hash: string;
  csv: string;
  my: MyFinalBid[];
  nearMiss?: { myPrice: number; diff: number };
  /** Kết quả có sự can thiệp của công cụ demo */
  demoBoost?: boolean;
  pointsEarned: number;
  /** Ngai vàng trong phiên */
  throne?: { myTotalMs: number; myBestMs: number; record: ThroneRecord | null; newRecord: boolean };
}

export interface Session {
  id: string;
  roomId: string;
  no: number;
  startAt: number;
  endAt: number;
  prizes: Prize[];
  jackpot: Prize[];
  rolloverCount: number;
  bids: Bid[];
  bots: Bot[];
  botJoins: { botId: string; at: number }[];
  joinIdx: number;
  joinedBots: string[];
  schedule: { owner: string; at: number }[];
  schedIdx: number;
  frozenSnap: Record<string, BidStatus> | null;
  lastLeaderOwner: string | null;
  myLeadBidId: string | null;
  leadSince: number | null;
  leadAwarded: number;
  rivalCounts: Record<string, number>;
  lastRival: string | null;
  feed: FeedItem[];
  dupWindow: { start: number; count: number };
  toolsUsed: { scan: number; thermo: number };
  myJoined: boolean;
  pointsEarned: number;
  openedNotified: boolean;
  announced: boolean;
  /** Sự kiện bất ngờ đã lên lịch */
  events: SurpriseEvent[];
  /** Ai đang ngồi ngai (ngôi đầu) và từ lúc nào */
  reign: Reign | null;
  /** Số mốc Ngai vàng đã thưởng trong lượt giữ ngai hiện tại của bạn */
  reignAwarded: number;
  myThroneMs: number;
  myBestReignMs: number;
  /** Đã phá kỷ lục tổ trong phiên này */
  brokeRecord: boolean;
}

export interface RoomRuntime {
  roomId: string;
  session: Session | null;
  seq: number;
  pendingJackpot: Prize[];
  pendingRollovers: number;
  nextSecretAt?: number;
  lastResult?: { sessionId: string; no: number; endAt: number; result: SessionResult };
  /** Kỷ lục giữ ngai lâu nhất của tổ */
  throneRecord?: ThroneRecord | null;
}

export type DropSource = 'giao dịch' | 'loyalty' | 'thưởng';

export interface DropEntry {
  id: string;
  amount: number;
  remaining: number;
  source: DropSource;
  label: string;
  at: number;
  expiresAt: number;
}

export interface LedgerItem {
  id: string;
  at: number;
  text: string;
  delta: number;
}

export interface WonPrize {
  id: string;
  sessionId: string;
  roomName: string;
  prize: Prize;
  priceVnd: number;
  at: number;
  deadline: number;
  status: 'pending' | 'claimed';
  method?: string;
}

export interface Profile {
  name: string;
  loyaltyPoints: number;
  huntPoints: number;
  season: string;
  drops: DropEntry[];
  ledger: LedgerItem[];
  counters: { day: string; login: number; transfer: number; qr: number; bill: number; loyaltyDrops: number; earned: number };
  monthCounters: { month: string; savings: number; invite: number };
  playedDays: string[];
  prizes: WonPrize[];
  reminders: string[];
  secretAlert: boolean;
  demoGolden: boolean;
  /** Công cụ demo: độ khó thợ săn ảo */
  demoDifficulty?: Difficulty;
  /** Công cụ demo: xác suất được hỗ trợ thắng khi gõ búa (0–1) */
  demoWinChance?: number;
  activeSince: number;
  breakShown: boolean;
}

export interface HistoryItem {
  sessionId: string;
  roomId: string;
  roomName: string;
  no: number;
  endAt: number;
  stepVnd: number;
  prizes: Prize[];
  result: SessionResult;
}

export interface HallItem {
  id: string;
  at: number;
  name: string;
  prize: string;
  priceVnd: number;
  me: boolean;
}

export interface GameState {
  v: number;
  rooms: Record<string, RoomRuntime>;
  profile: Profile;
  history: HistoryItem[];
  hall: HallItem[];
}

export type GameEvent =
  | { type: 'outbid'; roomId: string; priceVnd: number; rivalTimes: number; bestLeftVnd: number | null }
  | { type: 'result'; roomId: string; sessionId: string; won: boolean; roomName: string }
  | { type: 'toast'; text: string; roomId?: string; tone?: 'good' | 'warn' | 'info' }
  | { type: 'break' }
  | { type: 'surprise'; roomId: string; roomName: string; kind: SurpriseKind; text: string }
  | { type: 'throne'; roomId: string; text: string };

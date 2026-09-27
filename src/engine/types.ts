import type { Prize, RankId } from '../config';

/** Trạng thái một mức giá của người chơi */
export type BidStatus = 'leading' | 'unique' | 'dup' | 'pending';

export const ME = 'me';

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
  tone: 'lead' | 'dup' | 'info' | 'me' | 'freeze';
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
  pointsEarned: number;
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
}

export interface RoomRuntime {
  roomId: string;
  session: Session | null;
  seq: number;
  pendingJackpot: Prize[];
  pendingRollovers: number;
  nextSecretAt?: number;
  lastResult?: { sessionId: string; no: number; endAt: number; result: SessionResult };
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
  | { type: 'break' };

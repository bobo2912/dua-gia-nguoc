// =====================================================================
// ENGINE: vỏ đấu giá ngược, lõi "dự đoán số nhỏ nhất duy nhất".
// Bản demo chạy toàn bộ ở trình duyệt, các thợ săn khác là thợ săn ảo.
// Trong sản phẩm thật, phần này nằm ở SERVER (nguồn sự thật duy nhất).
// =====================================================================
import {
  CLAIM_DAYS,
  DEMO_SEED,
  DROPS,
  EARN_RULES,
  HUNT_POINTS,
  LOYALTY,
  RANKS,
  ROOMS,
  SAFETY,
  STREAK,
  TRANSFER_MIN_VND,
  type EarnActionId,
  type Prize,
  type RankDef,
  type RoomConfig,
  priceRule,
  SCAN_HALF,
  SURPRISE,
  THERMO_SPLIT,
  THRONE,
  type SurpriseKind,
} from '../config';
import {
  addDays,
  dayKey,
  endOfDay,
  endOfWeek,
  fmtSec,
  fmtVnd,
  inWindow,
  maskedName,
  monthKey,
  pick,
  rand,
  randInt,
  sha256,
  uid,
} from './util';
import {
  ME,
  type Bid,
  type BidStatus,
  type Difficulty,
  type Bot,
  type DropEntry,
  type DropSource,
  type GameEvent,
  type GameState,
  type HistoryItem,
  type RoomRuntime,
  type Session,
  type SessionResult,
  type SurpriseEvent,
  type ThroneRecord,
} from './types';

const STORAGE_KEY = 'mua-do-luxury-v1';
const STATE_VERSION = 4;

export const roomCfg = (id: string): RoomConfig => ROOMS.find((r) => r.id === id)!;

// ------------------------- Hạng -------------------------
export function rankOf(points: number): RankDef {
  let r = RANKS[0];
  for (const k of RANKS) if (points >= k.minPoints) r = k;
  return r;
}
export const rankIndex = (id: string) => RANKS.findIndex((r) => r.id === id);
export function nextRank(points: number): RankDef | null {
  const i = rankIndex(rankOf(points).id);
  return RANKS[i + 1] ?? null;
}

// ------------------------- Phân bố giá của thợ săn ảo -------------------------
// Người chơi thật có xu hướng chọn số nhỏ và số "đẹp", nên vùng giá thấp rất dễ bị trùng.
const ROUND_NUMBERS = [1, 2, 5, 9, 10, 11, 12, 15, 20, 21, 22, 25, 29, 30, 33, 39, 49, 50, 55, 66, 68, 69, 77, 79, 86, 88, 89, 99, 100, 101, 111, 123, 150, 168, 188, 199, 200, 222, 234, 250, 299, 333, 345, 368, 388, 399, 456, 500, 555, 666, 668, 686, 777, 789, 868, 888, 899, 999, 1000, 1234];
/** Thợ săn ảo chọn một mức giá (trả về đồng, luôn là bội số của bước giá) */
function samplePrice(cfg: RoomConfig): number {
  const { typicalSteps, roundPref } = cfg.bots;
  const rule = priceRule(cfg);
  let k: number;
  const xs = ROUND_NUMBERS.filter((x) => x <= Math.max(typicalSteps * 8, 20) && x <= rule.levels);
  if (Math.random() < roundPref && xs.length) k = pick(xs);
  else k = 1 + Math.floor(-Math.log(1 - Math.random()) * typicalSteps);
  return Math.max(1, Math.min(rule.levels, k)) * rule.step;
}

// ------------------------- Phân tích trạng thái -------------------------
export function countPrices(bids: Bid[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const b of bids) m.set(b.price, (m.get(b.price) ?? 0) + 1);
  return m;
}
export function lowestUnique(counts: Map<number, number>): number | null {
  let best: number | null = null;
  for (const [p, c] of counts) if (c === 1 && (best === null || p < best)) best = p;
  return best;
}
export function liveStatus(bid: Bid, counts: Map<number, number>, lu: number | null): BidStatus {
  const c = counts.get(bid.price) ?? 0;
  if (c > 1) return 'dup';
  return bid.price === lu ? 'leading' : 'unique';
}
export const isFrozen = (s: Session, now: number) => now >= s.endAt - roomCfg(s.roomId).freezeSec * 1000 && now < s.endAt;
export const isRunning = (s: Session, now: number) => now >= s.startAt && now < s.endAt;
export const participantsOf = (s: Session) => s.joinedBots.length + (s.myJoined ? 1 : 0);
export const myBids = (s: Session) => s.bids.filter((b) => b.owner === ME);

// ------------------------- Sự kiện bất ngờ -------------------------
/** Sự kiện đang diễn ra (theo thời gian), null nếu không có */
export function activeEvent(s: Session, now: number): SurpriseEvent | null {
  for (const e of s.events ?? []) {
    if (now >= e.at && now < e.until && (e.kind !== 'reveal' || e.reveal)) return e;
  }
  return null;
}
/** Sự kiện kế tiếp chưa diễn ra (để đếm ngược), null nếu không còn */
export function nextEvent(s: Session, now: number): SurpriseEvent | null {
  let best: SurpriseEvent | null = null;
  for (const e of s.events ?? []) if (!e.started && e.at > now && (!best || e.at < best.at)) best = e;
  return best;
}
const eventOn = (s: Session, now: number, kind: SurpriseKind) => (s.events ?? []).some((e) => e.kind === kind && now >= e.at && now < e.until);
export const isNight = (s: Session, now: number) => eventOn(s, now, 'night');
export const isRain = (s: Session, now: number) => eventOn(s, now, 'rain');

/**
 * Lên lịch sự kiện bất ngờ cho một phiên: nối tiếp nhau đến hết phiên, không giới hạn số lần.
 * Loại sự kiện ngẫu nhiên (không lặp lại liền nhau), khoảng nghỉ ngẫu nhiên, luôn xong trước giai đoạn đóng băng.
 */
function planEvents(cfg: RoomConfig, startAt: number, endAt: number): SurpriseEvent[] {
  if (!SURPRISE.enabled || cfg.surprises === false) return [];
  const all: SurpriseKind[] = ['night', 'reveal', 'rain'];
  const dur = (k: SurpriseKind) => SURPRISE[k].durationSec * 1000;
  const [gMin, gMax] = SURPRISE.gapSec;
  const to = endAt - (cfg.freezeSec + SURPRISE.endBeforeFreezeSec) * 1000;
  let t = startAt + cfg.durationSec * 1000 * SURPRISE.notBeforeRatio + rand(0, gMin) * 1000;
  let prev: SurpriseKind | null = null;
  const out: SurpriseEvent[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const fit = all.filter((k) => k !== prev && t + dur(k) <= to);
    if (!fit.length) break;
    const kind = pick(fit);
    out.push({ id: uid('ev'), kind, at: t, until: t + dur(kind), started: false });
    prev = kind;
    t += dur(kind) + rand(gMin, gMax) * 1000;
  }
  return out;
}

/** Mưa điểm: thợ săn ảo tranh thủ ra giá dồn dập hơn */
function addRainBids(s: Session, e: SurpriseEvent) {
  const extra = Math.round(s.bots.length * 0.35);
  const joinAt = new Map(s.botJoins.map((j) => [j.botId, j.at]));
  const eligible = s.bots.filter((b) => (joinAt.get(b.id) ?? Infinity) < e.until - 2000);
  for (let i = 0; i < extra && eligible.length; i++) {
    const b = pick(eligible);
    s.schedule.push({ owner: b.id, at: Math.max(joinAt.get(b.id)!, rand(e.at, e.until)) });
  }
  // giữ lịch theo thứ tự thời gian cho phần chưa chạy
  const done = s.schedule.slice(0, s.schedIdx);
  const rest = s.schedule.slice(s.schedIdx).sort((a, b) => a.at - b.at);
  s.schedule = [...done, ...rest];
}

/** Kỷ lục giữ ngai khởi tạo cho bản demo */
function seedThroneRecord(cfg: RoomConfig, now: number): ThroneRecord {
  const playable = (cfg.durationSec - cfg.freezeSec) * 1000;
  return { name: maskedName(), ms: Math.round((playable * rand(0.22, 0.42)) / 1000) * 1000, me: false, at: now - randInt(1, 6) * 86400000 };
}

/** Bổ sung trường mới cho phiên lưu từ bản cũ */
function upgradeSession(s: Session) {
  s.events ??= [];
  s.reign ??= null;
  s.reignAwarded ??= 0;
  s.myThroneMs ??= 0;
  s.myBestReignMs ??= 0;
  s.brokeRecord ??= false;
}

/** Trạng thái người chơi được phép thấy (tôn trọng đóng băng) */
export function visibleStatuses(s: Session, now: number): { bid: Bid; status: BidStatus; frozen: boolean }[] {
  const mine = myBids(s).sort((a, b) => b.at - a.at);
  if (s.frozenSnap && now < s.endAt) {
    return mine.map((b) => ({ bid: b, status: s.frozenSnap![b.id] ?? 'pending', frozen: true }));
  }
  if (isNight(s, now)) return mine.map((b) => ({ bid: b, status: 'hidden' as const, frozen: false }));
  const counts = countPrices(s.bids);
  const lu = lowestUnique(counts);
  return mine.map((b) => ({ bid: b, status: liveStatus(b, counts, lu), frozen: false }));
}

// ------------------------- Tạo phiên -------------------------
// ------------------------- Độ khó (công cụ demo) -------------------------
/** Hệ số theo độ khó: số giá thợ săn ảo ra, xác suất trùng giá dẫn đầu, tỉ lệ "bắn tỉa" giây cuối */
const DIFFICULTY: Record<Difficulty, { bids: number; rival: number; sniper: number; avoidMine: boolean }> = {
  easy: { bids: 0.45, rival: 0, sniper: 0, avoidMine: true },
  normal: { bids: 1, rival: 1, sniper: 0.12, avoidMine: false },
  hard: { bids: 1.4, rival: 2.2, sniper: 0.2, avoidMine: false },
};
let diffNow: Difficulty = 'normal';

function newSession(cfg: RoomConfig, no: number, startAt: number, jackpot: Prize[], rolloverCount: number): Session {
  const D = DIFFICULTY[diffNow];
  const nBots = Math.min(randInt(cfg.bots.participants[0], cfg.bots.participants[1]), cfg.maxParticipants - 1);
  const endAt = startAt + cfg.durationSec * 1000;
  const bots: Bot[] = [];
  const botJoins: { botId: string; at: number }[] = [];
  const schedule: { owner: string; at: number }[] = [];
  const dur = cfg.durationSec * 1000;
  for (let i = 0; i < nBots; i++) {
    const r = Math.random();
    const rank = r < 0.08 ? 'kimcuong' : r < 0.25 ? 'vang' : r < 0.6 ? 'bac' : 'dong';
    const bot: Bot = { id: `b${i}`, name: maskedName(), rank };
    bots.push(bot);
    const joinAt = startAt + Math.pow(Math.random(), 1.4) * dur * 0.8;
    botJoins.push({ botId: bot.id, at: joinAt });
    const k = Math.max(1, Math.round(randInt(cfg.bots.bidsPerBot[0], cfg.bots.bidsPerBot[1]) * D.bids));
    for (let j = 0; j < k; j++) {
      const sniper = Math.random() < D.sniper;
      const from = sniper ? endAt - cfg.freezeSec * 1000 : joinAt;
      const at = Math.max(joinAt, rand(from, endAt - 800));
      schedule.push({ owner: bot.id, at });
    }
  }
  botJoins.sort((a, b) => a.at - b.at);
  schedule.sort((a, b) => a.at - b.at);
  const events = planEvents(cfg, startAt, endAt);
  const session: Session = {
    id: uid('s'),
    roomId: cfg.id,
    no,
    startAt,
    endAt,
    prizes: cfg.prizes.map((p) => ({ ...p })),
    jackpot,
    rolloverCount,
    bids: [],
    bots,
    botJoins,
    joinIdx: 0,
    joinedBots: [],
    schedule,
    schedIdx: 0,
    frozenSnap: null,
    lastLeaderOwner: null,
    myLeadBidId: null,
    leadSince: null,
    leadAwarded: 0,
    rivalCounts: {},
    lastRival: null,
    feed: [],
    dupWindow: { start: startAt, count: 0 },
    toolsUsed: { scan: 0, thermo: 0 },
    myJoined: false,
    pointsEarned: 0,
    openedNotified: false,
    announced: false,
    events,
    reign: null,
    reignAwarded: 0,
    myThroneMs: 0,
    myBestReignMs: 0,
    brokeRecord: false,
  };
  for (const e of events) if (e.kind === 'rain') addRainBids(session, e);
  return session;
}

// ------------------------- Trạng thái ban đầu -------------------------
function seedState(now: number): GameState {
  const rooms: Record<string, RoomRuntime> = {};
  const offsets: Record<string, number> = { flash: -40, golden: 25, special: -150, vip: -30, partner: -60 };
  for (const cfg of ROOMS) {
    const rt: RoomRuntime = { roomId: cfg.id, session: null, seq: 100 + randInt(1, 60), pendingJackpot: [], pendingRollovers: 0, throneRecord: seedThroneRecord(cfg, now) };
    if (cfg.secret) {
      rt.nextSecretAt = now + 150 * 1000;
    } else {
      rt.session = newSession(cfg, rt.seq, now + (offsets[cfg.id] ?? 0) * 1000, [], 0);
    }
    rooms[cfg.id] = rt;
  }
  // Tổ Chớp Nhoáng đang có sẵn jackpot dồn để minh họa Hũ mật
  const flash = rooms.flash.session!;
  flash.jackpot = [{ name: 'Voucher nhà hàng 200.000đ (dồn)', valueVnd: 200000 }];
  flash.rolloverCount = 1;

  const drops: DropEntry[] = [
    { id: uid('d'), amount: 5, remaining: 5, source: 'giao dịch', label: 'Giọt mật tuần trước', at: now, expiresAt: endOfDay(now) },
    { id: uid('d'), amount: DEMO_SEED.drops - 5, remaining: DEMO_SEED.drops - 5, source: 'loyalty', label: 'Đổi điểm Loyalty', at: now, expiresAt: addDays(now, DROPS.loyaltyExpiryDays) },
  ];
  const playedDays: string[] = [];
  for (let i = DEMO_SEED.streakDaysBefore; i >= 1; i--) playedDays.push(dayKey(addDays(now, -i)));
  const hall = Array.from({ length: 5 }, (_, i) => ({
    id: uid('h'),
    at: now - (i + 1) * 7 * 60 * 1000,
    name: maskedName(),
    prize: pick(['Túi xách da cao cấp', 'Voucher du lịch 5.000.000đ', 'Tai nghe chống ồn cao cấp', 'Voucher nhà hàng 200.000đ']),
    priceVnd: randInt(2, 14) * 1000,
    me: false,
  }));
  return {
    v: STATE_VERSION,
    rooms,
    profile: {
      name: DEMO_SEED.name,
      loyaltyPoints: DEMO_SEED.loyaltyPoints,
      huntPoints: DEMO_SEED.huntPoints,
      season: monthKey(now),
      drops,
      ledger: [],
      counters: { day: dayKey(now), login: 0, transfer: 0, qr: 0, bill: 0, loyaltyDrops: 0, earned: 0 },
      monthCounters: { month: monthKey(now), savings: 0, invite: 0 },
      playedDays,
      prizes: [],
      reminders: [],
      secretAlert: false,
      demoGolden: false,
      activeSince: now,
      breakShown: false,
    },
    history: [],
    hall,
  };
}

// =====================================================================
// STORE
// =====================================================================
type Listener = () => void;
type EventListener = (e: GameEvent) => void;

export class GameStore {
  state: GameState;
  version = 0;
  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private lastTick = Date.now();
  private lastSave = 0;
  private timer: number | null = null;

  constructor() {
    this.state = this.load() ?? seedState(Date.now());
    this.state.profile.activeSince = Date.now();
    this.state.profile.breakShown = false;
  }

  // ---------- vòng đời ----------
  start() {
    if (this.timer !== null) return;
    this.dailyChecks(Date.now());
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 500);
  }
  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  onEvent(l: EventListener) {
    this.eventListeners.add(l);
    return () => this.eventListeners.delete(l);
  }
  getVersion = () => this.version;

  private emit(e: GameEvent) {
    this.eventListeners.forEach((l) => l(e));
  }
  private changed(save = false) {
    this.version++;
    this.listeners.forEach((l) => l());
    const now = Date.now();
    if (save || now - this.lastSave > 3000) this.save();
  }

  // ---------- lưu trữ ----------
  private load(): GameState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as GameState;
      if (s.v === 3) {
        // nâng cấp dữ liệu bản cũ: giữ nguyên ví, hạng, lịch sử
        for (const cfg of ROOMS) {
          const rt = s.rooms[cfg.id];
          if (!rt) continue;
          rt.throneRecord ??= seedThroneRecord(cfg, Date.now());
          if (rt.session) upgradeSession(rt.session);
        }
        s.v = STATE_VERSION;
      }
      if (s.v !== STATE_VERSION) return null;
      return s;
    } catch {
      return null;
    }
  }
  save() {
    this.lastSave = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* trình duyệt chặn lưu trữ: bỏ qua, game vẫn chạy */
    }
  }
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* bỏ qua */
    }
    this.state = seedState(Date.now());
    this.dailyChecks(Date.now());
    this.changed(true);
  }

  // =================================================================
  // TICK: chạy mỗi 0,5 giây
  // =================================================================
  tick() {
    const now = Date.now();
    const dt = Math.min(5, (now - this.lastTick) / 1000);
    this.lastTick = now;
    diffNow = this.state.profile.demoDifficulty ?? 'normal';
    for (const cfg of ROOMS) this.tickRoom(cfg, now, dt);
    this.expireCheck(now);
    const p = this.state.profile;
    if (!p.breakShown && now - p.activeSince > SAFETY.breakReminderMin * 60000) {
      p.breakShown = true;
      this.emit({ type: 'break' });
    }
    this.changed();
  }

  private tickRoom(cfg: RoomConfig, now: number, dt: number) {
    const rt = this.state.rooms[cfg.id];
    // Phòng Bí Mật: chỉ tạo phiên khi đến lịch ẩn
    if (cfg.secret && !rt.session) {
      // Vắng mặt lâu: lịch đã trôi qua thì dời sang lượt kế tiếp tính từ bây giờ, không "phát lại" các phiên cũ
      if (rt.nextSecretAt && now > rt.nextSecretAt + 1000) {
        rt.nextSecretAt = now + randInt(60, cfg.secret.everySec) * 1000;
        this.changed(true);
        return;
      }
      if (rt.nextSecretAt && now >= rt.nextSecretAt - cfg.secret.announceSec * 1000) {
        rt.seq++;
        rt.session = newSession(cfg, rt.seq, rt.nextSecretAt, rt.pendingJackpot, rt.pendingRollovers);
        rt.pendingJackpot = [];
      } else return;
    }
    let guard = 0;
    while (rt.session && guard++ < 5) {
      const s = rt.session;
      if (now < s.startAt) {
        if (cfg.secret && !s.announced) {
          s.announced = true;
          if (this.state.profile.secretAlert) {
            this.emit({ type: 'toast', tone: 'warn', roomId: cfg.id, text: `Tổ Bí Mật sắp mở! Quà: ${s.prizes[0].name}` });
          }
        }
        return;
      }
      if (!s.openedNotified) {
        s.openedNotified = true;
        // phiên đã kết thúc (do app đóng lâu) thì không báo "đã mở" nữa
        if (now < s.endAt) {
          const p = this.state.profile;
          if (p.reminders.includes(cfg.id)) {
            p.reminders = p.reminders.filter((x) => x !== cfg.id);
            this.emit({ type: 'toast', tone: 'info', roomId: cfg.id, text: `Tổ ${cfg.name} đã mở. Vào săn ngay!` });
          }
          if (cfg.secret && p.secretAlert) {
            this.emit({ type: 'toast', tone: 'warn', roomId: cfg.id, text: 'Tổ Bí Mật đã mở, chỉ trong ít phút!' });
          }
        }
      }
      this.runSession(cfg, s, Math.min(now, s.endAt - 1), dt);
      if (now >= s.endAt) {
        this.resolve(cfg, rt, s);
        if (cfg.secret) {
          rt.session = null;
          rt.nextSecretAt = Math.max(s.endAt, now) + cfg.secret.everySec * 1000;
          return;
        }
        rt.seq++;
        let startAt = s.endAt + cfg.breakSec * 1000;
        if (startAt + cfg.durationSec * 1000 < now) startAt = now; // vắng mặt lâu: bắt đầu phiên mới ngay
        rt.session = newSession(cfg, rt.seq, startAt, rt.pendingJackpot, rt.pendingRollovers);
        rt.pendingJackpot = [];
        continue;
      }
      return;
    }
  }

  private pushFeed(s: Session, text: string, tone: Session['feed'][number]['tone'], at: number) {
    s.feed.unshift({ id: uid('f'), at, text, tone });
    if (s.feed.length > 25) s.feed.length = 25;
  }

  private addBid(s: Session, owner: string, price: number, at: number) {
    s.bids.push({ id: uid('bid'), owner, price, at });
  }

  private runSession(cfg: RoomConfig, s: Session, now: number, dt: number) {
    const frozenNow = now >= s.endAt - cfg.freezeSec * 1000;
    // 1. thợ săn ảo vào phòng
    while (s.joinIdx < s.botJoins.length && s.botJoins[s.joinIdx].at <= now) {
      const j = s.botJoins[s.joinIdx++];
      if (participantsOf(s) >= cfg.maxParticipants) continue;
      s.joinedBots.push(j.botId);
      const bot = s.bots.find((b) => b.id === j.botId)!;
      if (bot.rank === 'kimcuong' && Math.random() < 0.5) this.pushFeed(s, 'Một ong chúa vừa vào tổ', 'info', j.at);
    }
    // 2. thợ săn ảo ra giá theo lịch
    const beforeCounts = countPrices(s.bids);
    let newDups = 0;
    while (s.schedIdx < s.schedule.length && s.schedule[s.schedIdx].at <= now) {
      const job = s.schedule[s.schedIdx++];
      if (!s.joinedBots.includes(job.owner)) continue;
      const own = new Set(s.bids.filter((b) => b.owner === job.owner).map((b) => b.price));
      let price = samplePrice(cfg);
      const avoid = DIFFICULTY[diffNow].avoidMine ? new Set(myBids(s).map((b) => b.price)) : null;
      for (let t = 0; t < 8 && (own.has(price) || avoid?.has(price)); t++) price = samplePrice(cfg);
      if (avoid?.has(price)) continue;
      if (own.has(price)) continue;
      if ((beforeCounts.get(price) ?? 0) === 1) newDups++;
      beforeCounts.set(price, (beforeCounts.get(price) ?? 0) + 1);
      this.addBid(s, job.owner, price, job.at);
    }
    // 3. "đối thủ" trùng đúng giá đang dẫn đầu của người chơi (chỉ khi chưa đóng băng)
    if (!frozenNow && s.myLeadBidId && s.joinedBots.length > 0 && Math.random() < cfg.bots.rivalPerSec * DIFFICULTY[diffNow].rival * dt) {
      const myLead = s.bids.find((b) => b.id === s.myLeadBidId);
      if (myLead) {
        const candidates = s.joinedBots.filter((id) => !s.bids.some((b) => b.owner === id && b.price === myLead.price));
        if (candidates.length) {
          const rival = s.lastRival && candidates.includes(s.lastRival) && Math.random() < 0.6 ? s.lastRival : pick(candidates);
          this.addBid(s, rival, myLead.price, now);
          newDups++;
        }
      }
    }
    // 3b. sự kiện bất ngờ: bắt đầu và kết thúc
    for (const e of s.events) {
      if (!e.started && now >= e.at) {
        e.started = true;
        if (now < e.until) this.startEvent(cfg, s, e, now);
        else e.ended = true;
      }
      if (e.started && !e.ended && now >= e.until) {
        e.ended = true;
        if (e.kind === 'night') this.pushFeed(s, 'Trời sáng! Trạng thái hiện trở lại', 'event', e.until);
        if (e.kind === 'rain') this.pushFeed(s, e.rainPoints ? `Mưa điểm đã tạnh · bạn hứng được +${e.rainPoints} điểm săn` : 'Mưa điểm đã tạnh', 'event', e.until);
      }
    }

    // 4. đóng băng: chụp trạng thái
    if (frozenNow && !s.frozenSnap) {
      const counts = countPrices(s.bids);
      const lu = lowestUnique(counts);
      s.frozenSnap = {};
      for (const b of myBids(s)) s.frozenSnap[b.id] = liveStatus(b, counts, lu);
      this.pushFeed(s, 'Búa sắp gõ! Trạng thái đã đóng băng', 'freeze', now);
      s.leadSince = null;
      if (s.reign) this.endReign(cfg, s, now);
    }
    if (frozenNow) return;

    // 5. phân tích trạng thái, phát hiện bị cướp ngôi
    const counts = countPrices(s.bids);
    const lu = lowestUnique(counts);
    const leaderBid = lu === null ? null : s.bids.find((b) => b.price === lu) ?? null;
    const leaderOwner = leaderBid?.owner ?? null;
    // Ngai vàng: máy chủ luôn theo dõi ai đang ngồi ngai, kể cả trong Màn đêm
    this.trackReign(cfg, s, leaderOwner, now);
    const night = isNight(s, now);

    if (night) {
      // Màn đêm: không báo bị cướp ngôi, không báo ai lên ngôi. Mọi thứ lộ ra khi trời sáng.
    } else if (s.myLeadBidId) {
      const prev = s.bids.find((b) => b.id === s.myLeadBidId);
      if (prev && (counts.get(prev.price) ?? 0) > 1) {
        const others = s.bids.filter((b) => b.price === prev.price && b.owner !== ME).sort((a, b) => b.at - a.at);
        const rival = others[0]?.owner;
        let times = 1;
        if (rival) {
          s.rivalCounts[rival] = (s.rivalCounts[rival] ?? 0) + 1;
          s.lastRival = rival;
          times = s.rivalCounts[rival];
        }
        const mineUnique = myBids(s).filter((b) => (counts.get(b.price) ?? 0) === 1).sort((a, b) => a.price - b.price);
        this.emit({
          type: 'outbid',
          roomId: cfg.id,
          priceVnd: prev.price,
          rivalTimes: times,
          bestLeftVnd: mineUnique.length ? mineUnique[0].price : null,
        });
      }
    }
    if (!night) {
      const myLeadNow = leaderBid && leaderBid.owner === ME ? leaderBid.id : null;
      if (myLeadNow && s.myLeadBidId !== myLeadNow) {
        s.leadSince = now;
        s.leadAwarded = 0;
      }
      if (!myLeadNow) s.leadSince = null;
      s.myLeadBidId = myLeadNow;

      if (leaderOwner !== s.lastLeaderOwner && leaderOwner) {
        this.pushFeed(s, leaderOwner === ME ? 'Bạn vừa giành ngôi đầu!' : 'Một thợ săn vừa giành ngôi đầu', leaderOwner === ME ? 'me' : 'lead', now);
      }
      s.lastLeaderOwner = leaderOwner;
    }

    // 6. gộp thông báo "N giá vừa bị trùng" mỗi 10 giây
    s.dupWindow.count += newDups;
    if (now - s.dupWindow.start > 10000) {
      if (s.dupWindow.count > 0) this.pushFeed(s, `${s.dupWindow.count} giá vừa bị trùng`, 'dup', now);
      s.dupWindow = { start: now, count: 0 };
    }

    // 7. Ngai vàng: thưởng theo mốc giữ ngai và khi phá kỷ lục tổ (chờ trời sáng mới báo)
    if (!night && s.reign?.owner === ME) {
      const held = now - s.reign.since;
      while (s.reignAwarded < THRONE.milestones.length && held >= THRONE.milestones[s.reignAwarded].sec * 1000) {
        const m = THRONE.milestones[s.reignAwarded++];
        this.addHuntPoints(m.pts, s);
        this.pushFeed(s, `${m.label}: giữ ngai ${fmtSec(m.sec)} · +${m.pts} điểm săn`, 'throne', now);
      }
      const rec = this.state.rooms[cfg.id].throneRecord;
      if (!s.brokeRecord && rec && held > rec.ms) {
        s.brokeRecord = true;
        this.addHuntPoints(THRONE.recordBonus, s);
        this.pushFeed(s, `Bạn vừa phá kỷ lục giữ ngai của tổ! +${THRONE.recordBonus} điểm săn`, 'throne', now);
        this.emit({ type: 'throne', roomId: cfg.id, text: `Bạn vừa phá kỷ lục giữ ngai Tổ ${cfg.name}!` });
      }
    }
  }

  // ---------- Ngai vàng ----------
  private trackReign(cfg: RoomConfig, s: Session, leaderOwner: string | null, now: number) {
    if (s.reign && s.reign.owner === leaderOwner) return;
    if (s.reign) this.endReign(cfg, s, now);
    if (!leaderOwner) return;
    const name = leaderOwner === ME ? this.state.profile.name : s.bots.find((b) => b.id === leaderOwner)?.name ?? 'Thợ săn';
    s.reign = { owner: leaderOwner, name, since: now };
    if (leaderOwner === ME) s.reignAwarded = 0;
  }
  private endReign(cfg: RoomConfig, s: Session, now: number) {
    const r = s.reign;
    if (!r) return;
    s.reign = null;
    const ms = Math.max(0, now - r.since);
    if (r.owner === ME) {
      s.myThroneMs += ms;
      s.myBestReignMs = Math.max(s.myBestReignMs, ms);
    }
    const rt = this.state.rooms[cfg.id];
    if (ms > (rt.throneRecord?.ms ?? 0)) rt.throneRecord = { name: r.name, ms, me: r.owner === ME, at: now };
  }

  // ---------- Sự kiện bất ngờ ----------
  private startEvent(cfg: RoomConfig, s: Session, e: SurpriseEvent, now: number) {
    let text = '';
    if (e.kind === 'night') {
      text = `Màn đêm buông xuống! Mọi trạng thái bị ẩn ${SURPRISE.night.durationSec} giây`;
    } else if (e.kind === 'rain') {
      e.rainPoints = 0;
      text = `Mưa điểm! Mỗi giá ra trong ${SURPRISE.rain.durationSec} giây tới được +${SURPRISE.rain.pointsPerBid} điểm săn`;
    } else {
      e.reveal = this.findDupZone(cfg, s);
      const r = e.reveal;
      text = r.dupPrices.length
        ? `Hé lộ: vùng ${fmtVnd(r.from)} – ${fmtVnd(r.to)} có ${r.dupPrices.length} mức giá đang bị trùng`
        : `Hé lộ: vùng ${fmtVnd(r.from)} – ${fmtVnd(r.to)} chưa có mức giá nào bị trùng`;
    }
    this.pushFeed(s, text, 'event', now);
    if (s.myJoined) this.emit({ type: 'surprise', roomId: cfg.id, roomName: cfg.name, kind: e.kind, text });
  }
  /** Tìm vùng giá (SURPRISE.reveal.levels mức liên tiếp) có nhiều mức bị trùng nhất, trong vùng giá người chơi hay chọn */
  private findDupZone(cfg: RoomConfig, s: Session): NonNullable<SurpriseEvent['reveal']> {
    const rule = priceRule(cfg);
    const L = Math.min(SURPRISE.reveal.levels, rule.levels);
    const counts = countPrices(s.bids);
    const lastStart = Math.max(1, Math.min(rule.levels - L + 1, cfg.bots.typicalSteps * 3));
    let best = { k: 1, dups: -1, bids: 0 };
    for (let k = 1; k <= lastStart; k++) {
      let dups = 0;
      let bids = 0;
      for (let j = k; j < k + L; j++) {
        const c = counts.get(j * rule.step) ?? 0;
        if (c > 1) {
          dups++;
          bids += c;
        }
      }
      if (dups > best.dups) best = { k, dups, bids };
    }
    const dupPrices: number[] = [];
    for (let j = best.k; j < best.k + L; j++) if ((counts.get(j * rule.step) ?? 0) > 1) dupPrices.push(j * rule.step);
    return { from: best.k * rule.step, to: (best.k + L - 1) * rule.step, step: rule.step, dupPrices, dupBids: best.bids };
  }

  // =================================================================
  // GÕ BÚA
  // =================================================================
  private resolve(cfg: RoomConfig, rt: RoomRuntime, s: Session) {
    // xử lý nốt các giá đã lên lịch trước giờ đóng
    this.runSessionTail(cfg, s);
    if (s.reign) this.endReign(cfg, s, s.endAt - cfg.freezeSec * 1000);
    // Công cụ demo: hỗ trợ thắng — bỏ giá thợ săn ảo ở mức bằng hoặc thấp hơn giá thấp nhất của bạn
    let demoBoost = false;
    const chance = this.state.profile.demoWinChance ?? 0;
    const mineNow = myBids(s);
    if (mineNow.length && chance > 0 && Math.random() < chance) {
      const m = Math.min(...mineNow.map((b) => b.price));
      s.bids = s.bids.filter((b) => b.owner === ME || b.price > m);
      demoBoost = true;
    }
    const counts = countPrices(s.bids);
    const uniques = [...counts.entries()].filter(([, c]) => c === 1).map(([p]) => p).sort((a, b) => a - b);
    const allPrizes = [...s.prizes, ...s.jackpot];
    const winners: SessionResult['winners'] = [];
    for (let i = 0; i < allPrizes.length && i < uniques.length; i++) {
      const bid = s.bids.find((b) => b.price === uniques[i])!;
      const name = bid.owner === ME ? this.state.profile.name : s.bots.find((b) => b.id === bid.owner)!.name;
      winners.push({ owner: bid.owner, name, price: uniques[i], prize: allPrizes[i] });
    }
    const leftover = allPrizes.slice(winners.length);
    let rolledOver: Prize[] = [];
    let voided: Prize[] = [];
    if (leftover.length) {
      if (cfg.noWinnerRule === 'rollover' && s.rolloverCount < cfg.maxRollovers) {
        rolledOver = leftover.map((p) => ({ ...p, name: p.name.includes('(dồn)') ? p.name : `${p.name} (dồn)` }));
        rt.pendingJackpot = rolledOver;
        rt.pendingRollovers = s.rolloverCount + 1;
      } else {
        voided = leftover;
        rt.pendingJackpot = [];
        rt.pendingRollovers = 0;
      }
    } else {
      rt.pendingJackpot = [];
      rt.pendingRollovers = 0;
    }

    // mã kiểm chứng: băm danh sách giá ẩn danh
    const anon = new Map<string, string>();
    const sorted = [...s.bids].sort((a, b) => a.at - b.at);
    const lines = sorted.map((b) => {
      if (!anon.has(b.owner)) anon.set(b.owner, `TS-${String(anon.size + 1).padStart(4, '0')}`);
      return `${anon.get(b.owner)},${b.price},${new Date(b.at).toISOString()}`;
    });
    const csv = ['ma_tho_san,gia_vnd,thoi_diem', ...lines].join('\n');
    const hash = sha256(csv);

    const mine = myBids(s);
    const my = mine
      .map((b) => {
        const c = counts.get(b.price) ?? 0;
        const isWin = winners.some((w) => w.owner === ME && w.price === b.price);
        if (isWin) return { price: b.price, status: 'win' as const, uniqueRank: uniques.indexOf(b.price) + 1 };
        if (c === 1) return { price: b.price, status: 'unique' as const, uniqueRank: uniques.indexOf(b.price) + 1 };
        return { price: b.price, status: 'dup' as const };
      })
      .sort((a, b) => a.price - b.price);
    let nearMiss: SessionResult['nearMiss'];
    const iWon = winners.some((w) => w.owner === ME);
    if (!iWon && winners.length) {
      const myUnique = my.filter((m) => m.status === 'unique');
      if (myUnique.length) {
        const lastWinPrice = winners[winners.length - 1].price;
        nearMiss = { myPrice: myUnique[0].price, diff: (myUnique[0].price - lastWinPrice) };
      }
    }
    const result: SessionResult = {
      winners,
      rolledOver,
      voided,
      counts: [...counts.entries()].sort((a, b) => a[0] - b[0]),
      totalBids: s.bids.length,
      participants: participantsOf(s),
      hash,
      csv,
      my,
      nearMiss,
      demoBoost,
      pointsEarned: 0,
      throne: { myTotalMs: s.myThroneMs, myBestMs: s.myBestReignMs, record: rt.throneRecord ?? null, newRecord: s.brokeRecord },
    };

    const now = s.endAt;
    const p = this.state.profile;
    for (const w of winners) {
      this.state.hall.unshift({ id: uid('h'), at: now, name: w.owner === ME ? 'Bạn' : w.name, prize: w.prize.name, priceVnd: w.price, me: w.owner === ME });
      if (w.owner === ME) {
        p.prizes.unshift({
          id: uid('p'),
          sessionId: s.id,
          roomName: cfg.name,
          prize: w.prize,
          priceVnd: w.price,
          at: now,
          deadline: endOfDay(addDays(now, CLAIM_DAYS)),
          status: 'pending',
        });
      }
    }
    this.state.hall = this.state.hall.slice(0, 30);
    if (iWon) this.addHuntPoints(HUNT_POINTS.win, s);
    result.pointsEarned = s.pointsEarned;

    rt.lastResult = { sessionId: s.id, no: s.no, endAt: s.endAt, result };
    if (s.myJoined) {
      const item: HistoryItem = { sessionId: s.id, roomId: cfg.id, roomName: cfg.name, no: s.no, endAt: s.endAt, stepVnd: 1, prizes: allPrizes, result };
      this.state.history.unshift(item);
      this.state.history = this.state.history.slice(0, 20);
      this.emit({ type: 'result', roomId: cfg.id, sessionId: s.id, won: iWon, roomName: cfg.name });
      this.save();
    }
  }

  /** Chạy các giá đã lên lịch còn sót (khi người chơi vắng mặt lâu) */
  private runSessionTail(cfg: RoomConfig, s: Session) {
    if (s.schedIdx < s.schedule.length || s.joinIdx < s.botJoins.length) this.runSession(cfg, s, s.endAt - 1, 0);
  }

  // =================================================================
  // HÀNH ĐỘNG CỦA NGƯỜI CHƠI
  // =================================================================
  canEnter(roomId: string, now = Date.now()): { ok: boolean; reason?: string } {
    const cfg = roomCfg(roomId);
    const s = this.state.rooms[roomId].session;
    if (rankIndex(rankOf(this.state.profile.huntPoints).id) < rankIndex(cfg.minRank)) {
      return { ok: false, reason: `Cần hạng ${RANKS.find((r) => r.id === cfg.minRank)!.name} trở lên` };
    }
    if (!s) return { ok: false, reason: 'Tổ chưa xuất hiện' };
    if (s.myJoined) return { ok: true };
    if (now < s.startAt) return { ok: false, reason: 'Tổ chưa mở' };
    if (now >= s.endAt) return { ok: false, reason: 'Phiên đã kết thúc' };
    if (cfg.entryCloseBeforeEndSec > 0 && now >= s.endAt - cfg.entryCloseBeforeEndSec * 1000) return { ok: false, reason: 'Cửa vào đã đóng' };
    if (participantsOf(s) >= cfg.maxParticipants) return { ok: false, reason: 'Tổ đã đầy chỗ' };
    return { ok: true };
  }

  /** Số lượt tối đa mỗi phiên (Infinity = không giới hạn) */
  maxBidsFor(roomId: string): number {
    const n = roomCfg(roomId).maxBidsPerUser;
    return n > 0 ? n : Infinity;
  }

  /** Số lần Soi vùng giá mỗi phiên (hạng Bạc trở lên được thêm 1) */
  scanQuota(roomId: string): number {
    const bonus = rankIndex(rankOf(this.state.profile.huntPoints).id) >= rankIndex('bac') ? 1 : 0;
    return roomCfg(roomId).tools.scan + bonus;
  }

  placeBid(roomId: string, priceSteps: number): { ok: boolean; error?: string; rainBonus?: number } {
    const now = Date.now();
    const cfg = roomCfg(roomId);
    const s = this.state.rooms[roomId].session;
    if (!s || now < s.startAt) return { ok: false, error: 'Tổ chưa mở' };
    if (now >= s.endAt) return { ok: false, error: 'Búa đã gõ. Giá không được ghi nhận, giọt mật được giữ nguyên.' };
    const entry = this.canEnter(roomId, now);
    if (!entry.ok) return { ok: false, error: entry.reason };
    const rule = priceRule(cfg);
    if (!Number.isInteger(priceSteps) || priceSteps < rule.min || priceSteps > rule.max) {
      return { ok: false, error: `Giá phải từ ${fmtVnd(rule.min)} đến ${fmtVnd(rule.max)}` };
    }
    if (priceSteps % rule.step !== 0) return { ok: false, error: `Giá phải là bội số của bước giá ${fmtVnd(rule.step)}` };
    const mine = myBids(s);
    if (mine.length >= this.maxBidsFor(roomId)) return { ok: false, error: 'Bạn đã dùng hết lượt ra giá của phiên này' };
    if (mine.some((b) => b.price === priceSteps)) return { ok: false, error: 'Bạn đã ra giá này rồi' };
    if (this.balance(now) < 1) return { ok: false, error: 'Hết giọt mật. Giao dịch hoặc đổi điểm để có thêm.' };

    this.consumeDrop(now, `Ra giá ${fmtVnd(priceSteps)} · Tổ ${cfg.name}`);
    this.addBid(s, ME, priceSteps, now);
    if (!s.myJoined) {
      s.myJoined = true;
      this.addHuntPoints(HUNT_POINTS.joinSession, s);
    }
    this.markPlayed(now);
    // Mưa điểm: thưởng điểm săn cho mỗi giá ra trong lúc mưa
    let rainBonus = 0;
    const rain = isRain(s, now) && !isFrozen(s, now) ? s.events.find((e) => e.kind === 'rain' && now >= e.at && now < e.until) : undefined;
    if (rain) {
      rainBonus = SURPRISE.rain.pointsPerBid;
      rain.rainPoints = (rain.rainPoints ?? 0) + rainBonus;
      this.addHuntPoints(rainBonus, s);
    }
    // cập nhật ngay trạng thái dẫn đầu (không chờ tick). Màn đêm: giữ bí mật đến khi trời sáng.
    if (!isFrozen(s, now) && !isNight(s, now)) {
      const counts = countPrices(s.bids);
      const lu = lowestUnique(counts);
      const leaderBid = lu === null ? null : s.bids.find((b) => b.price === lu)!;
      this.trackReign(cfg, s, leaderBid?.owner ?? null, now);
      if (leaderBid && leaderBid.owner === ME && s.myLeadBidId !== leaderBid.id) {
        s.myLeadBidId = leaderBid.id;
        s.leadSince = now;
        s.leadAwarded = 0;
        s.lastLeaderOwner = ME;
        this.pushFeed(s, 'Bạn vừa giành ngôi đầu!', 'me', now);
      } else if (!leaderBid || leaderBid.owner !== ME) {
        s.myLeadBidId = null;
        s.leadSince = null;
      }
    }
    this.changed(true);
    return { ok: true, rainBonus };
  }

  /** Soi vùng giá: đếm số mức chưa ai chọn trong khoảng [from, to] (theo bước giá) */
  /**
   * Soi vùng giá: trả về các mức giá quanh giá định ra (±SCAN_HALF bước),
   * mỗi mức cho biết đã có người chọn hay còn trống (không cho biết bao nhiêu người).
   */
  useScan(roomId: string, centerVnd: number): { ok: boolean; error?: string; cells?: { price: number; taken: boolean; mine: boolean }[]; at?: number } {
    const now = Date.now();
    const cfg = roomCfg(roomId);
    const rule = priceRule(cfg);
    const s = this.state.rooms[roomId].session;
    if (!s || !isRunning(s, now)) return { ok: false, error: 'Tổ không trong phiên' };
    if (isFrozen(s, now)) return { ok: false, error: 'Không dùng được trong giai đoạn đóng băng' };
    if (isNight(s, now)) return { ok: false, error: 'Màn đêm: công cụ tạm khóa đến khi trời sáng' };
    if (s.toolsUsed.scan >= this.scanQuota(roomId)) return { ok: false, error: 'Đã hết lượt Soi vùng giá của phiên này' };
    const c = Math.round(centerVnd / rule.step);
    const lo = Math.max(1, Math.min(c - SCAN_HALF, rule.levels - 2 * SCAN_HALF));
    const hi = Math.min(rule.levels, lo + 2 * SCAN_HALF);
    const counts = countPrices(s.bids);
    const mine = new Set(myBids(s).map((b) => b.price));
    const cells = [];
    for (let k = lo; k <= hi; k++) {
      const p = k * rule.step;
      cells.push({ price: p, taken: counts.has(p) && !(mine.has(p) && counts.get(p) === 1), mine: mine.has(p) });
    }
    s.toolsUsed.scan++;
    this.changed(true);
    return { ok: true, cells, at: now };
  }

  /** Nhiệt kế: 3 vùng giá (đồng) tính từ hành vi chung của phòng */
  thermoZones(roomId: string): [number, number][] {
    const cfg = roomCfg(roomId);
    const rule = priceRule(cfg);
    const t = cfg.bots.typicalSteps;
    const a = Math.min(rule.levels - 2, Math.round(t * THERMO_SPLIT[0]));
    const b = Math.min(rule.levels - 1, Math.round(t * THERMO_SPLIT[1]));
    return [
      [rule.step, a * rule.step],
      [(a + 1) * rule.step, b * rule.step],
      [(b + 1) * rule.step, rule.max],
    ];
  }
  useThermo(roomId: string): { ok: boolean; error?: string; zone?: number | null; at?: number } {
    const now = Date.now();
    const cfg = roomCfg(roomId);
    const s = this.state.rooms[roomId].session;
    if (!s || !isRunning(s, now)) return { ok: false, error: 'Tổ không trong phiên' };
    if (isFrozen(s, now)) return { ok: false, error: 'Không dùng được trong giai đoạn đóng băng' };
    if (isNight(s, now)) return { ok: false, error: 'Màn đêm: công cụ tạm khóa đến khi trời sáng' };
    if (s.toolsUsed.thermo >= cfg.tools.thermo) return { ok: false, error: 'Đã hết lượt Nhiệt kế của phiên này' };
    const lu = lowestUnique(countPrices(s.bids));
    s.toolsUsed.thermo++;
    this.changed(true);
    if (lu === null) return { ok: true, zone: null, at: now };
    const zones = this.thermoZones(roomId);
    const zone = zones.findIndex(([a, b]) => lu >= a && lu <= b);
    return { ok: true, zone, at: now };
  }

  // ---------------- Giọt mật ----------------
  balance(now = Date.now()): number {
    return this.state.profile.drops.reduce((s, d) => s + (d.expiresAt > now ? d.remaining : 0), 0);
  }
  expiringSoon(now = Date.now()): { amount: number; at: number } | null {
    const lim = now + DROPS.expiringWarnHours * 3600 * 1000;
    const xs = this.state.profile.drops.filter((d) => d.remaining > 0 && d.expiresAt > now && d.expiresAt <= lim);
    if (!xs.length) return null;
    return { amount: xs.reduce((s, d) => s + d.remaining, 0), at: Math.min(...xs.map((d) => d.expiresAt)) };
  }
  private consumeDrop(now: number, text: string) {
    const valid = this.state.profile.drops.filter((d) => d.remaining > 0 && d.expiresAt > now).sort((a, b) => a.expiresAt - b.expiresAt);
    if (valid.length) valid[0].remaining--;
    this.ledger(text, -1, now);
  }
  private ledger(text: string, delta: number, now = Date.now()) {
    const p = this.state.profile;
    p.ledger.unshift({ id: uid('l'), at: now, text, delta });
    p.ledger = p.ledger.slice(0, 60);
  }
  /** Cộng giọt mật, tôn trọng trần mỗi ngày. Trả về số giọt thực nhận. */
  private addDrops(amount: number, source: DropSource, label: string, now = Date.now()): number {
    const p = this.state.profile;
    this.rollCounters(now);
    const room = Math.max(0, DROPS.dailyCap - p.counters.earned);
    const got = Math.min(room, amount);
    if (got <= 0) return 0;
    p.counters.earned += got;
    const expiresAt = source === 'loyalty' ? addDays(now, DROPS.loyaltyExpiryDays) : endOfWeek(now);
    p.drops.push({ id: uid('d'), amount: got, remaining: got, source, label, at: now, expiresAt });
    this.ledger(label, got, now);
    return got;
  }
  private rollCounters(now: number) {
    const p = this.state.profile;
    const d = dayKey(now);
    if (p.counters.day !== d) p.counters = { day: d, login: 0, transfer: 0, qr: 0, bill: 0, loyaltyDrops: 0, earned: 0 };
    const m = monthKey(now);
    if (p.monthCounters.month !== m) p.monthCounters = { month: m, savings: 0, invite: 0 };
  }
  private expireCheck(now: number) {
    const p = this.state.profile;
    p.drops = p.drops.filter((d) => d.expiresAt > now - 7 * 86400000 || d.remaining > 0);
  }

  usedCount(id: EarnActionId): number {
    this.rollCounters(Date.now());
    const p = this.state.profile;
    switch (id) {
      case 'login':
        return p.counters.login;
      case 'transfer':
        return p.counters.transfer;
      case 'qr':
        return p.counters.qr;
      case 'bill':
        return p.counters.bill;
      case 'savings':
        return p.monthCounters.savings;
      case 'invite':
        return p.monthCounters.invite;
    }
  }

  /** Mô phỏng một giao dịch ngân hàng để kiếm giọt mật */
  simulateTransaction(id: EarnActionId, opts: { amountVnd?: number; selfTransfer?: boolean } = {}): { ok: boolean; message: string } {
    const now = Date.now();
    const rule = EARN_RULES.find((r) => r.id === id)!;
    this.rollCounters(now);
    const p = this.state.profile;
    if (id === 'transfer') {
      if (opts.selfTransfer) {
        this.changed(true);
        return { ok: false, message: 'Giao dịch thành công, nhưng chuyển khoản giữa các tài khoản của chính bạn không được tính giọt mật.' };
      }
      if ((opts.amountVnd ?? 0) < TRANSFER_MIN_VND) {
        return { ok: false, message: `Giao dịch thành công, nhưng cần từ ${fmtVnd(TRANSFER_MIN_VND)} để nhận giọt mật.` };
      }
    }
    if (this.usedCount(id) >= rule.limit) {
      return { ok: false, message: `Giao dịch thành công, nhưng bạn đã đạt giới hạn nhận giọt mật (${rule.note}).` };
    }
    if (id === 'transfer') p.counters.transfer++;
    if (id === 'qr') p.counters.qr++;
    if (id === 'bill') p.counters.bill++;
    if (id === 'savings') p.monthCounters.savings++;
    if (id === 'invite') p.monthCounters.invite++;
    const got = this.addDrops(rule.drops, 'giao dịch', rule.label, now);
    this.changed(true);
    if (got === 0) return { ok: false, message: 'Giao dịch thành công, nhưng bạn đã đạt trần giọt mật hôm nay.' };
    return { ok: true, message: `+${got} giọt mật từ "${rule.label}"` };
  }

  // ---------------- Đổi điểm Loyalty ----------------
  isGoldenHour(now = Date.now()) {
    return this.state.profile.demoGolden || inWindow(now, LOYALTY.goldenHour.start, LOYALTY.goldenHour.end);
  }
  exchangeDrops(pkgId: string): number {
    const pkg = LOYALTY.packages.find((x) => x.id === pkgId)!;
    return pkg.drops * (pkg.doubleInGolden && this.isGoldenHour() ? 2 : 1);
  }
  exchange(pkgId: string): { ok: boolean; message: string } {
    const now = Date.now();
    const pkg = LOYALTY.packages.find((x) => x.id === pkgId)!;
    const p = this.state.profile;
    this.rollCounters(now);
    if (pkg.goldenOnly && !this.isGoldenHour(now)) return { ok: false, message: 'Gói này chỉ mở trong Giờ vàng đổi điểm' };
    if (p.loyaltyPoints < pkg.points) return { ok: false, message: 'Không đủ điểm Loyalty' };
    const drops = this.exchangeDrops(pkgId);
    if (p.counters.loyaltyDrops + drops > LOYALTY.dailyDropLimit) {
      return { ok: false, message: `Vượt giới hạn đổi ${LOYALTY.dailyDropLimit} giọt mật mỗi ngày` };
    }
    p.loyaltyPoints -= pkg.points;
    p.counters.loyaltyDrops += drops;
    const got = this.addDrops(drops, 'loyalty', `Đổi gói ${pkg.name} (${pkg.points} điểm)`, now);
    this.changed(true);
    return { ok: true, message: `Đã đổi ${pkg.points} điểm lấy ${got} giọt mật` };
  }

  // ---------------- Hạng, chuỗi ngày ----------------
  private addHuntPoints(pts: number, s?: Session) {
    const p = this.state.profile;
    const before = rankOf(p.huntPoints);
    p.huntPoints = Math.max(0, p.huntPoints + pts);
    if (s) s.pointsEarned += pts;
    const after = rankOf(p.huntPoints);
    if (after.id !== before.id) {
      this.emit({ type: 'toast', tone: 'good', text: `Lên hạng ${after.name} · ${after.bee}! ${after.perk}.` });
    }
  }
  streak(now = Date.now()): number {
    const set = new Set(this.state.profile.playedDays);
    let n = 0;
    let t = now;
    if (!set.has(dayKey(t))) t = addDays(t, -1);
    while (set.has(dayKey(t))) {
      n++;
      t = addDays(t, -1);
    }
    return n;
  }
  playedToday(now = Date.now()) {
    return this.state.profile.playedDays.includes(dayKey(now));
  }
  private markPlayed(now: number) {
    const p = this.state.profile;
    const d = dayKey(now);
    if (p.playedDays.includes(d)) return;
    p.playedDays.push(d);
    p.playedDays = p.playedDays.slice(-40);
    const n = this.streak(now);
    if (n > 0 && n % STREAK.days === 0) {
      const got = this.addDrops(STREAK.rewardDrops, 'thưởng', `Thưởng chuỗi ${n} ngày`, now);
      this.addHuntPoints(HUNT_POINTS.streak7);
      this.emit({ type: 'toast', tone: 'good', text: `Chuỗi ${n} ngày! +${got} giọt mật, +${HUNT_POINTS.streak7} điểm săn` });
    }
  }
  private dailyChecks(now: number) {
    const p = this.state.profile;
    this.rollCounters(now);
    // mùa mới: hạ một bậc
    if (p.season !== monthKey(now)) {
      const i = rankIndex(rankOf(p.huntPoints).id);
      p.huntPoints = RANKS[Math.max(0, i - 1)].minPoints;
      p.season = monthKey(now);
      this.emit({ type: 'toast', tone: 'info', text: 'Mùa mới bắt đầu! Hạng của bạn đã hạ một bậc.' });
    }
    if (p.counters.login === 0) {
      p.counters.login = 1;
      const got = this.addDrops(1, 'giao dịch', 'Đăng nhập hằng ngày', now);
      if (got) setTimeout(() => this.emit({ type: 'toast', tone: 'good', text: '+1 giọt mật đăng nhập hôm nay' }), 600);
    }
  }

  // ---------------- Nhận quà, nhắc nhở ----------------
  claimPrize(prizeId: string, method: string) {
    const pr = this.state.profile.prizes.find((x) => x.id === prizeId);
    if (!pr) return;
    pr.status = 'claimed';
    pr.method = method;
    this.changed(true);
  }
  toggleReminder(roomId: string) {
    const p = this.state.profile;
    p.reminders = p.reminders.includes(roomId) ? p.reminders.filter((x) => x !== roomId) : [...p.reminders, roomId];
    this.changed(true);
  }
  toggleSecretAlert() {
    this.state.profile.secretAlert = !this.state.profile.secretAlert;
    this.changed(true);
  }

  // ---------------- Công cụ demo ----------------
  demoAddLoyalty(n: number) {
    this.state.profile.loyaltyPoints += n;
    this.changed(true);
  }
  demoAddDrops(n: number) {
    const now = Date.now();
    this.state.profile.drops.push({ id: uid('d'), amount: n, remaining: n, source: 'thưởng', label: 'Quà demo', at: now, expiresAt: endOfWeek(now) });
    this.ledger('Quà demo', n, now);
    this.changed(true);
  }
  /** Giả lập hạng: đặt điểm săn về ngưỡng của hạng được chọn */
  demoSetRank(id: string) {
    const r = RANKS.find((x) => x.id === id);
    if (!r) return;
    this.state.profile.huntPoints = r.minPoints;
    this.emit({ type: 'toast', tone: 'good', text: `Đã chuyển sang hạng ${r.name} · ${r.bee}` });
    this.changed(true);
  }
  demoAddHunt(n: number) {
    this.addHuntPoints(n);
    this.changed(true);
  }
  /** Giả lập Hũ mật: dồn thêm quà của phòng vào phiên hiện tại (hoặc phiên kế tiếp) */
  demoAddJackpot(roomId: string) {
    const cfg = roomCfg(roomId);
    const rt = this.state.rooms[roomId];
    const pot = cfg.prizes.map((p) => ({ ...p, name: `${p.name} (dồn)` }));
    if (rt.session && Date.now() < rt.session.endAt) {
      rt.session.jackpot = [...rt.session.jackpot, ...pot];
      rt.session.rolloverCount++;
    } else {
      rt.pendingJackpot = [...rt.pendingJackpot, ...pot];
      rt.pendingRollovers++;
    }
    this.emit({ type: 'toast', tone: 'good', roomId, text: `Hũ mật Tổ ${cfg.name} vừa được dồn thêm quà!` });
    this.changed(true);
  }
  demoSetDifficulty(d: Difficulty) {
    this.state.profile.demoDifficulty = d;
    diffNow = d;
    // áp dụng ngay cho các phiên đang chạy: bớt số giá thợ săn ảo sắp ra
    const keep = DIFFICULTY[d].bids;
    if (keep < 1) {
      for (const rt of Object.values(this.state.rooms)) {
        const s = rt.session;
        if (!s) continue;
        const done = s.schedule.slice(0, s.schedIdx);
        const rest = s.schedule.slice(s.schedIdx).filter(() => Math.random() < keep);
        s.schedule = [...done, ...rest];
      }
    }
    this.changed(true);
  }
  demoSetWinChance(p: number) {
    this.state.profile.demoWinChance = p;
    this.changed(true);
  }
  demoToggleGolden() {
    this.state.profile.demoGolden = !this.state.profile.demoGolden;
    this.changed(true);
  }
  /** Tua phiên hiện tại đến ngay trước giai đoạn đóng băng */
  demoFastForward(roomId: string) {
    const now = Date.now();
    const cfg = roomCfg(roomId);
    const rt = this.state.rooms[roomId];
    if (cfg.secret && !rt.session) {
      rt.nextSecretAt = now + 5000;
      this.changed(true);
      return;
    }
    const s = rt.session;
    if (!s) return;
    if (now < s.startAt) {
      const shift = s.startAt - now;
      this.shiftSession(s, -shift);
    } else {
      const target = now + (cfg.freezeSec + 8) * 1000;
      if (s.endAt > target) this.shiftSession(s, target - s.endAt, now);
    }
    this.changed(true);
  }
  private shiftSession(s: Session, delta: number, fromNow?: number) {
    // dời các mốc thời gian trong tương lai; nếu fromNow có giá trị thì nén lịch còn lại vào khoảng mới
    if (fromNow === undefined) {
      s.startAt += delta;
      s.endAt += delta;
      s.botJoins.forEach((j) => (j.at += delta));
      s.schedule.forEach((j) => (j.at += delta));
      s.events.forEach((e) => {
        e.at += delta;
        e.until += delta;
      });
      return;
    }
    const oldEnd = s.endAt;
    const newEnd = oldEnd + delta;
    const squash = (t: number) => (t <= fromNow ? t : fromNow + ((t - fromNow) / (oldEnd - fromNow)) * (newEnd - fromNow));
    s.botJoins.forEach((j) => (j.at = squash(j.at)));
    s.schedule.forEach((j) => (j.at = squash(j.at)));
    s.endAt = newEnd;
    // sự kiện chưa diễn ra: bỏ đi nếu không còn đủ chỗ trước giai đoạn đóng băng
    const freezeAt = newEnd - roomCfg(s.roomId).freezeSec * 1000;
    s.events = s.events.filter((e) => e.started || e.at + 3000 < freezeAt);
    s.events.forEach((e) => {
      if (e.started) {
        if (!e.ended) e.until = Math.min(e.until, freezeAt);
        return;
      }
      const d = e.until - e.at;
      e.at = Math.max(fromNow, squash(e.at));
      e.until = Math.min(freezeAt, e.at + d);
    });
  }

  /** Công cụ demo: gọi ngay một sự kiện bất ngờ trong tổ */
  demoTriggerEvent(roomId: string, kind: SurpriseKind): string | null {
    const now = Date.now();
    const cfg = roomCfg(roomId);
    const s = this.state.rooms[roomId].session;
    if (!s || !isRunning(s, now)) return 'Tổ không trong phiên';
    const freezeAt = s.endAt - cfg.freezeSec * 1000;
    const d = SURPRISE[kind].durationSec * 1000;
    if (now + d > freezeAt) return 'Không đủ thời gian trước giai đoạn đóng băng';
    // kết thúc sự kiện đang chạy, bỏ các sự kiện sắp tới bị chồng lên
    for (const e of s.events) if (e.started && !e.ended && now < e.until) e.until = now;
    s.events = s.events.filter((e) => e.started || e.at > now + d + SURPRISE.gapSec[0] * 1000);
    const ev: SurpriseEvent = { id: uid('ev'), kind, at: now, until: now + d, started: false };
    s.events.push(ev);
    s.events.sort((a, b) => a.at - b.at);
    if (kind === 'rain') addRainBids(s, ev);
    this.tick();
    return null;
  }
  demoBreakReminder() {
    this.emit({ type: 'break' });
  }
}

export const store = new GameStore();

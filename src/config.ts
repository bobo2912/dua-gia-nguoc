// =====================================================================
// CẤU HÌNH APP "Đấu giá" (Mua đồ luxury giá bình dân)
// Mọi tham số vận hành nằm ở file này. Trong sản phẩm thật, các giá trị
// này đến từ trang quản trị (xem mục 15 của GDD), không hard-code.
//
// LƯU Ý BẢN DEMO: thời lượng phòng được rút ngắn để trải nghiệm nhanh.
// Giá trị thật theo GDD được ghi trong chú thích "GDD:" bên cạnh.
// =====================================================================

export type RankId = 'dong' | 'bac' | 'vang' | 'kimcuong';
export type NoWinnerRule = 'rollover' | 'void'; // dồn Hũ mật | bỏ phiên

export interface Prize {
  name: string;
  valueVnd: number;
}

export interface BotProfile {
  /** Số thợ săn ảo tham gia mỗi phiên [min, max] */
  participants: [number, number];
  /** Số giá mỗi thợ săn ảo ra [min, max] */
  bidsPerBot: [number, number];
  /** Mức giá trung bình thợ săn ảo hay chọn, tính theo SỐ BƯỚC GIÁ. Càng nhỏ thì giá càng dồn về vùng thấp */
  typicalSteps: number;
  /** Xác suất chọn các mức "đẹp" (10, 20, 50, 99, 100 bước...) – dễ bị trùng */
  roundPref: number;
  /** Xác suất mỗi giây có thợ săn ảo trùng đúng giá đang dẫn đầu (tạo cảm giác bị cướp ngôi) */
  rivalPerSec: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  badge: string;
  /** Thời lượng phiên (giây). */
  durationSec: number;
  /** Thời lượng đóng băng cuối phiên (giây). GDD: 60 giây */
  freezeSec: number;
  /** Cửa vào đóng trước giờ gõ búa bao nhiêu giây (0 = không đóng sớm) */
  entryCloseBeforeEndSec: number;
  /** Nghỉ giữa hai phiên (giây) */
  breakSec: number;
  /** Bước giá (đồng). Bỏ trống = tự tính theo giá trị quà (xem STEP_TIERS) */
  stepVnd?: number;
  /** Giá tối đa (đồng). Bỏ trống = bằng giá trị món quà lớn nhất của phòng */
  maxVnd?: number;
  /** Lượt ra giá tối đa mỗi người mỗi phiên (0 = không giới hạn, mỗi lượt vẫn tốn 1 giọt mật) */
  maxBidsPerUser: number;
  /** Số người tối đa trong phòng */
  maxParticipants: number;
  /** Danh sách quà của phiên (nhiều quà = nhiều người thắng) */
  prizes: Prize[];
  /** Quy tắc khi không có giá duy nhất */
  noWinnerRule: NoWinnerRule;
  /** Số lần dồn tối đa trước khi chuyển sang bỏ phiên */
  maxRollovers: number;
  /** Hạng tối thiểu để vào */
  minRank: RankId;
  bots: BotProfile;
  /** Phòng Bí Mật: xuất hiện theo lịch ẩn */
  secret?: { everySec: number; announceSec: number };
  /** Tắt sự kiện bất ngờ cho phòng này (mặc định bật theo SURPRISE.enabled) */
  surprises?: boolean;
  /** Số lần dùng công cụ mỗi phiên */
  tools: { scan: number; thermo: number };
}

export const ROOMS: RoomConfig[] = [
  {
    id: 'flash',
    name: 'Chớp Nhoáng',
    badge: 'CHỚP NHOÁNG',
    durationSec: 180, // GDD: 15 phút
    freezeSec: 20, // GDD: 60 giây
    entryCloseBeforeEndSec: 0,
    breakSec: 15,
    maxBidsPerUser: 0,
    maxParticipants: 2000,
    prizes: [{ name: 'Voucher nhà hàng 200.000đ', valueVnd: 200000 }],
    noWinnerRule: 'rollover',
    maxRollovers: 3,
    minRank: 'dong',
    bots: { participants: [40, 60], bidsPerBot: [3, 8], typicalSteps: 20, roundPref: 0.12, rivalPerSec: 0.012 },
    tools: { scan: 2, thermo: 1 },
  },
  {
    id: 'golden',
    name: 'Giờ Vàng',
    badge: 'GIỜ VÀNG',
    durationSec: 360, // GDD: 60 phút, mở 12:00 và 20:00
    freezeSec: 30,
    entryCloseBeforeEndSec: 120, // GDD: vào được trong 40 phút đầu
    breakSec: 60,
    maxBidsPerUser: 0,
    maxParticipants: 5000,
    prizes: [{ name: 'Tai nghe chống ồn cao cấp', valueVnd: 6500000 }],
    noWinnerRule: 'rollover',
    maxRollovers: 2,
    minRank: 'dong',
    bots: { participants: [70, 100], bidsPerBot: [3, 8], typicalSteps: 30, roundPref: 0.12, rivalPerSec: 0.01 },
    tools: { scan: 2, thermo: 1 },
  },
  {
    id: 'special',
    name: 'Đặc Biệt',
    badge: 'ĐẶC BIỆT',
    durationSec: 600, // GDD: cả ngày
    freezeSec: 30,
    entryCloseBeforeEndSec: 180,
    breakSec: 60,
    maxBidsPerUser: 0,
    maxParticipants: 220, // demo: ít chỗ để thấy hiệu ứng "sắp đầy"
    prizes: [
      { name: 'Túi xách da cao cấp', valueVnd: 45000000 },
      { name: 'Voucher du lịch 5.000.000đ', valueVnd: 5000000 },
    ],
    noWinnerRule: 'void', // hàng luxury chỉ có 1 chiếc: bỏ phiên
    maxRollovers: 0,
    minRank: 'dong',
    bots: { participants: [150, 205], bidsPerBot: [4, 9], typicalSteps: 60, roundPref: 0.12, rivalPerSec: 0.008 },
    tools: { scan: 3, thermo: 2 },
  },
  {
    id: 'secret',
    name: 'Bí Mật',
    badge: 'BÍ MẬT',
    durationSec: 90, // GDD: 10 phút
    freezeSec: 15,
    entryCloseBeforeEndSec: 0,
    breakSec: 0,
    maxBidsPerUser: 0,
    maxParticipants: 1000,
    prizes: [{ name: 'Nước hoa cao cấp 100ml', valueVnd: 4200000 }],
    noWinnerRule: 'rollover',
    maxRollovers: 2,
    minRank: 'dong',
    bots: { participants: [20, 30], bidsPerBot: [2, 6], typicalSteps: 10, roundPref: 0.12, rivalPerSec: 0.015 },
    secret: { everySec: 420, announceSec: 30 }, // GDD: báo trước 5 phút
    tools: { scan: 1, thermo: 1 },
  },
  {
    id: 'vip',
    name: 'VIP',
    badge: 'VIP',
    durationSec: 300,
    freezeSec: 30,
    entryCloseBeforeEndSec: 60,
    breakSec: 60,
    maxBidsPerUser: 0,
    maxParticipants: 300,
    prizes: [{ name: 'Đồng hồ cơ cao cấp', valueVnd: 85000000 }],
    noWinnerRule: 'void',
    maxRollovers: 0,
    minRank: 'vang',
    bots: { participants: [25, 40], bidsPerBot: [2, 6], typicalSteps: 15, roundPref: 0.12, rivalPerSec: 0.01 },
    tools: { scan: 2, thermo: 1 },
  },
  {
    id: 'partner',
    name: 'Đối Tác',
    badge: 'ĐỐI TÁC',
    durationSec: 240,
    freezeSec: 20,
    entryCloseBeforeEndSec: 0,
    breakSec: 30,
    maxBidsPerUser: 0,
    maxParticipants: 3000,
    prizes: [
      { name: 'Voucher trà sữa 50.000đ', valueVnd: 50000 },
      { name: 'Voucher trà sữa 50.000đ', valueVnd: 50000 },
      { name: 'Voucher trà sữa 50.000đ', valueVnd: 50000 },
    ],
    noWinnerRule: 'rollover',
    maxRollovers: 3,
    minRank: 'dong',
    bots: { participants: [35, 50], bidsPerBot: [2, 5], typicalSteps: 15, roundPref: 0.12, rivalPerSec: 0.01 },
    tools: { scan: 2, thermo: 1 },
  },
];

// ------------------------- Bước giá -------------------------
/**
 * Bước giá theo giá trị quà: giá luôn là số tròn, mà vẫn đủ nhiều mức để ít bị trùng.
 * Ví dụ quà 50.000đ → bước 100đ → 500 mức giá (100đ, 200đ, ..., 50.000đ).
 */
export const STEP_TIERS: { below: number; step: number }[] = [
  { below: 100_000, step: 100 },
  { below: 1_000_000, step: 500 },
  { below: 10_000_000, step: 10_000 },
  { below: Infinity, step: 50_000 },
];

export interface PriceRule {
  step: number;
  min: number;
  max: number;
  /** Số mức giá có thể chọn */
  levels: number;
  /** Giá trị món quà lớn nhất của phòng */
  prizeValue: number;
}

export function priceRule(cfg: RoomConfig): PriceRule {
  const prizeValue = Math.max(...cfg.prizes.map((p) => p.valueVnd));
  const step = cfg.stepVnd ?? STEP_TIERS.find((t) => prizeValue < t.below)!.step;
  const max = Math.floor((cfg.maxVnd ?? prizeValue) / step) * step;
  return { step, min: step, max, levels: max / step, prizeValue };
}

/** Soi vùng giá: xem bao nhiêu mức giá mỗi bên quanh giá định ra */
export const SCAN_HALF = 5;
/** Nhiệt kế: ranh giới vùng thấp / trung tính theo bội số của typicalSteps */
export const THERMO_SPLIT = [1, 2];

// ------------------------- Giọt mật (lượt ra giá) -------------------------
export const DROPS = {
  /** Trần tổng giọt mật nhận mỗi ngày từ mọi nguồn */
  dailyCap: 60,
  /** Hạn dùng giọt mật từ đổi điểm (ngày). Giọt từ giao dịch hết hạn cuối tuần (Chủ nhật 23:59). */
  loyaltyExpiryDays: 30,
  /** Cảnh báo "sắp hết hạn" nếu hết hạn trong vòng (giờ) */
  expiringWarnHours: 24,
};

export type EarnActionId = 'login' | 'transfer' | 'qr' | 'bill' | 'savings' | 'invite';

export interface EarnRule {
  id: EarnActionId;
  label: string;
  drops: number;
  limit: number;
  period: 'day' | 'month' | 'none';
  note: string;
}

export const EARN_RULES: EarnRule[] = [
  { id: 'login', label: 'Đăng nhập hằng ngày', drops: 1, limit: 1, period: 'day', note: '1 lần/ngày' },
  { id: 'transfer', label: 'Chuyển khoản từ 50.000đ', drops: 1, limit: 5, period: 'day', note: '5 lần/ngày' },
  { id: 'qr', label: 'Thanh toán QR tại cửa hàng', drops: 2, limit: 5, period: 'day', note: '5 lần/ngày' },
  { id: 'bill', label: 'Thanh toán hóa đơn', drops: 2, limit: 99, period: 'none', note: 'Mỗi hóa đơn' },
  { id: 'savings', label: 'Mở sổ tiết kiệm online', drops: 10, limit: 1, period: 'month', note: '1 lần/tháng' },
  { id: 'invite', label: 'Mời bạn mở tài khoản', drops: 5, limit: 10, period: 'month', note: '10 bạn/tháng' },
];

export const TRANSFER_MIN_VND = 50000;

// ------------------------- Đổi điểm Loyalty -------------------------
export interface LoyaltyPackage {
  id: string;
  name: string;
  points: number;
  drops: number;
  goldenOnly: boolean;
  /** Được nhân đôi trong giờ vàng */
  doubleInGolden: boolean;
}

export const LOYALTY = {
  packages: [
    { id: 'le', name: 'Lẻ', points: 100, drops: 1, goldenOnly: false, doubleInGolden: true },
    { id: 'combo', name: 'Combo', points: 450, drops: 5, goldenOnly: false, doubleInGolden: false },
    { id: 'chienbinh', name: 'Chiến binh', points: 800, drops: 10, goldenOnly: true, doubleInGolden: false },
  ] as LoyaltyPackage[],
  /** Giới hạn giọt mật đổi từ điểm mỗi ngày */
  dailyDropLimit: 20,
  /** Giờ vàng đổi điểm mỗi ngày (giờ địa phương) */
  goldenHour: { start: '20:00', end: '20:30' },
};

// ------------------------- Hạng theo mùa -------------------------
export interface RankDef {
  id: RankId;
  name: string;
  bee: string;
  minPoints: number;
  perk: string;
  color: string;
}

export const RANKS: RankDef[] = [
  { id: 'dong', name: 'Đồng', bee: 'Ong thợ', minPoints: 0, perk: 'Vào mọi phòng thường', color: '#B87333' },
  { id: 'bac', name: 'Bạc', bee: 'Ong chiến', minPoints: 300, perk: '+1 lượt Soi vùng giá mỗi phiên, khung ảnh bạc', color: '#C9CDD2' },
  { id: 'vang', name: 'Vàng', bee: 'Ong vệ binh', minPoints: 1000, perk: 'Vào phòng VIP, biết Tổ Bí Mật sớm hơn', color: '#D4A017' },
  { id: 'kimcuong', name: 'Kim Cương', bee: 'Ong chúa', minPoints: 3000, perk: 'Mọi phòng VIP, ưu tiên chỗ khi phòng gần đầy', color: '#7CC3F0' },
];

export const HUNT_POINTS = {
  joinSession: 10,
  win: 100,
  streak7: 20,
};

// ------------------------- Ngai vàng (giữ ngôi đầu) -------------------------
/**
 * Giữ ngôi đầu liên tục đến mốc nào thì được thưởng điểm săn của mốc đó.
 * Mốc càng xa thưởng càng lớn. Bản demo rút ngắn thời gian; sản phẩm thật nên nhân theo thời lượng phiên.
 */
export const THRONE = {
  milestones: [
    { sec: 20, pts: 5, label: 'Ngồi ấm ngai' },
    { sec: 45, pts: 10, label: 'Ngồi vững' },
    { sec: 90, pts: 20, label: 'Trấn giữ' },
    { sec: 150, pts: 35, label: 'Bá chủ tổ săn' },
  ],
  /** Thưởng thêm khi phá kỷ lục giữ ngai của tổ (1 lần mỗi phiên) */
  recordBonus: 25,
};

// ------------------------- Sự kiện bất ngờ trong phiên -------------------------
/**
 * Sự kiện áp dụng cho tất cả người trong tổ cùng lúc, không ai được lợi riêng.
 * LƯU Ý PHÁP LÝ: cơ chế này cần được mô tả trong thể lệ đăng ký với Cục Xúc tiến thương mại.
 */
export type SurpriseKind = 'night' | 'reveal' | 'rain';
export const SURPRISE = {
  enabled: true,
  /** Sự kiện nối tiếp nhau suốt phiên, không giới hạn số lần. Sự kiện đầu tiên đến sau khoảng này (tỷ lệ thời lượng phiên) */
  notBeforeRatio: 0.12,
  /** Phải kết thúc trước giai đoạn đóng băng ít nhất (giây) */
  endBeforeFreezeSec: 6,
  /** Khoảng nghỉ ngẫu nhiên giữa hai sự kiện liên tiếp [min, max] (giây). Bản demo rút ngắn */
  gapSec: [10, 30] as [number, number],
  night: { durationSec: 20, name: 'Màn đêm', desc: 'Mọi trạng thái bị ẩn. Ai cũng phải ra giá mù!' },
  reveal: { durationSec: 25, levels: 11, name: 'Hé lộ', desc: 'Hệ thống công bố một vùng giá đang có nhiều giá trùng.' },
  rain: { durationSec: 30, pointsPerBid: 5, name: 'Mưa điểm', desc: 'Mỗi giá ra trong lúc mưa được thêm điểm săn.' },
};

export const STREAK = { days: 7, rewardDrops: 5 };

// ------------------------- An toàn -------------------------
export const SAFETY = {
  /** Nhắc nghỉ sau bao nhiêu phút chơi liên tục */
  breakReminderMin: 120,
  /** Trần push mỗi ngày (áp dụng ở server trong sản phẩm thật) */
  pushPerDay: 5,
  quietHours: { start: '22:00', end: '07:00' },
};

export const CLAIM_DAYS = 7;

// Hồ sơ khởi đầu của bản demo (khớp với bản thiết kế)
export const DEMO_SEED = {
  name: 'Nguyễn Văn A',
  drops: 24,
  loyaltyPoints: 2350,
  huntPoints: 760,
  streakDaysBefore: 6,
};

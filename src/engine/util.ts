// Tiện ích chung: định dạng, thời gian, ngẫu nhiên, băm SHA-256

export const fmtVnd = (v: number) => v.toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';

export const fmtNum = (v: number) => v.toLocaleString('vi-VN').replace(/,/g, '.');

/** Thời lượng bằng chữ: 45 → "45 giây", 90 → "1 phút 30 giây" */
export function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  if (!m) return `${r} giây`;
  return r ? `${m} phút ${r} giây` : `${m} phút`;
}

/** Đồng hồ đếm lên (làm tròn xuống): 134000 → "2:14" */
export function fmtDur(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fmtAgo(now: number, ts: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s} giây`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút`;
  return `${Math.round(m / 60)} giờ`;
}

export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const monthKey = (ts: number) => dayKey(ts).slice(0, 7);

export function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Chủ nhật 23:59:59 của tuần hiện tại */
export function endOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay(); // 0 = CN
  const add = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + add);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function endOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** "20:00" -> phút trong ngày */
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function inWindow(ts: number, start: string, end: string): boolean {
  const d = new Date(ts);
  const cur = d.getHours() * 60 + d.getMinutes();
  const a = toMin(start);
  const b = toMin(end);
  return a <= b ? cur >= a && cur < b : cur >= a || cur < b;
}

/** Thời gian còn lại đến khi hết khung giờ (ms) */
export function windowRemaining(ts: number, end: string): number {
  const d = new Date(ts);
  const e = new Date(ts);
  const [h, m] = end.split(':').map(Number);
  e.setHours(h, m, 0, 0);
  if (e.getTime() < d.getTime()) e.setDate(e.getDate() + 1);
  return e.getTime() - d.getTime();
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

let uidCounter = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${(uidCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------------- Tên hiển thị ẩn danh ----------------
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Phan', 'Vũ'];
const CHU = 'ABCDĐGHKLMNPQSTVXY'.split('');
export function maskedName(): string {
  const r = Math.random();
  const c1 = pick(CHU);
  const c2 = pick(CHU);
  if (r < 0.35) return `${pick(HO)} ${c1}*** ${c2}**`;
  if (r < 0.7) return `Anh ${c1}***`;
  return `Chị ${c1}*** ${c2}***`;
}

export function maskFullName(name: string): string {
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  return [parts[0], ...parts.slice(1).map((p) => p[0] + '*'.repeat(Math.max(2, p.length - 1)))].join(' ');
}

// ---------------- SHA-256 (đồng bộ, dùng cho mã kiểm chứng) ----------------
export function sha256(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
    0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length;
  const withPad = Math.ceil((l + 9) / 64) * 64;
  const buf = new Uint8Array(withPad);
  buf.set(bytes);
  buf[l] = 0x80;
  const bitLen = l * 8;
  const view = new DataView(buf.buffer);
  view.setUint32(withPad - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(withPad - 4, bitLen >>> 0);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

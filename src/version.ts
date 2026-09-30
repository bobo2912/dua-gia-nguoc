// Thông tin phiên bản được Vite chèn lúc build (xem vite.config.ts)
declare const __BUILD__: { version: string; build: string; time: string };

export const APP_BUILD = __BUILD__;
export const versionLabel = (b = APP_BUILD) => `v${b.version} · ${b.build}`;

export type UpdateInfo = { version: string; build: string; time: string };

/**
 * Hỏi máy chủ file version.json mới nhất (không dùng bộ nhớ đệm).
 * Trả về thông tin bản mới nếu khác bản đang chạy, null nếu đang là bản mới nhất,
 * hoặc 'unavailable' nếu không kiểm tra được (ví dụ mở file trực tiếp trên máy).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null | 'unavailable'> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'unavailable';
    const latest = (await res.json()) as UpdateInfo;
    if (!latest.build) return 'unavailable';
    if (latest.build === APP_BUILD.build && latest.version === APP_BUILD.version) return null;
    // Máy chủ còn giữ version.json cũ hơn bản đang chạy (vừa deploy xong) thì không báo
    if (latest.time && APP_BUILD.time && latest.time <= APP_BUILD.time) return null;
    return latest;
  } catch {
    return 'unavailable';
  }
}

/** Tải lại app, ép trình duyệt lấy index.html mới */
export function applyUpdate(latest?: UpdateInfo) {
  const url = new URL(location.href);
  url.searchParams.set('v', latest?.build ?? String(Date.now()));
  location.replace(url.toString());
}

/**
 * Mở app mà phát hiện đang chạy bản cũ (do bộ nhớ đệm): tự tải bản mới, không cần bấm.
 * Mỗi bản chỉ tự tải 1 lần trong phiên để không bao giờ bị tải lại liên tục.
 * Trả về true nếu đã bắt đầu tải lại.
 */
export function autoUpdateOnce(latest: UpdateInfo): boolean {
  const key = 'dau-gia-auto-update';
  try {
    if (sessionStorage.getItem(key) === latest.build) return false;
    sessionStorage.setItem(key, latest.build);
  } catch {
    return false;
  }
  applyUpdate(latest);
  return true;
}

/**
 * iPhone mở app từ màn hình chính bằng địa chỉ gốc và hay giữ index.html cũ trong bộ nhớ đệm,
 * nên sau khi tắt hẳn app rồi mở lại vẫn chạy bản cũ. Khi bản mới đã chạy được:
 * - tải lại địa chỉ gốc với chế độ "reload" để ghi đè bản cũ trong bộ nhớ đệm
 * - bỏ tham số ?v=... khỏi thanh địa chỉ
 * - đăng ký service worker luôn lấy index.html mới cho những lần mở sau
 */
export function refreshLaunchCache() {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('v')) {
      url.searchParams.delete('v');
      history.replaceState(history.state, '', url.toString());
    }
  } catch {
    /* bỏ qua */
  }
  const base = new URL('./', location.href).toString();
  for (const u of [base, base + 'index.html']) fetch(u, { cache: 'reload' }).catch(() => undefined);
  try {
    navigator.serviceWorker?.register('./sw.js').catch(() => undefined);
  } catch {
    /* trình duyệt không hỗ trợ: bỏ qua */
  }
}

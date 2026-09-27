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
    return latest.build !== APP_BUILD.build || latest.version !== APP_BUILD.version ? latest : null;
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

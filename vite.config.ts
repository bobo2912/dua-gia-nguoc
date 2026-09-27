import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Xuất script dạng thường (không phải ES module) và đặt ở cuối <body>.
 * Nhờ vậy bản build chạy được cả khi mở file trực tiếp (file://),
 * trên GitHub Pages ở thư mục con, và trong các khung xem bị hạn chế.
 */
function classicScript(): Plugin {
  return {
    name: 'classic-script',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const scripts: string[] = [];
        html = html.replace(/<script type="module" crossorigin([^>]*)>([\s\S]*?)<\/script>/g, (_m, attrs: string, body: string) => {
          scripts.push(`<script${attrs}>${body}</script>`);
          return '';
        });
        return html.replace('</body>', `${scripts.join('\n')}\n</body>`);
      },
    },
  };
}

// ---------- Thông tin phiên bản ----------
// version: lấy từ package.json (tự tăng khi có thay đổi lớn)
// build: mã commit trên GitHub Actions (hoặc git ở máy), đổi sau mỗi lần đẩy code
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };
function commitId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}
const BUILD = { version: pkg.version, build: commitId(), time: new Date().toISOString() };

/** Ghi version.json cạnh index.html để app tự kiểm tra có bản mới hay không */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: mode === 'single' ? [react(), viteSingleFile(), classicScript()] : [react(), classicScript(), versionFile()],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
}));

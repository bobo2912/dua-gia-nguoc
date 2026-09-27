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

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile(), classicScript()] : [react(), classicScript()],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
}));

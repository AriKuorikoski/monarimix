import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// main.js is REAPER's stock web-remote helper, served by REAPER at runtime.
// Vite 5 rejects non-module <script> tags in the HTML entry, so we inject
// the tag back into the built HTML after Vite has processed it.
const injectRealerMainScript = {
  name: 'inject-reaper-main',
  transformIndexHtml(html) {
    return html.replace('</head>', '<script src="main.js"></script>\n</head>')
  },
}

export default defineConfig({
  plugins: [vue(), viteSingleFile(), injectRealerMainScript],
  build: {
    outDir: 'dist',
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'monarimix.html'),
    },
  },
})

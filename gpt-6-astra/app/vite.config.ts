import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Campaigns and the deterministic simulation run locally in the browser.
// The private release serves static assets; no application server or paid API.
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  server: {
    host: '127.0.0.1',
    watch: { useFsEvents: false, usePolling: true },
  },
  plugins: [vinext()],
});

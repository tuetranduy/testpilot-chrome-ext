import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import manifest from './manifest.config.ts'

const isE2E = Boolean(process.env.TESTPILOT_E2E_ORIGINS)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  server: {
    // CRXJS HMR server needs a fixed, predictable port for the extension to reach.
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      // CRXJS only auto-discovers entries referenced by known manifest keys
      // (side_panel, action, etc). The E2E harness page is only reachable via
      // web_accessible_resources, so it needs to be added as an explicit
      // entry to get bundled/transformed like a real page.
      input: isE2E ? { e2eHarness: 'src/sidepanel/e2e-harness.html' } : undefined,
    },
  },
})

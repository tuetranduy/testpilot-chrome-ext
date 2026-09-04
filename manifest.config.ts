import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

// Test-only escape hatch: pre-grants specific origins as host_permissions so an
// automated E2E run doesn't hit the native chrome.permissions.request() prompt,
// which no browser-automation tool can click through. Never set for real builds.
const e2eOrigins = process.env.TESTPILOT_E2E_ORIGINS?.split(',').filter(Boolean)

export default defineManifest({
    manifest_version: 3,
    name: 'TestPilot',
    version: pkg.version,
    description:
        'Scan web pages and Figma designs, generate configurable AI-assisted manual test cases, and fill forms with realistic test data.',
    icons: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
    },
    action: {
        default_icon: {
            16: 'icons/icon-16.png',
            32: 'icons/icon-32.png',
            48: 'icons/icon-48.png',
            128: 'icons/icon-128.png',
        },
    },
    background: {
        service_worker: 'src/background/index.ts',
        type: 'module',
    },
    side_panel: {
        default_path: 'src/sidepanel/index.html',
    },
    permissions: ['storage', 'unlimitedStorage', 'sidePanel', 'scripting', 'activeTab', 'tabs', 'debugger'],
    // Exact web, Figma API, preview, and provider origins are requested at
    // runtime rather than granted upfront.
    optional_host_permissions: ['*://*/*'],
    ...(e2eOrigins ? { host_permissions: e2eOrigins } : {}),
    // The side panel page is normally only servable via the native side panel
    // surface, not by direct navigation. Automation can't drive that native UI,
    // so the E2E build exposes an identical harness page as an ordinary
    // web-accessible page instead (loads the exact same React app/JS bundle).
    ...(e2eOrigins ? { web_accessible_resources: [{ resources: ['src/sidepanel/e2e-harness.html', 'assets/*'], matches: ['<all_urls>'] }] } : {}),
})

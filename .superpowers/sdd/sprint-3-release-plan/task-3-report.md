# Sprint 3 — Task 3 report

## Delivered

- Added `docs/documents.html`, a dedicated, semantic setup guide that retains the existing marketing typography, palette, spacing, focus treatment, header, and footer.
- Kept the existing `index.html` → `documents.html` navigation from Task 2 and added reciprocal Documents → Home navigation, plus an in-page setup table of contents.
- Documented the stable-release installation flow in four ordered steps: download the packaged ZIP, extract it to a permanent folder, open `chrome://extensions` and enable Developer mode, then use **Load unpacked** on the extracted folder.
- Added provider-specific setup for OpenAI, Gemini, Claude (Anthropic), and a local OpenAI-compatible server. The copy follows the real Settings labels: **Active provider**, provider API key, model, **Fetch available models**, **Test connection**, and **Save settings**.
- Added direct official destinations for OpenAI API keys, Google AI Studio API keys, Claude Platform API keys, Ollama OpenAI compatibility, and Figma personal access tokens. No external credential dashboard is reproduced or fabricated.
- Added Figma personal-token steps covering account Settings → Security, the least-privilege `file_content:read` scope, a maximum 90-day expiry, one-time copy handling, TestPilot’s **Figma connection** field, rotation, and recovery from expired/access-error responses.
- Added scoped responsive styles for a sticky desktop contents rail, mobile contents grid, ordered step cards, provider cards, callouts, accessible link/focus behavior inherited from the marketing system, and intrinsic-ratio product media.
- Added `src/marketing/documents.test.js` with six automated structure/content/link/media/secret-safety contracts.

## Test-first evidence

### RED

Before any page, styles, or media were created:

```text
npx vitest run src/marketing/documents.test.js
Test Files  1 failed (1)
Tests       5 failed | 1 passed (6)
```

The five expected failures were caused by the absent `docs/documents.html`: missing accessible page/navigation, install sequence, provider sections and official links, Figma guidance, and product screenshots. The secret-pattern guard passed against the empty page.

### GREEN

After implementing the smallest complete page and generating the local product screenshots:

```text
npx vitest run src/marketing/documents.test.js
Test Files  1 passed (1)
Tests       6 passed (6)
```

The focused marketing verification then passed 5 files / 15 tests, including the pre-existing layout, media, motion, and release contracts.

## Screenshot provenance and dimensions

Both committed images are real renders of the current product code, not mock external dashboards:

- `docs/assets/testpilot-scan-workspace.png` — rendered from `src/sidepanel/e2e-harness.html` → `preview.ts` → the current `App`, `ScanTab`, and shared UI components on the local Vite server. Captured with local Google Chrome at a 380 × 760 CSS viewport and 2× device scale. PNG dimensions: **760 × 1520**. SHA-256: `95a01edb441248508c0bee8265e486b5c3877f2165fad5c929826c07cb82398e`.
- `docs/assets/testpilot-settings-providers.png` — rendered from the same current local product harness, then switched through the real **Settings** tab. The preview uses `DEFAULT_SETTINGS`, so every credential field is empty and no key/token entered the capture. PNG dimensions: **1000 × 1346**. SHA-256: `e4b8588a1be65a6553634107d6749d7b8699565ae121ef71c899924e8408e938`.

Each `<img>` has descriptive product/action alt text, explicit matching `width` and `height`, `loading="lazy"`, `decoding="async"`, and responsive `width: 100%; height: auto; object-fit: contain` handling. The media contract reads each PNG header and verifies that the declared and intrinsic dimensions match.

Temporary Chrome-control harness scripts were stored under `/tmp/testpilot-docs-qa`, removed after capture, and never added to the repository.

## Link verification

Verified on 2026-09-03:

- Google AI Studio key link redirected to Google sign-in and returned 200.
- Claude Platform key link returned 200.
- Ollama OpenAI-compatibility documentation returned 200.
- Figma personal-access-token documentation returned 200.
- OpenAI’s direct API-key page is auth-protected: an unauthenticated HTTP request returned 403, while an independent primary-source fetch resolved the expected **OpenAI Platform** API-keys page.
- The required GitHub latest-release page resolved to the repository’s releases page with 200.

The direct stable asset URL currently returns 404 because the repository does not yet expose a GitHub “latest” release/artifact. The URL is intentionally the same release contract introduced in Task 2 and is expected to become live when the release workflow publishes `testpilot-chrome-extension.zip`.

## Visual QA

Because BrowserAct had no configured browser or API key and browser creation required separate authorization, the approved fallback was used: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` in headless mode against a local `python3 -m http.server` serving `docs/`.

- Desktop viewport: **1440 × 900**. Inspected the hero/install view, provider transition, and full Figma section.
- Mobile viewport: **390 × 844** using Chrome device metrics. Inspected the hero/navigation, AI provider section and real Settings image, and the Figma steps via a direct anchor render.
- Runtime audit at both sizes reported `document.documentElement.scrollWidth === innerWidth` (1440/1440 and 390/390), so no horizontal overflow was present.
- Both screenshots reported complete with their expected intrinsic dimensions once their sections entered the viewport. Lazy loading behaved as intended.
- Confirmed readable heading wraps, 44px-or-larger in-page navigation targets, single-column mobile provider/step cards, no clipped text, no distorted images, clear active Documents navigation, and visible hierarchy at each inspected section.
- QA screenshots and local server/browser sessions were temporary and are not committed.

## Verification

Fresh verification before commit:

```text
git diff --check
  exit 0

npx vitest run src/marketing/documents.test.js src/marketing/layout.test.js src/marketing/media.test.js src/marketing/motion.test.ts src/marketing/release-contract.test.js
  5 files / 15 tests passed

npm test
  27 files / 143 tests passed

npm run build
  production build passed (44 modules transformed)

npm run lint
  exit 0; one pre-existing no-unused-vars warning in
  .agents/skills/design-system/scripts/generate-tokens.cjs:148
```

## Self-review

- Re-read the Task 3 brief against the rendered page and test assertions. All requested install, provider, local endpoint, Figma scope/expiry, navigation, media, responsiveness, accessibility, and test-first items are represented.
- Verified there are exactly two scoped product screenshots, both generated from current local components with empty credential state; no provider dashboard imagery exists.
- The secret guard rejects realistic OpenAI, Gemini, Anthropic, and Figma token patterns. The page uses descriptive prose and the product’s local default endpoint rather than example real secrets.
- Heading order is sequential, setup procedures use ordered lists, figures include captions, the page has a skip link and labelled navigation, and the active page is exposed with `aria-current="page"`.
- Changes are limited to the new page, its two assets, scoped additions in `docs/styles.css`, the new contract test, and this report.

## Concerns

- The stable ZIP link will remain a user-visible 404 until the first GitHub latest release publishes the expected `testpilot-chrome-extension.zip` asset. This is an external release-state dependency, not a docs routing defect.
- The OpenAI API-key page rejects unauthenticated command-line probes with 403; signed-in browser users are the intended audience for that direct credential link.

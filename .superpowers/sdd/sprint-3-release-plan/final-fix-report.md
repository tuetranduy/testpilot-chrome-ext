# Final Fix Report

Review range: `ffda094..02245f6`

Date: 2026-09-04

## Fixes completed

1. **Structured-only web/Figma generation**
   - Web scans with viewport/full-page captures and Figma scans with previews now show an explicit warning when the selected model is text-only or has unknown vision capability.
   - The user can choose **Continue without images** for those structured scan types. Generation then uses only web elements or Figma nodes, builds the prompt from a scan with an empty image list, and omits the provider image-options argument entirely.
   - Uploaded-image scans remain blocked because they have no structured content to fall back to.
   - Consent is bound to the exact scan object, source, active provider, and model, so a scan, provider, or model change invalidates it automatically.

2. **Revocable exact-model vision overrides**
   - The manual capability checkbox remains visible whenever the current model has an exact saved override, even though that override makes the computed capability `vision`.
   - Unchecking and saving removes the persisted override.

3. **Figma token guidance**
   - The README now states that a personal access token inherits the user's existing file access and that `file_content:read` limits which API endpoints the token can use.
   - It also states that TestPilot stores the raw token locally in `chrome.storage.local`; only the password input's on-screen presentation is masked. The homepage privacy copy uses the same accurate wording.

4. **Homepage primary-navigation targets**
   - Primary navigation links have a 24px minimum target at baseline and a 44px minimum target at mobile widths.
   - The homepage header wraps its navigation below the brand at 360px and narrower. Existing Documents-page target and reflow rules remain scoped and intact.
   - A DOM/CSS contract verifies both homepage links, baseline/mobile sizes, and narrow reflow.

## TDD evidence

| Finding | RED observed before implementation | GREEN after implementation |
| --- | --- | --- |
| Structured-only fallback | `npm test -- src/sidepanel/tabs/ScanTab.test.tsx` — 3 new tests failed and 21 passed; the accessible **Continue without images** control was absent. | Same command — 1 file, 24 tests passed. The cases exercise structured web and Figma scan fixtures with provider images omitted, consent invalidation, and image-only blocking. |
| Revocable vision override | `npm test -- src/sidepanel/tabs/SettingsTab.test.tsx` — 1 new test failed and 6 passed; the exact-model checkbox disappeared and could not be queried. | Same command — 1 file, 7 tests passed, including checkbox persistence and saved override removal. |
| Homepage target contract | `npm test -- src/marketing/release-contract.test.js` — 1 new test failed and 5 passed because `.header-link` had no `inline-flex`/minimum-target rule. | `npm test -- src/marketing/release-contract.test.js src/marketing/documents.test.js` — 2 files, 13 tests passed. |
| Combined targeted regression | — | `npm test -- src/sidepanel/tabs/ScanTab.test.tsx src/sidepanel/tabs/SettingsTab.test.tsx src/marketing/release-contract.test.js src/marketing/documents.test.js` — 4 files, 44 tests passed. |

## Headless homepage visual QA

Chrome `152.0.7977.76` was run headlessly against a local server. Screenshots at each viewport were inspected as well as Chrome DevTools Protocol layout measurements.

| Viewport | Documents target | View on GitHub target | Document width | Header result |
| --- | ---: | ---: | ---: | --- |
| 320 × 844 | 74.89 × 44px | 109.34 × 44px | client 320px / scroll 320px | Navigation reflows to a 288 × 44px second row; both links remain inside the 16px page gutters. |
| 390 × 844 | 74.89 × 44px | 109.34 × 44px | client 390px / scroll 390px | Single-row 68px header; brand and both links remain separated and unclipped. |
| 1440 × 1000 | 78.03 × 24px | 118.23 × 24px | client 1440px / scroll 1440px | Single-row 76px header with balanced desktop spacing. |

All three viewports reported `scrollWidth === clientWidth` and no horizontal overflow. The 320px, 390px, and desktop captures showed no clipped navigation, overlap, or unexpected reflow.

## Final verification

- `npm test` — 27 files, 150 tests passed.
- `npm run lint` — passed; the repository's existing unused-variable warning remains in `.agents/skills/design-system/scripts/generate-tokens.cjs`.
- `npm run build` — TypeScript project build and Vite production build passed.
- `git diff --check` — passed with no whitespace errors.

## Concerns

None. The structured-only choice is intentionally per scan/provider/model and is not persisted across those context changes.

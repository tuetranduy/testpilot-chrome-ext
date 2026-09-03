# Task 1 report

## Status

DONE

## Implemented

- Added `marketing/scene.mjs` with the approved five-beat `TIMELINE` and all four `PRESETS`.
- Added deterministic `frameCount()`, bounded `clamp()`, cubic `easeOut()`, and pure `renderMarketingFrame()` exports.
- Added SVG scene rendering for the tilted Figma checkout source card, TestPilot workspace scan/generate/fill beats, and deep-green TestPilot promise end card.
- Added responsive safe-area framing with stacked logical cards for square and vertical canvases.
- Added `marketing/scene.test.mjs` covering timeline continuity, approved preset metadata, deterministic frame counts, and representative story copy/lockup.

## Verification

- `npx vitest run marketing/scene.test.mjs` — 1 test file, 4 tests passed.
- `npx oxlint marketing/scene.mjs marketing/scene.test.mjs` — passed with no reported diagnostics.
- `git diff --check` — passed.
- Direct SVG contract check confirmed complete SVG output with requested `width`, `height`, and `viewBox` for a 1080×1920 canvas.

## Decisions and concerns

The brief did not contain an ambiguity requiring a deviation from the approved spec. The implementation uses the specified 1920×1080 logical design space and applies a uniform centered scale; narrow canvases use the specified stacked layout mode to keep the headline and active card within the centered safe region.

The pre-existing `package-lock.json` modification was left untouched and is not part of the Task 1 commit.

## Review fix

### Issue addressed

The original narrow branch still rendered the 1920×1080 composition inside a uniform centered scale. Square and vertical outputs now use an explicit stacked renderer in canvas coordinates, with ordered headline, active card, and supporting/progress sections. Card entrance motion is vertical, so the narrow composition remains horizontally contained while entering.

### TDD evidence

Added a regression test covering both 1080×1080 and 1080×1920 frames. Before the implementation fix:

```text
npx vitest run marketing/scene.test.mjs
1 failed, 4 passed
Expected: data-layout="stacked"
Received: 1080×1920 frame with the old translate(...)/scale(0.56) letterboxed layout
```

### Verification after fix

```text
$ npx vitest run marketing/scene.test.mjs
Test Files  1 passed (1)
Tests  5 passed (5)

$ npx oxlint marketing/scene.mjs marketing/scene.test.mjs
passed with no reported diagnostics

$ git diff --check
passed
```

The report and fix are committed together with the updated scene and focused regression test.

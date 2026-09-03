# TestPilot Marketing Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic SVG-based marketing composition and render the approved TestPilot storyboard into 16:9, 1:1, and 9:16 MP4/GIF deliverables.

**Architecture:** A small, dependency-free scene module owns the semantic timeline, easing, layout, and SVG frame rendering. A Node CLI rasterizes those frames through ImageMagick and encodes them through FFmpeg, with named presets sharing the same five-beat story. Tests validate the scene contract and generated SVG content without requiring a browser or external service.

**Tech Stack:** Node.js 22 built-ins (`node:test`, `node:fs`, `node:path`, `node:child_process`), SVG, ImageMagick `convert`, FFmpeg `ffmpeg`/`ffprobe`.

**Spec:** `docs/superpowers/specs/2026-09-03-testpilot-marketing-video-design.md`

## Global Constraints

- Use the approved five-beat timeline: source 0.0–2.0s, scan 2.0–4.0s, generate 4.0–6.0s, fill 6.0–9.0s, promise/CTA 9.0–12.0s.
- Use the approved visual tokens: paper `#f5f7f2`, deep green `#123f34`, mint `#a9e8c3`, orange `#f2784b`, muted green-gray copy.
- Keep the composition silent-first and ensure the final frame works as a static poster.
- Produce 16:9 MP4 master at 1920×1080, 30fps, 12 seconds, H.264.
- Produce a 16:9 GIF preview at 960×540 and square/vertical MP4 cutdowns at 1080×1080 and 1080×1920.
- Keep all editable source and render tooling under `marketing/`; keep generated exports under `marketing/exports/`.
- Do not add runtime dependencies; fail with an actionable message when ImageMagick or FFmpeg is missing.

## File Map

- Create `marketing/scene.mjs`: semantic timeline, color/type tokens, easing helpers, preset definitions, and pure `renderMarketingFrame()` SVG renderer.
- Create `marketing/scene.test.mjs`: unit tests for timeline ordering, preset dimensions, interpolation, and required copy/lockup in representative SVG frames.
- Create `marketing/render.mjs`: CLI that renders numbered PNG frames into a temporary directory, encodes MP4/GIF outputs, and cleans temporary files unless `--keep-frames` is passed.
- Create `marketing/render.test.mjs`: CLI-level dry-run and argument validation tests using injected command runners; no media binaries required for the unit test suite.
- Create `marketing/README.md`: local prerequisites, render commands, output inventory, and how to revise copy/timing safely.
- Modify `package.json`: add `marketing:render` and `marketing:test` scripts.
- Create `marketing/exports/`: generated MP4/GIF deliverables after the final render; these are output artifacts, not source code.

### Task 1: Define the scene model and SVG renderer

**Files:**
- Create: `marketing/scene.mjs`
- Test: `marketing/scene.test.mjs`

**Interfaces:**
- Produces `TIMELINE`, `PRESETS`, `frameCount(preset)`, `renderMarketingFrame({ time, width, height })`, `clamp(value, min, max)`, and `easeOut(value)`.
- `renderMarketingFrame()` returns a complete SVG string with `width`, `height`, and a `viewBox` matching the requested canvas.

- [ ] **Step 1: Write failing tests for the scene contract**

```js
import { describe, expect, test } from 'vitest'
import { TIMELINE, PRESETS, frameCount, renderMarketingFrame } from './scene.mjs'

describe('marketing scene', () => {
  test('timeline is ordered and covers the full 12 second edit', () => {
    expect(TIMELINE[0].start).toBe(0)
    expect(TIMELINE.at(-1).end).toBe(12)
    expect(TIMELINE.every((beat, index) => index === 0 || beat.start === TIMELINE[index - 1].end)).toBe(true)
  })

  test('presets expose the approved dimensions and frame rate', () => {
    expect(PRESETS.master).toMatchObject({ width: 1920, height: 1080, fps: 30, duration: 12 })
    expect(PRESETS.gif).toMatchObject({ width: 960, height: 540, fps: 15, duration: 12 })
    expect(PRESETS.square).toMatchObject({ width: 1080, height: 1080, fps: 30, duration: 12 })
    expect(PRESETS.vertical).toMatchObject({ width: 1080, height: 1920, fps: 30, duration: 12 })
  })

  test('frame count is deterministic', () => {
    expect(frameCount(PRESETS.master)).toBe(360)
    expect(frameCount(PRESETS.gif)).toBe(180)
  })

  test('representative frames contain the approved story copy and lockup', () => {
    const opening = renderMarketingFrame({ time: 1, width: 1920, height: 1080 })
    const middle = renderMarketingFrame({ time: 7.5, width: 1920, height: 1080 })
    const ending = renderMarketingFrame({ time: 10.5, width: 1920, height: 1080 })
    expect(opening).toContain('From design to live page.')
    expect(middle).toContain('Fill realistic data.')
    expect(middle).toContain('Scan')
    expect(ending).toContain('Sharper first drafts.')
    expect(ending).toContain('TestPilot')
  })
})
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npx vitest run marketing/scene.test.mjs`

Expected: FAIL because `marketing/scene.mjs` does not exist yet.

- [ ] **Step 3: Implement the scene model and renderer**

Define the exact scene data:

```js
export const TIMELINE = [
  { id: 'source', start: 0, end: 2, label: 'From design to live page.' },
  { id: 'scan', start: 2, end: 4, label: 'Scan the UI.' },
  { id: 'generate', start: 4, end: 6, label: 'Generate exact coverage.' },
  { id: 'fill', start: 6, end: 9, label: 'Fill realistic data.' },
  { id: 'promise', start: 9, end: 12, label: 'Sharper first drafts.' },
]
```

Implement `renderMarketingFrame({ time, width, height })` as a pure function. Use a 1920×1080 design coordinate system scaled uniformly into each requested canvas, with a centered safe area of 88% width and 82% height. Render the source beat as a tilted Figma checkout card; transition it into a deep-green TestPilot workspace; render scan, generate, and fill as distinct colored cards with the exact captions and UI details from the spec; render the promise beat as a deep-green end card with the TestPilot mark, “Sharper first drafts.”, and “AI-assisted manual QA.” Use SVG text and simple vector shapes only so the final frame stays crisp and static-poster-safe.

Use `easeOut()` for card entrances and `clamp()` for progress. For square and vertical canvases, keep the headline and active UI card inside the safe area and stack cards vertically rather than allowing horizontal content to clip.

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run: `npx vitest run marketing/scene.test.mjs`

Expected: PASS with all scene tests green.

- [ ] **Step 5: Commit the scene module**

```bash
git add marketing/scene.mjs marketing/scene.test.mjs
git commit -m "feat: add TestPilot marketing scene renderer"
```

### Task 2: Add deterministic media rendering CLI

**Files:**
- Create: `marketing/render.mjs`
- Test: `marketing/render.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `parseArgs(argv)`, `renderPreset(presetName, options)`, and CLI entry behavior from `node marketing/render.mjs`.
- `renderPreset()` accepts `{ presetName, outputDir, keepFrames = false, runCommand = defaultRunCommand }` and returns `{ presetName, outputPath, frameCount, width, height, fps, duration }`.

- [ ] **Step 1: Write failing tests for CLI parsing and dry-run commands**

```js
import { describe, expect, test } from 'vitest'
import { parseArgs, buildEncodeCommands } from './render.mjs'

describe('marketing render CLI', () => {
  test('defaults to the master MP4 and GIF preview', () => {
    expect(parseArgs([]).presets).toEqual(['master', 'gif'])
  })

  test('accepts a preset, output directory, and retained-frame flag', () => {
    expect(parseArgs(['--preset', 'square', '--output-dir', '/tmp/out', '--keep-frames']))
      .toMatchObject({ presets: ['square'], outputDir: '/tmp/out', keepFrames: true })
  })

  test('builds the correct MP4 and GIF encoding commands', () => {
    expect(buildEncodeCommands('master', { width: 1920, height: 1080, fps: 30 }, '/tmp/frames', '/tmp/out'))
      .toEqual(expect.arrayContaining([
        expect.arrayContaining(['ffmpeg', '-framerate', '30']),
        expect.arrayContaining(['ffmpeg', '-framerate', '30', '-i']),
      ]))
  })
})
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npx vitest run marketing/render.test.mjs`

Expected: FAIL because `marketing/render.mjs` does not exist yet.

- [ ] **Step 3: Implement the renderer CLI**

Implement these command-line behaviors:

```text
node marketing/render.mjs
node marketing/render.mjs --preset master
node marketing/render.mjs --preset gif --output-dir marketing/exports
node marketing/render.mjs --preset all --keep-frames
```

For each selected preset, create a temporary `<outputDir>/.frames/<preset>` directory, write one SVG per frame from `renderMarketingFrame()`, rasterize each SVG to a PNG using `convert -background none input.svg output.png`, and encode:

```text
ffmpeg -y -framerate <fps> -i frame-%04d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart <preset>.mp4
ffmpeg -y -framerate <fps> -i frame-%04d.png -vf "fps=<fps>,scale=<width>:<height>:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" palette.png
ffmpeg -y -framerate <fps> -i frame-%04d.png -i palette.png -lavfi "fps=<fps>,scale=<width>:<height>:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" -loop 0 <preset>.gif
```

Use a GIF-specific output only for the `gif` preset; the square and vertical presets produce MP4 only. The default CLI render produces the master MP4 and GIF preview; explicit `--preset all` produces all four outputs. Check `command -v convert` and `command -v ffmpeg` before rendering and exit with the exact missing command name plus installation guidance. Clean the frame directory on success unless `--keep-frames` is set. Keep `runCommand` injectable so tests can inspect commands without invoking binaries.

- [ ] **Step 4: Add package scripts**

Update `package.json` with:

```json
{
  "scripts": {
    "marketing:render": "node marketing/render.mjs",
    "marketing:test": "vitest run marketing/scene.test.mjs marketing/render.test.mjs"
  }
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm run marketing:test`

Expected: PASS with all scene and CLI tests green.

- [ ] **Step 6: Commit the renderer**

```bash
git add marketing/render.mjs marketing/render.test.mjs package.json
git commit -m "feat: add marketing video render pipeline"
```

### Task 3: Document and render the approved deliverables

**Files:**
- Create: `marketing/README.md`
- Create: `marketing/exports/testpilot-marketing-master.mp4`
- Create: `marketing/exports/testpilot-marketing-preview.gif`
- Create: `marketing/exports/testpilot-marketing-square.mp4`
- Create: `marketing/exports/testpilot-marketing-vertical.mp4`

**Interfaces:**
- Consumes: `marketing/scene.mjs` and `marketing/render.mjs` from Tasks 1–2.
- Produces: four user-facing media files plus repeatable local render instructions.

- [ ] **Step 1: Write the usage documentation**

Document prerequisites, that the default render command produces the master MP4 and GIF preview, that explicit `--preset all` produces all four deliverables, individual preset commands, output dimensions, the five-beat timeline, and the safe way to revise copy/timing: edit `TIMELINE` or renderer scene data, run `npm run marketing:test`, then rerun `npm run marketing:render -- --preset all`.

- [ ] **Step 2: Render all outputs**

Run: `npm run marketing:render -- --preset all --output-dir marketing/exports`

Expected: the command writes the four files listed above and prints their dimensions, duration, and output paths.

- [ ] **Step 3: Verify media metadata**

Run:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of json marketing/exports/testpilot-marketing-master.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of json marketing/exports/testpilot-marketing-square.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of json marketing/exports/testpilot-marketing-vertical.mp4
identify marketing/exports/testpilot-marketing-preview.gif
```

Expected: master is H.264 at 1920×1080/30fps/12s; square is 1080×1080/30fps/12s; vertical is 1080×1920/30fps/12s; GIF is 960×540 and 12s.

- [ ] **Step 4: Review representative frames**

Extract frames:

```bash
ffmpeg -y -ss 1 -i marketing/exports/testpilot-marketing-master.mp4 -frames:v 1 /tmp/testpilot-opening.png
ffmpeg -y -ss 7.5 -i marketing/exports/testpilot-marketing-master.mp4 -frames:v 1 /tmp/testpilot-middle.png
ffmpeg -y -ss 10.5 -i marketing/exports/testpilot-marketing-master.mp4 -frames:v 1 /tmp/testpilot-ending.png
```

Inspect the three PNGs for: no clipping, readable captions, correct palette, clear Figma-to-QA transition, visible scan/generate/fill beats, and a legible final TestPilot lockup. If a frame fails, adjust the pure SVG renderer and repeat Tasks 2–3 verification.

- [ ] **Step 5: Run the full project test suite**

Run: `npm test`

Expected: existing project tests plus the new marketing tests pass.

- [ ] **Step 6: Commit source, docs, and exports**

```bash
git add marketing/ marketing/exports/
git commit -m "feat: deliver TestPilot marketing video assets"
```

## Self-review checklist

- The plan covers all five timeline beats, all four requested output variants, silent-first usage, editable source, and static-poster-safe ending.
- Every task names exact files, interfaces, commands, and expected outcomes.
- Tests are written before implementation and do not require media binaries; rendering verification uses `ffprobe`, ImageMagick, and extracted representative frames.
- No implementation dependency beyond tools already confirmed in the workspace is introduced.

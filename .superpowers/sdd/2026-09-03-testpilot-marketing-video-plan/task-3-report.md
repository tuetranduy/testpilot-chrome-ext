# Task 3 implementation report

## Status

DONE

## Commit

- `1b515ff` — `feat: deliver TestPilot marketing video assets`

## Delivered files

- `marketing/README.md`
- `marketing/exports/testpilot-marketing-master.mp4`
- `marketing/exports/testpilot-marketing-preview.gif`
- `marketing/exports/testpilot-marketing-square.mp4`
- `marketing/exports/testpilot-marketing-vertical.mp4`

The README documents Node.js, FFmpeg, and ImageMagick prerequisites; the default and individual preset commands; output dimensions, rates, and duration; the five-beat timeline; silent-first/static-poster-safe use; and the safe copy/timing revision flow (`TIMELINE` or scene data, `npm run marketing:test`, then `npm run marketing:render`). It also documents `TESTPILOT_MARKETING_FONT` for systems without a font in the renderer's standard lookup paths.

## Render and source corrections

Executed:

```bash
npm run marketing:render -- --output-dir marketing/exports
```

The first render exposed two real issues and both were corrected in source before the final rerender:

1. Homebrew ImageMagick 7 had no named-font registry, causing frame 0 to fail with `unable to read font`. A failing regression test was added, then `marketing/render.mjs` was updated to pass an explicit installed TTF/TTC file to ImageMagick. The renderer checks `TESTPILOT_MARKETING_FONT` first and then common macOS, Linux, and Windows font paths.
2. Visual inspection showed the wide opening Figma card clipped off the left side because ImageMagick's built-in SVG parser misapplied its compound centered-rotation transform. A failing transform-compatibility regression was added, then the unsupported tilt was removed. All four outputs were rerendered.

ImageMagick 7 prints a deprecation warning for the Task 2 pipeline's legacy `convert` entry point, but conversion succeeds and the final media is unaffected.

## Media verification

The required `ffprobe` commands reported:

| Export | Codec | Dimensions | Frame rate | Duration |
| --- | --- | --- | --- | --- |
| Master MP4 | H.264 | 1920×1080 | 30/1 fps | 12.000000s |
| Square MP4 | H.264 | 1080×1080 | 30/1 fps | 12.000000s |
| Vertical MP4 | H.264 | 1080×1920 | 30/1 fps | 12.000000s |

`identify marketing/exports/testpilot-marketing-preview.gif` confirmed a 960×540 GIF canvas. It contains 180 frames with 1,200 centiseconds total delay (12.00s). GIF subframes are delta-optimized, so later frame rectangles are narrower while retaining the required 960×540 logical canvas.

Additional stream checks confirmed that each MP4 contains only a video stream, preserving silent-first delivery.

## Visual verification

Extracted and inspected the required master frames at 1.0s, 7.5s, and 10.5s. The final rerender has:

- No clipping in the opening Figma card.
- Readable approved captions and UI copy.
- The approved paper, deep-green, mint, and orange palette.
- A clear transition from the Figma checkout mockup to the TestPilot QA workspace.
- Visible scan, generate, and fill navigation/beat cues.
- A legible, static-poster-safe final TestPilot lockup.

Also extracted opening, middle, and ending frames from the square and vertical exports and inspected them as a contact sheet. Both alternate layouts remain within their canvases and preserve readable hierarchy, active-card content, navigation, progress, and ending lockups.

## Tests

Final full-suite command:

```bash
npm test
```

Result: 20 test files passed; 89 tests passed; 0 failures.

The two new regressions were each observed failing for the intended reason before implementation and passing afterward.

## Self-review

- Five contiguous timeline beats remain covered from 0–12 seconds.
- All four requested variants are present and metadata-verified.
- Silent-first output and the poster-safe ending are preserved.
- Source remains editable through `TIMELINE` and renderer scene data.
- Tests do not require media binaries; media validation was performed separately with FFmpeg, ffprobe, ImageMagick, and extracted frames.
- No implementation dependency was added to the project manifest or lockfile.
- The pre-existing unstaged `package-lock.json` change was not staged or committed.
- No subagents or reviewers were dispatched.

## Concerns

None. The ImageMagick 7 `convert` deprecation warning is noisy but does not affect correctness or media quality.

---

## Final-review fix addendum

### Scope completed

- Replaced the clipped compound source-card rotation with a single ImageMagick-compatible `skewY(-2)` editorial tilt and added a linear, visibly crossfaded source-to-workspace handoff from 1.7s through 2.3s.
- Made Generate display every deterministic count from `1 of 10 scenarios` through `10 of 10 scenarios` over its beat.
- Kept the selected-field checklist, including two selected and one unselected state, in both square and vertical Fill layouts.
- Replaced direct GIF encoding with deterministic FFmpeg `palettegen` followed by `paletteuse` with rectangle differencing.
- Applied the binding CLI default: no preset renders master MP4 plus GIF preview; explicit `--preset all` renders master, GIF, square, and vertical.

### Commands and results

```bash
npm run marketing:test
npm run marketing:render -- --preset all --output-dir marketing/exports
npm test
```

The marketing suite passed 17 tests. The full suite passed 20 test files and 91 tests with zero failures. The all-preset render completed successfully and regenerated all four exports.

Fresh media checks used:

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,duration -of json marketing/exports/testpilot-marketing-master.mp4
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,duration -of json marketing/exports/testpilot-marketing-square.mp4
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,duration -of json marketing/exports/testpilot-marketing-vertical.mp4
identify -format '%m %wx%h %n frames\\n' marketing/exports/testpilot-marketing-preview.gif
```

Master, square, and vertical are video-only H.264 exports at 1920×1080, 1080×1080, and 1080×1920 respectively; each is 30fps and 12.000000s. The GIF has a 960×540 logical canvas and 180 frames. The palette GIF is 743 KB, materially below the previous ~30 MB output.

Representative opening, Generate, Fill, ending, and 2.1s handoff frames were freshly extracted from the master; opening, Generate, Fill, and ending frames were freshly extracted from square and vertical. Visual inspection confirmed the contained source tilt, visible source/workspace handoff, readable captions, selected checklist states, narrow stacking, approved palette, and poster-safe ending.

### Concern

ImageMagick 7 emits one legacy-`convert` deprecation warning per frame. It did not affect rasterization, encoding, metadata, or output quality.

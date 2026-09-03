# TestPilot marketing video

This directory contains the editable SVG scene renderer and the repeatable export pipeline for TestPilot's 12-second, silent-first marketing video. The final frame is a static-poster-safe TestPilot lockup, so the master can end cleanly without narration or an audio track.

## Prerequisites

- Node.js and the project dependencies (`npm install` from the repository root)
- FFmpeg, with `ffmpeg` and `ffprobe` available on `PATH`
- ImageMagick, with the legacy `convert` command and `identify` available on `PATH`

On macOS with Homebrew, install the media tools with:

```bash
brew install ffmpeg imagemagick
```

The renderer automatically uses a common system font file for reliable ImageMagick rasterization. If those standard paths are unavailable, set `TESTPILOT_MARKETING_FONT` to an installed `.ttf` or `.ttc` file before rendering.

## Render the deliverables

From the repository root, render all four approved outputs with:

```bash
npm run marketing:render -- --preset all --output-dir marketing/exports
```

The default command renders the 16:9 master MP4 and GIF preview. Use `--preset all` for all four deliverables, or render one preset at a time:

```bash
npm run marketing:render -- --preset master --output-dir marketing/exports
npm run marketing:render -- --preset gif --output-dir marketing/exports
npm run marketing:render -- --preset square --output-dir marketing/exports
npm run marketing:render -- --preset vertical --output-dir marketing/exports
```

| Preset | Output | Dimensions | Frame rate | Duration |
| --- | --- | ---: | ---: | ---: |
| `master` | `testpilot-marketing-master.mp4` | 1920×1080 | 30 fps | 12s |
| `gif` | `testpilot-marketing-preview.gif` | 960×540 | 15 fps | 12s |
| `square` | `testpilot-marketing-square.mp4` | 1080×1080 | 30 fps | 12s |
| `vertical` | `testpilot-marketing-vertical.mp4` | 1080×1920 | 30 fps | 12s |

Pass `--keep-frames` to retain the intermediate SVG and PNG frames under the output directory's `.frames/` folder for debugging.

## Timeline

The edit uses five contiguous beats:

| Time | Beat | On-screen copy |
| --- | --- | --- |
| 0–2s | Source | From design to live page. |
| 2–4s | Scan | Scan the UI. |
| 4–6s | Generate | Generate exact coverage. |
| 6–9s | Fill | Fill realistic data. |
| 9–12s | Promise | Sharper first drafts. |

## Revise copy or timing safely

Edit `TIMELINE` in `marketing/scene.mjs` for beat labels and boundaries. For other visual copy or scene behavior, edit the renderer scene data in the same file. Keep the timeline contiguous and ending at 12 seconds unless the approved duration and preset metadata are intentionally revised together.

After every copy or timing change, run the marketing tests before regenerating exports:

```bash
npm run marketing:test
npm run marketing:render -- --preset all --output-dir marketing/exports
```

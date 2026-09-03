# TestPilot marketing video design

## Objective

Create a reusable, silent-first marketing composition for TestPilot that can
serve three surfaces: a landing-page hero, a social launch post, and a
Product Hunt/GitHub promotion. The creative should combine the approved
story spines: “from design to live page” and “scan → generate → fill.”

## Creative direction

Use an editorial-to-product transition. Begin with a Figma checkout frame (or
live-page equivalent) as the source material. Transform that frame into a
focused QA workspace, then move through the three product verbs with crisp,
legible UI cards. End on the promise “Sharper first drafts.” and the lockup
“TestPilot · AI-assisted manual QA.”

The visual system follows the existing marketing site: paper background
(`#f5f7f2`), deep green (`#123f34`), mint (`#a9e8c3`), orange (`#f2784b`),
muted green-gray copy, rounded editorial cards, and Space Grotesk / DM Sans
style typography. Motion should feel intentional and tactile: panels slide or
snap into place, progress advances in short beats, and the final lockup holds
long enough to read.

## Master timeline

| Time | Beat | On-screen copy | Motion |
| --- | --- | --- | --- |
| 0.0–2.0s | Source | “From design to live page.” | Figma/live-page card enters with a slight editorial tilt |
| 2.0–4.0s | Scan | “Scan the UI.” | Source card resolves into the TestPilot workspace |
| 4.0–6.0s | Generate | “Generate exact coverage.” | Reviewable case count rises to “10 of 10 scenarios” |
| 6.0–9.0s | Fill | “Fill realistic data.” | Field checklist checks only the selected fields |
| 9.0–12.0s | Promise / CTA | “Sharper first drafts.” | Deep-green end card settles and holds |

## Deliverables

- 16:9 MP4 master, 1920×1080, 30fps, 12 seconds, H.264.
- 16:9 GIF preview, 960×540, 12 seconds, optimized for hero embeds and
  previews.
- 1:1 MP4 cutdown, 1080×1080, with typography and UI reflowed for square
  framing.
- 9:16 MP4 cutdown, 1080×1920, with the same five-beat story stacked for
  mobile social placements.
- Editable source composition so copy, timing, or colors can be updated
  without rebuilding the concept from scratch.

## Technical approach

Keep the source self-contained in `marketing/` and render deterministic frames
from an SVG-based composition. A small Node renderer will generate one SVG per
frame using the timeline above; FFmpeg will encode MP4 and GIF variants. This
keeps output reproducible in the repo, avoids dependence on a live browser
session, and makes the design easy to inspect or adapt.

The composition will provide a `render` command that accepts an output
directory and optional format/size preset. The default render produces the
master MP4 and GIF; square and vertical presets reuse the same semantic scene
data while changing the canvas and layout constraints.

## Accessibility and usage

The primary message must remain understandable without audio. Captions use
high-contrast colors and minimum readable sizes appropriate to each canvas.
The landing page should prefer the MP4 for quality and use the GIF only where
autoplay video is unavailable. The final frame must work as a static poster.

## Verification

Verify that all requested files render successfully, that MP4/GIF dimensions,
duration, frame rate, and codecs match the presets, and that the final frame
contains the TestPilot lockup and CTA. Review representative frames from the
opening, middle, and final beats for clipping, contrast, and legibility.

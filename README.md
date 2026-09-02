# TestPilot

AI-assisted Chrome extension for manual QA: scan any page's UI, generate manual
test cases from requirements/acceptance criteria, and fill forms with
AI-generated test data.

## Features

- **Scan & Tests** — scan the current tab's interactive elements (inputs,
  selects, buttons, links) plus a screenshot, attach requirements/acceptance
  criteria (paste or upload `.txt`/`.md`), and generate manual test cases in
  plain-steps or Gherkin format. Export to Markdown or CSV.
- **Fill Data** — generate realistic AI test data for the scanned form fields
  (respecting type/pattern/required/maxLength/options) and fill the whole form
  or one field at a time.
- **History** — per-site history of scans and generated test cases, stored
  locally.
- **Settings** — configure OpenAI, Gemini, Anthropic (Claude), or a local
  OpenAI-compatible LLM (Ollama, LM Studio, etc). API keys are stored only in
  `chrome.storage.local` and are never synced.

Host access is requested per-site the first time you scan it (no `<all_urls>`
permission upfront).

## Development

```bash
npm install
npm run dev     # builds to dist/ in watch mode
npm run build   # production build
npm test        # vitest unit tests
npm run lint    # oxlint
```

## Load the extension in Chrome

1. Run `npm run build` (or `npm run dev` for a watch build).
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. Open the side panel via the extension's toolbar icon, then configure an AI
   provider under **Settings**.

## Project layout

- `src/background` — minimal service worker (opens the side panel).
- `src/content` — self-contained scan/fill functions injected on demand via
  `chrome.scripting.executeScript` (no static `content_scripts`).
- `src/sidepanel` — the React UI (tabs: Scan & Tests, Fill Data, History, Settings).
- `src/lib` — storage, permissions, AI provider adapters, and prompt templates.
- `design-system/testpilot` — generated design tokens (colors, typography, spacing).

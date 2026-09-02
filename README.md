# TestPilot

AI-assisted Chrome extension for manual QA. Scan a live web page or a Figma
Design, add requirements, generate an exact number of reviewable test cases,
and fill selected form fields with realistic test data.

## Features

- **Web and Figma scanning** — keep the existing live-page DOM and screenshot
  scan, or import a page, frame, section, or component from a Figma Design.
- **Configurable generation** — request exactly 5, 10, 15, or 20 cases, or
  choose a custom count from 1 through 50. Output can use plain steps or
  Gherkin.
- **Selective form filling** — generate data for every field in a live web
  scan, then choose which fields to fill. Individual Fill buttons remain
  available.
- **Portable exports** — download Markdown and CSV suites, or one combined
  `.feature` file when every current case contains Gherkin.
- **Source-aware history** — web and Figma runs are stored locally and labelled
  with their source, display name, and URL.
- **Provider settings** — configure OpenAI, Gemini, Anthropic (Claude), or a
  local OpenAI-compatible LLM such as Ollama or LM Studio.

Provider keys, the Figma token, scans, generated cases, and field values are
stored only in `chrome.storage.local`; they are never synced. TestPilot asks for
exact host access at runtime instead of requesting broad access upfront.

## Scan a web page

1. Open the page to test and launch TestPilot's side panel.
2. In **Scan & Tests**, select **Web page** and choose **Scan current page**.
3. Grant access to that page's origin when Chrome prompts.
4. Add optional requirements, select a format and count, then generate cases.

The scan captures visible interactive elements and a screenshot. **Fill Data**
is available only for a live web scan: generate values, choose **Choose fields**,
select the desired fields, and fill them. A failed fill keeps the selection so
it can be retried.

## Scan a Figma Design

### Create a token

1. In Figma, open account settings and create a personal access token.
2. Grant the token the `file_content:read` scope and access to the files you
   intend to scan.
3. In TestPilot **Settings**, paste the token under **Figma connection** and
   save settings. The masked token is stored locally in `chrome.storage.local`.

Figma personal access tokens may expire after at most 90 days. If TestPilot
reports an expired token or a 403 response, create a replacement token with
`file_content:read`, update Settings, and retry.

### Import a design

1. In **Scan & Tests**, select **Figma**. If the active tab is a Figma Design,
   its URL is prefilled; otherwise paste a Design URL.
2. Choose **Load designs**, then select a page or one of its top-level frames,
   sections, or components.
3. Choose **Scan design**. TestPilot imports a compact structured summary and
   requests a PNG preview. If preview retrieval fails, structured generation
   remains available with a warning.
4. Add requirements and generate the requested cases.

This release supports Figma Design files only. FigJam, Slides, and Buzz links
are rejected with guidance. Figma scans generate test cases; they do not fill
web forms or map layers to a live implementation. No OAuth service, backend, or
companion Figma plugin is used.

See Figma's official documentation for
[REST authentication](https://developers.figma.com/docs/rest-api/authentication/),
[personal access tokens](https://developers.figma.com/docs/rest-api/personal-access-tokens/),
and [file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/).

## Generate and export test cases

The default count is 10. Presets provide 5, 10, 15, and 20; **Custom** accepts
an integer from 1 through 50. TestPilot requests cases in batches of at most 10,
deduplicates titles, retries incomplete batches, and replaces the saved suite
only after the exact count succeeds.

Markdown and CSV are always available for generated suites. To create a Gherkin
file, select **Gherkin** and generate the complete suite. **Feature file** then
downloads one UTF-8, filesystem-safe `.feature` document with a `Feature`
heading and one `Scenario` per case. If any case lacks Gherkin, TestPilot asks
you to regenerate the suite in Gherkin format first.

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
4. Open the side panel from the extension toolbar icon, then configure an AI
   provider under **Settings**.

## Project layout

- `src/background` — minimal service worker that opens the side panel.
- `src/content` — scan/fill functions injected on demand with
  `chrome.scripting.executeScript`.
- `src/sidepanel` — React UI for Scan & Tests, Fill Data, History, and Settings.
- `src/lib` — Figma/web normalization, storage, permissions, generation,
  exports, provider adapters, and prompt templates.
- `docs` — the GitHub Pages site. The existing workflow deploys this directory
  after changes merge to `main`.
- `design-system/testpilot` — generated design tokens.

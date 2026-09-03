# Task 1 report — tagged extension releases

## Files changed

- `.github/workflows/release.yml` — adds the `v*` tag-triggered release workflow.
- `release.workflow.test.ts` — contract test covering the workflow’s build, validation, packaging, permissions, and release-asset contracts.

## TDD evidence

- Red: `npm test -- release.workflow.test.ts` failed because `.github/workflows/release.yml` did not exist (`ENOENT`).
- Green: `npm test -- release.workflow.test.ts` passed (`1` test, `1` passed).

## Verification

- `npm run lint` completed with one pre-existing warning in `.agents/skills/design-system/scripts/generate-tokens.cjs:148` (`value` is unused).
- `npm run build` passed and emitted `dist/manifest.json`.
- `npm test` passed (`25` test files, `132` tests).
- `git diff --check` passed.

## Self-review

The workflow uses `actions/checkout@v4`, `actions/setup-node@v4` with npm caching, `npm ci`, test/lint/build gates, explicit Manifest V3/name validation, and `zip` from inside `dist` so `manifest.json` is at the ZIP root. It grants only `contents: write` and publishes `testpilot-chrome-extension.zip` with `softprops/action-gh-release@v2`.

## Concerns

- GitHub-hosted runner availability and third-party action behavior cannot be exercised locally.
- The existing unrelated lint warning remains; it does not originate from this task.

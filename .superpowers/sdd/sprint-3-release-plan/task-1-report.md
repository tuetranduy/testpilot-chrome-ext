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

## Fix round 2

- Added an exact contract assertion for `manifest.name.length === 0`, protecting the built manifest’s non-empty-name validation.
- Red evidence: temporarily removed the empty-name guard from the workflow; `npm test -- release.workflow.test.ts` failed on the missing `/manifest\\.name\\.length === 0/` assertion.
- Green evidence: restored the guard; `npm test -- release.workflow.test.ts` passed (`1` test, `1` passed).
- `git diff --check` passed.

## Self-review

The workflow uses `actions/checkout@v4`, `actions/setup-node@v4` with npm caching, `npm ci`, test/lint/build gates, explicit Manifest V3/name validation, and `zip` from inside `dist` so `manifest.json` is at the ZIP root. It grants only `contents: write` and publishes `testpilot-chrome-extension.zip` with `softprops/action-gh-release@v2`.

## Concerns

- GitHub-hosted runner availability and third-party action behavior cannot be exercised locally.
- The existing unrelated lint warning remains; it does not originate from this task.

## Fix round 1

- Strengthened `release.workflow.test.ts` to assert the `softprops/action-gh-release@v2` action, its exact ZIP asset, Manifest V3 and non-empty name checks, and the required install → test → lint → build → manifest validation → package → publish ordering.
- Removed the trailing whitespace flagged in the original contract test.
- Red evidence: temporarily changed the workflow to validate Manifest V2 and publish `extension.zip`; the strengthened contract failed on the missing Manifest V3 assertion.
- Green evidence: restored the workflow; `npm test -- release.workflow.test.ts` passed (`1` test, `1` passed).
- `git diff --check` passed.

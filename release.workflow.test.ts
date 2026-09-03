import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(resolve('.github/workflows/release.yml'), 'utf8')

describe('tagged release workflow', () => {
  it('builds and publishes the extension package from v tags', () => {
    expect(workflow).toMatch(/on:\s*\n\s+push:\s*\n\s+tags:\s*\n\s+- ['"]?v\*['"]?/)
    expect(workflow).toMatch(/npm ci/)
    expect(workflow).toMatch(/npm test/)
    expect(workflow).toMatch(/npm run lint/)
    expect(workflow).toMatch(/npm run build/)
    expect(workflow).toMatch(/test -f dist\/manifest\.json/)
    expect(workflow).toMatch(/manifest\.manifest_version !== 3/)
    expect(workflow).toMatch(/typeof manifest\.name !== 'string'/)
    expect(workflow).toMatch(/cd dist && zip -r \.\.\/testpilot-chrome-extension\.zip \./)
    expect(workflow).toMatch(/contents:\s*write/)
    expect(workflow).toMatch(/uses: softprops\/action-gh-release@v2/)
    expect(workflow).toMatch(/files: testpilot-chrome-extension\.zip/)

    const stepOrder = [
      'run: npm ci',
      'run: npm test',
      'run: npm run lint',
      'run: npm run build',
      'test -f dist/manifest.json',
      'run: cd dist && zip -r ../testpilot-chrome-extension.zip .',
      'uses: softprops/action-gh-release@v2',
    ].map((step) => workflow.indexOf(step))

    expect(stepOrder.every((index) => index >= 0)).toBe(true)
    expect(stepOrder).toEqual([...stepOrder].sort((a, b) => a - b))
  })
})

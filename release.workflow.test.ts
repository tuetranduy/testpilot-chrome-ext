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
    expect(workflow).toMatch(/cd dist && zip -r \.\.\/testpilot-chrome-extension\.zip \./)
    expect(workflow).toMatch(/contents:\s*write/)
    expect(workflow).toMatch(/testpilot-chrome-extension\.zip/)
  })
})

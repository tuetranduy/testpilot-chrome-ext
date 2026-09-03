import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const latestDownload = 'https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest/download/testpilot-chrome-extension.zip'
const latestRelease = 'https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest'
const marketing = readFileSync('docs/index.html', 'utf8')
const readme = readFileSync('README.md', 'utf8')

describe('latest release marketing contract', () => {
  test('offers the packaged release as the primary hero CTA and links to release notes', () => {
    const page = document.createElement('div')
    page.innerHTML = marketing

    const primaryAction = page.querySelector('.hero-actions .button-primary')
    expect(primaryAction?.getAttribute('href')).toBe(latestDownload)
    expect(primaryAction?.textContent).toContain('Download')
    expect(page.querySelector(`a[href="${latestRelease}"]`)).not.toBeNull()
  })

  test('keeps a visible native link to the forthcoming documents page', () => {
    const page = document.createElement('div')
    page.innerHTML = marketing

    expect(page.querySelector('a[href="documents.html"]')?.textContent).toContain('Documents')
  })

  test('explains image uploads, optional full-page context, and vision requirements', () => {
    expect(marketing).toMatch(/upload(?:ed)? image/i)
    expect(marketing).toMatch(/full-page/i)
    expect(marketing).toMatch(/vision-capable/i)
  })

  test('guides end users through downloading, extracting, and loading the packaged release', () => {
    expect(readme).toContain(latestDownload)
    expect(readme).toMatch(/download/i)
    expect(readme).toMatch(/extract/i)
    expect(readme).toMatch(/load unpacked/i)
    expect(readme).toMatch(/vision-capable/i)
  })
})

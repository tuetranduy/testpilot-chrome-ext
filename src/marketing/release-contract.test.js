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

    const documentsLink = page.querySelector('header .header-nav[aria-label="Primary navigation"] a.header-link[href="documents.html"]')
    expect(documentsLink?.textContent).toContain('Documents')
  })

  test('explains image uploads, optional full-page context, and vision requirements', () => {
    expect(marketing).toMatch(/upload(?:ed)? image/i)
    expect(marketing).toMatch(/full-page/i)
    expect(marketing).toMatch(/vision-capable/i)
  })

  test('keeps search and social descriptions aligned with image and vision features', () => {
    const page = document.createElement('div')
    page.innerHTML = marketing

    const descriptions = [
      page.querySelector('meta[name="description"]')?.getAttribute('content'),
      page.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    ]

    for (const description of descriptions) {
      expect(description).toMatch(/image/i)
      expect(description).toMatch(/full-page/i)
      expect(description).toMatch(/vision-capable/i)
    }
  })

  test('guides end users through downloading, extracting, and loading the packaged release', () => {
    const normalizedReadme = readme.replace(/\s+/g, ' ')

    expect(readme).toContain(latestDownload)
    expect(readme).toMatch(/download/i)
    expect(readme).toMatch(/extract/i)
    expect(readme).toMatch(/load unpacked/i)
    expect(readme).toMatch(/vision-capable/i)
    expect(normalizedReadme).toMatch(/live web page, uploaded image, or a Figma Design/i)
    expect(normalizedReadme).toMatch(/web, image, and Figma runs/i)
  })
})

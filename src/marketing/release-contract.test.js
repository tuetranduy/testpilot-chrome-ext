import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const latestDownload = 'https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest/download/testpilot-chrome-extension.zip'
const latestRelease = 'https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest'
const measurementId = 'G-J3J0LYEWEC'
const marketing = readFileSync('docs/index.html', 'utf8')
const documents = readFileSync('docs/documents.html', 'utf8')
const marketingStyles = readFileSync('docs/styles.css', 'utf8')
const readme = readFileSync('README.md', 'utf8')

describe('latest release marketing contract', () => {
  test.each([
    ['homepage', marketing],
    ['documents page', documents],
  ])('loads GA4 on the %s and identifies every release download CTA', (_pageName, markup) => {
    const page = document.createElement('div')
    page.innerHTML = markup

    const googleTag = page.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`)
    const analyticsModule = page.querySelector('script[type="module"][src="analytics.js"]')
    const downloadLinks = Array.from(page.querySelectorAll(`a[href="${latestDownload}"]`))

    expect(googleTag?.hasAttribute('async')).toBe(true)
    expect(analyticsModule).not.toBeNull()
    expect(existsSync('docs/analytics.js')).toBe(true)
    expect(downloadLinks.length).toBeGreaterThan(0)
    expect(downloadLinks.every((link) => Boolean(link.getAttribute('data-analytics-location')))).toBe(true)
  })

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

  test('gives every homepage primary navigation link a 24px target and a 44px mobile target with narrow reflow', () => {
    const page = document.createElement('div')
    page.innerHTML = marketing
    const navigationLinks = page.querySelectorAll('header nav[aria-label="Primary navigation"] > a.header-link')
    expect(navigationLinks).toHaveLength(2)

    const style = document.createElement('style')
    style.textContent = marketingStyles
    document.head.append(style)
    const baseRules = Array.from(style.sheet?.cssRules ?? []).filter((rule) => rule.type === 1)
    const baseHeaderLinkRule = baseRules.find((rule) => rule.selectorText === '.header-link')
    expect(baseHeaderLinkRule?.style.display).toBe('inline-flex')
    expect(baseHeaderLinkRule?.style.alignItems).toBe('center')
    expect(baseHeaderLinkRule?.style.minHeight).toBe('24px')

    const mobileRules = Array.from(style.sheet?.cssRules ?? [])
      .filter((rule) => rule.type === 4 && rule.conditionText === '(max-width:560px)')
      .flatMap((mediaRule) => Array.from(mediaRule.cssRules))
    const mobileHeaderLinkRule = mobileRules.find((rule) => rule.selectorText === '.header-link')
    expect(mobileHeaderLinkRule?.style.minHeight).toBe('44px')
    expect(mobileHeaderLinkRule?.style.minWidth).toBe('44px')

    const narrowRules = Array.from(style.sheet?.cssRules ?? [])
      .filter((rule) => rule.type === 4 && rule.conditionText === '(max-width:360px)')
      .flatMap((mediaRule) => Array.from(mediaRule.cssRules))
    expect(narrowRules.find((rule) => rule.selectorText === '.site-header')?.style.flexWrap).toBe('wrap')
    expect(narrowRules.find((rule) => rule.selectorText === '.header-nav')?.style.flexBasis).toBe('100%')
    style.remove()
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

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const documentsPath = path.resolve('docs/documents.html')
const documentsMarkup = existsSync(documentsPath) ? readFileSync(documentsPath, 'utf8') : ''
const marketingMarkup = readFileSync('docs/index.html', 'utf8')
const docsRoot = path.resolve('docs')

const latestDownload = 'https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest/download/testpilot-chrome-extension.zip'
const officialCredentialLinks = {
  openai: 'https://platform.openai.com/api-keys',
  gemini: 'https://aistudio.google.com/app/apikey',
  anthropic: 'https://platform.claude.com/settings/keys',
  local: 'https://docs.ollama.com/api/openai-compatibility',
  figma: 'https://developers.figma.com/docs/rest-api/personal-access-tokens/',
}

function parsePage(markup) {
  const page = document.createElement('div')
  page.innerHTML = markup
  return page
}

describe('onboarding documents page', () => {
  test('exists with accessible document structure and reciprocal navigation', () => {
    expect(existsSync(documentsPath)).toBe(true)

    const page = parsePage(documentsMarkup)
    expect(page.querySelector('title')?.textContent).toMatch(/Documents.*TestPilot|TestPilot.*Documents/i)
    expect(page.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('width=device-width')
    expect(page.querySelector('a.skip-link[href="#main-content"]')).not.toBeNull()
    expect(page.querySelector('main#main-content h1')?.textContent).toMatch(/set up testpilot/i)
    expect(page.querySelector('header nav[aria-label="Primary navigation"] a[href="index.html"]')?.textContent).toMatch(/home/i)

    const marketing = parsePage(marketingMarkup)
    expect(marketing.querySelector('header nav[aria-label="Primary navigation"] a[href="documents.html"]')?.textContent).toContain('Documents')
  })

  test('gives the stable release installation steps in order', () => {
    const page = parsePage(documentsMarkup)
    const steps = Array.from(page.querySelectorAll('ol[data-install-steps] > li')).map((item) => item.textContent?.replace(/\s+/g, ' ').trim())

    expect(page.querySelector(`a[href="${latestDownload}"]`)).not.toBeNull()
    expect(steps).toHaveLength(4)
    expect(steps[0]).toMatch(/download.*latest stable.*ZIP/i)
    expect(steps[1]).toMatch(/extract.*permanent folder/i)
    expect(steps[2]).toMatch(/chrome:\/\/extensions.*Developer mode/i)
    expect(steps[3]).toMatch(/Load unpacked.*extracted folder/i)
  })

  test('links directly to official AI credential pages and mirrors the Settings workflow', () => {
    const page = parsePage(documentsMarkup)

    for (const [provider, href] of Object.entries(officialCredentialLinks).filter(([provider]) => provider !== 'figma')) {
      const section = page.querySelector(`[data-provider="${provider}"]`)
      expect(section, `${provider} instructions`).not.toBeNull()
      expect(section?.querySelector(`a[href="${href}"]`), `${provider} official link`).not.toBeNull()
      expect(section?.textContent).toMatch(/model/i)
      expect(section?.textContent).toMatch(/Test connection/i)
    }

    expect(page.querySelector('[data-provider="openai"]')?.textContent).toMatch(/OpenAI API key/i)
    expect(page.querySelector('[data-provider="gemini"]')?.textContent).toMatch(/Gemini API key/i)
    expect(page.querySelector('[data-provider="anthropic"]')?.textContent).toMatch(/Claude \(Anthropic\) API key/i)
    expect(page.querySelector('[data-provider="local"]')?.textContent).toMatch(/Local LLM base URL/i)
    expect(page.querySelector('[data-provider="local"]')?.textContent).toContain('http://localhost:11434/v1')
    expect(documentsMarkup).toMatch(/Settings[\s\S]*Active provider[\s\S]*Fetch available models[\s\S]*Test connection[\s\S]*Save settings/i)
  })

  test('explains Figma token scope, expiry, secure handling, and configuration', () => {
    const page = parsePage(documentsMarkup)
    const figma = page.querySelector('#figma-token')

    expect(figma).not.toBeNull()
    expect(figma?.querySelector(`a[href="${officialCredentialLinks.figma}"]`)).not.toBeNull()
    expect(figma?.textContent).toContain('file_content:read')
    expect(figma?.textContent).toMatch(/expir/i)
    expect(figma?.textContent).toMatch(/90 days/i)
    expect(figma?.textContent).toMatch(/Figma connection/i)
    expect(figma?.textContent).toMatch(/Save settings/i)
    expect(documentsMarkup).toMatch(/never.*(?:publish|share|commit)|(?:publish|share|commit).*never/i)
  })

  test('uses real local product screenshots with useful alternatives and reserved space', () => {
    const page = parsePage(documentsMarkup)
    const images = Array.from(page.querySelectorAll('img[data-product-screenshot]'))

    expect(images).toHaveLength(2)
    for (const image of images) {
      const source = image.getAttribute('src') ?? ''
      const alt = image.getAttribute('alt') ?? ''
      const width = Number(image.getAttribute('width'))
      const height = Number(image.getAttribute('height'))

      expect(source).toMatch(/^assets\/testpilot-.+\.png$/)
      expect(existsSync(path.join(docsRoot, source))).toBe(true)
      expect(alt.length).toBeGreaterThan(30)
      expect(alt).toMatch(/TestPilot/i)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(image.getAttribute('loading')).toBe('lazy')
      expect(image.getAttribute('decoding')).toBe('async')

      if (existsSync(path.join(docsRoot, source))) {
        const png = readFileSync(path.join(docsRoot, source))
        expect(png.subarray(1, 4).toString()).toBe('PNG')
        expect(png.readUInt32BE(16)).toBe(width)
        expect(png.readUInt32BE(20)).toBe(height)
      }
    }
  })

  test('contains no realistic provider or Figma secrets', () => {
    expect(documentsMarkup).not.toMatch(/\bsk-[A-Za-z0-9_-]{20,}\b/)
    expect(documentsMarkup).not.toMatch(/\bAIza[A-Za-z0-9_-]{20,}\b/)
    expect(documentsMarkup).not.toMatch(/\bsk-ant-[A-Za-z0-9_-]{20,}\b/)
    expect(documentsMarkup).not.toMatch(/\bfigd_[A-Za-z0-9_-]{20,}\b/)
  })
})

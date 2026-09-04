import { afterEach, describe, expect, test, vi } from 'vitest'

describe('marketing analytics', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-marketing-site')
    document.body.innerHTML = ''
    delete (globalThis as typeof globalThis & { gtag?: unknown }).gtag
    vi.restoreAllMocks()
  })

  test('provides an initializer for download tracking', async () => {
    const analytics = await import('../../docs/analytics.js')

    expect(analytics.initMarketingAnalytics).toBeTypeOf('function')
  })

  test('records a release download with its URL, file name, and CTA location', async () => {
    const { initMarketingAnalytics } = await import('../../docs/analytics.js')
    const root = document.createElement('main')
    root.innerHTML = `
      <a href="https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest/download/testpilot-chrome-extension.zip" data-analytics-location="hero">
        Download TestPilot <span>↓</span>
      </a>
    `
    const events: unknown[][] = []
    const track = (...args: unknown[]) => events.push(args)

    initMarketingAnalytics(root, track)
    root.querySelector('a')?.addEventListener('click', (event) => event.preventDefault())
    root.querySelector('span')?.click()

    expect(events).toEqual([[
      'event',
      'release_download',
      {
        file_name: 'testpilot-chrome-extension.zip',
        link_location: 'hero',
        link_url: 'https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest/download/testpilot-chrome-extension.zip',
      },
    ]])
  })

  test('automatically enables download tracking on a marketing page', async () => {
    document.documentElement.setAttribute('data-marketing-site', '')
    document.body.innerHTML = `
      <a href="https://github.com/tuetranduy/testpilot-chrome-ext/releases/latest/download/testpilot-chrome-extension.zip" data-analytics-location="documents-install">
        Download TestPilot
      </a>
    `
    const events: unknown[][] = []
    const browserGlobal = globalThis as typeof globalThis & { gtag?: (...args: unknown[]) => void }
    browserGlobal.gtag = (...args: unknown[]) => events.push(args)
    document.querySelector('a')?.addEventListener('click', (event) => event.preventDefault())
    vi.resetModules()

    await import('../../docs/analytics.js')
    document.querySelector('a')?.click()

    expect(events).toHaveLength(1)
  })
})

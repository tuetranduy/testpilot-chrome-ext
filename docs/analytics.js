/**
 * Records clicks on release download links without delaying navigation.
 *
 * @param {Document | HTMLElement} root
 * @param {((command: string, eventName: string, params: Record<string, string>) => void) | undefined} track
 */
export function initMarketingAnalytics(root = document, track = globalThis.gtag) {
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || typeof track !== 'function') return

    const link = event.target.closest('a[data-analytics-location]')
    if (!link || !root.contains(link)) return

    const url = new URL(link.href)
    track('event', 'release_download', {
      file_name: url.pathname.split('/').at(-1) ?? '',
      link_location: link.getAttribute('data-analytics-location') ?? '',
      link_url: url.toString(),
    })
  })
}

if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-marketing-site')) {
  initMarketingAnalytics(document)
}

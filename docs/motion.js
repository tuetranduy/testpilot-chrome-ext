const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Reveals editorial sections as they enter the viewport while keeping the page
 * readable when motion is reduced or IntersectionObserver is unavailable.
 *
 * @param {Document} root
 * @param {{ prefersReducedMotion?: boolean, IntersectionObserverClass?: typeof IntersectionObserver }} options
 * @returns {IntersectionObserver | null}
 */
export function initMarketingMotion(root = document, options = {}) {
  const targets = Array.from(root.querySelectorAll('[data-reveal]'))
  const prefersReducedMotion = options.prefersReducedMotion
    ?? globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches
    ?? false
  const Observer = options.IntersectionObserverClass ?? globalThis.IntersectionObserver

  if (prefersReducedMotion || typeof Observer !== 'function') {
    targets.forEach((target) => target.classList.add('is-visible'))
    return null
  }

  root.documentElement.classList.add('motion-ready')
  const observer = new Observer((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.12,
  })

  targets.forEach((target) => observer.observe(target))
  return observer
}

if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-marketing-site')) {
  initMarketingMotion(document)
}

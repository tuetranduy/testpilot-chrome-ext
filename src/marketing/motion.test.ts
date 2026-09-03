import { afterEach, describe, expect, test, vi } from 'vitest'
import { initMarketingMotion } from '../../docs/motion.js'

describe('marketing motion', () => {
  afterEach(() => {
    document.documentElement.className = ''
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  test('reveals observed content once it enters the viewport', async () => {
    document.body.innerHTML = '<section data-reveal></section><section data-reveal></section>'
    const observed: Element[] = []
    const unobserved: Element[] = []
    let notify: IntersectionObserverCallback = () => undefined

    class TestIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }

      observe(element: Element) {
        observed.push(element)
      }

      unobserve(element: Element) {
        unobserved.push(element)
      }

      disconnect() {}
    }

    initMarketingMotion(document, {
      prefersReducedMotion: false,
      IntersectionObserverClass: TestIntersectionObserver as unknown as typeof IntersectionObserver,
    })

    const targets = Array.from(document.querySelectorAll('[data-reveal]'))
    expect(document.documentElement.classList.contains('motion-ready')).toBe(true)
    expect(observed).toEqual(targets)

    notify([
      { target: targets[0], isIntersecting: true } as IntersectionObserverEntry,
      { target: targets[1], isIntersecting: false } as IntersectionObserverEntry,
    ], {} as IntersectionObserver)

    expect(targets[0].classList.contains('is-visible')).toBe(true)
    expect(targets[1].classList.contains('is-visible')).toBe(false)
    expect(unobserved).toEqual([targets[0]])
  })

  test('shows all content immediately when reduced motion is preferred', async () => {
    document.body.innerHTML = '<section data-reveal></section><section data-reveal></section>'
    const Observer = vi.fn()

    const result = initMarketingMotion(document, {
      prefersReducedMotion: true,
      IntersectionObserverClass: Observer as unknown as typeof IntersectionObserver,
    })

    expect(result).toBeNull()
    expect(Observer).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains('motion-ready')).toBe(false)
    expect(document.querySelectorAll('[data-reveal].is-visible')).toHaveLength(2)
  })
})

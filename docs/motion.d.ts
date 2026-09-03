export type MarketingMotionOptions = {
  prefersReducedMotion?: boolean
  IntersectionObserverClass?: typeof IntersectionObserver
}

export function initMarketingMotion(
  root?: Document,
  options?: MarketingMotionOptions,
): IntersectionObserver | null

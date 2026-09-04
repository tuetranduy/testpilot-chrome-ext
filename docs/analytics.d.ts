export type MarketingAnalyticsTracker = (
  command: string,
  eventName: string,
  params: Record<string, string>,
) => void

export function initMarketingAnalytics(
  root?: Document | HTMLElement,
  track?: MarketingAnalyticsTracker,
): void

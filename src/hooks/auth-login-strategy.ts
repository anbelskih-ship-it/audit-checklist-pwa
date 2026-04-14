export type LoginStrategy = 'popup' | 'redirect'

export function getLoginStrategy(userAgent: string): LoginStrategy {
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'popup'
  if (/android/i.test(userAgent)) return 'redirect'
  return 'popup'
}

export type LoginStrategy = 'popup' | 'redirect'

export function getLoginStrategy(userAgent: string): LoginStrategy {
  if (/telegram|telegrambot|fbav|instagram|line|wv/i.test(userAgent)) return 'redirect'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'popup'
  if (/android/i.test(userAgent)) return 'popup'
  return 'popup'
}

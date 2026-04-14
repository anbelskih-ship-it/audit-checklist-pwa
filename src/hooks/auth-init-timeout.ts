export function getAuthInitTimeoutMs(userAgent: string): number {
  return /iphone|ipad|ipod/i.test(userAgent) ? 4000 : 8000
}

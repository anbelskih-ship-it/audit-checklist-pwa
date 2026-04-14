export type InstallPromptMode = 'prompt' | 'ios' | 'android' | 'none'

export function getInstallPromptMode({
  hasDeferredPrompt,
  isIos,
  isAndroid,
  isStandalone,
}: {
  hasDeferredPrompt: boolean
  isIos: boolean
  isAndroid: boolean
  isStandalone: boolean
}): InstallPromptMode {
  if (isStandalone) return 'none'
  if (hasDeferredPrompt) return 'prompt'
  if (isIos) return 'ios'
  if (isAndroid) return 'android'
  return 'none'
}

export function detectIos(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent)
}

export function detectAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent)
}

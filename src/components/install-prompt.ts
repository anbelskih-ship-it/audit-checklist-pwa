export type InstallPromptMode = 'prompt' | 'ios' | 'none'

export function getInstallPromptMode({
  hasDeferredPrompt,
  isIos,
  isStandalone,
}: {
  hasDeferredPrompt: boolean
  isIos: boolean
  isStandalone: boolean
}): InstallPromptMode {
  if (isStandalone) return 'none'
  if (hasDeferredPrompt) return 'prompt'
  if (isIos) return 'ios'
  return 'none'
}

export function detectIos(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent)
}

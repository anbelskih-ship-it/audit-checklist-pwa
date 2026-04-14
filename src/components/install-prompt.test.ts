import { describe, expect, it } from 'vitest'
import { getInstallPromptMode } from './install-prompt'

describe('getInstallPromptMode', () => {
  it('returns prompt when native install prompt is available', () => {
    expect(getInstallPromptMode({
      hasDeferredPrompt: true,
      isIos: false,
      isStandalone: false,
    })).toBe('prompt')
  })

  it('returns ios when on iPhone/iPad without standalone mode', () => {
    expect(getInstallPromptMode({
      hasDeferredPrompt: false,
      isIos: true,
      isAndroid: false,
      isStandalone: false,
    })).toBe('ios')
  })

  it('returns android when on Android without native prompt', () => {
    expect(getInstallPromptMode({
      hasDeferredPrompt: false,
      isIos: false,
      isAndroid: true,
      isStandalone: false,
    })).toBe('android')
  })

  it('returns none when app is already installed', () => {
    expect(getInstallPromptMode({
      hasDeferredPrompt: true,
      isIos: true,
      isAndroid: true,
      isStandalone: true,
    })).toBe('none')
  })

  it('returns none when install prompt is unavailable on non-iOS', () => {
    expect(getInstallPromptMode({
      hasDeferredPrompt: false,
      isIos: false,
      isAndroid: false,
      isStandalone: false,
    })).toBe('none')
  })
})

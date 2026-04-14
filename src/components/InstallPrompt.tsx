import { useEffect, useMemo, useState } from 'react'
import { detectAndroid, detectIos, getInstallPromptMode } from './install-prompt'

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as DeferredPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  const isIos = useMemo(() => detectIos(window.navigator.userAgent), [])
  const isAndroid = useMemo(() => detectAndroid(window.navigator.userAgent), [])
  const isStandalone = useMemo(() => {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  }, [])

  const mode = getInstallPromptMode({
    hasDeferredPrompt: !!deferredPrompt,
    isIos,
    isAndroid,
    isStandalone,
  })

  if (dismissed || mode === 'none') return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice.catch(() => null)
    setDeferredPrompt(null)
  }

  return (
    <div className="install-card">
      {mode === 'prompt' ? (
        <>
          <div className="install-card__title">Установить приложение</div>
          <div className="install-card__text">
            Добавьте аудит в виде отдельного приложения на главный экран.
          </div>
          <div className="btn-group">
            <button className="btn-primary flex-1" onClick={handleInstall}>Установить</button>
            <button className="flex-1" onClick={() => setDismissed(true)}>Позже</button>
          </div>
        </>
      ) : mode === 'ios' ? (
        <>
          <div className="install-card__title">Установить на iPhone</div>
          <div className="install-card__text">
            Откройте меню Поделиться в Safari и выберите «На экран Домой».
          </div>
          <button className="btn-full" onClick={() => setDismissed(true)}>Понятно</button>
        </>
      ) : (
        <>
          <div className="install-card__title">Установить на Android</div>
          <div className="install-card__text">
            Откройте страницу во внешнем браузере Chrome или Samsung Internet, затем выберите
            в меню «Установить приложение» или «Добавить на главный экран».
          </div>
          <button className="btn-full" onClick={() => setDismissed(true)}>Понятно</button>
        </>
      )}
    </div>
  )
}

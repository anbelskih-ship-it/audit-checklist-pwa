import { useRegisterSW } from 'virtual:pwa-register/react'

export default function RefreshAppButton() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  const handleRefresh = async () => {
    if (needRefresh) {
      await updateServiceWorker(true)
      return
    }
    window.location.reload()
  }

  return (
    <button className="header-link-btn" aria-label="Обновить приложение" onClick={() => void handleRefresh()}>
      <span className="header-link-btn__icon">↻</span>
      <span>Обновить</span>
    </button>
  )
}

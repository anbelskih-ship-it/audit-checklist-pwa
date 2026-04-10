import { useRegisterSW } from 'virtual:pwa-register/react'

export default function VersionToast() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="version-toast">
      <span>Доступна новая версия</span>
      <button className="version-toast-btn" onClick={() => updateServiceWorker(true)}>
        Обновить
      </button>
    </div>
  )
}

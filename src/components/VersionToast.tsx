import { useRegisterSW } from 'virtual:pwa-register/react'

export default function VersionToast() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div style={{
      position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
      background: '#333', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14,
      display: 'flex', gap: 12, alignItems: 'center', zIndex: 200,
    }}>
      <span>Доступна новая версия</span>
      <button onClick={() => updateServiceWorker(true)} style={{ background: '#4caf50', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>
        Обновить
      </button>
    </div>
  )
}

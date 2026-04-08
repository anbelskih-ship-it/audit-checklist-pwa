import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import AuditListPage from './pages/AuditListPage'
import AuditOutlinePage from './pages/AuditOutlinePage'
import ItemFillPage from './pages/ItemFillPage'
import AuditViewPage from './pages/AuditViewPage'
import LoginPage from './pages/LoginPage'
import SyncStatus from './components/SyncStatus'
import VersionToast from './components/VersionToast'
import { configureMasterFiles, syncStructures } from './drive/sync'

configureMasterFiles({
  asp_file_id: '1ZMhcAhr1zFLI5PXASAKWj7FolxI84dz27U9zMPHP-3I',
  na_file_id: '1EB3P4ILwfggCafPNwO-Vc5gZ4JjVVwFKDgQy-2t5WU8',
})

export default function App() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (navigator.onLine) {
      syncStructures().then(({ updated }) => {
        if (updated.length > 0) console.log('Synced structures:', updated)
      })
    }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', color: '#999' }}>
        Загрузка...
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AuditListPage />} />
        <Route path="/audit/:auditId" element={<AuditOutlinePage />} />
        <Route path="/audit/:auditId/fill/:itemId" element={<ItemFillPage />} />
        <Route path="/audit/:auditId/view" element={<AuditViewPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <SyncStatus />
      <VersionToast />
    </HashRouter>
  )
}

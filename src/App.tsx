import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AuditListPage from './pages/AuditListPage'
import AuditOutlinePage from './pages/AuditOutlinePage'
import ItemFillPage from './pages/ItemFillPage'
import AuditViewPage from './pages/AuditViewPage'
import LoginPage from './pages/LoginPage'
import SyncStatus from './components/SyncStatus'
import VersionToast from './components/VersionToast'
import { configureMasterFiles, syncStructures } from './drive/sync'
import { getStoredTokens } from './drive/auth'

configureMasterFiles({
  asp_file_id: '1ZMhcAhr1zFLI5PXASAKWj7FolxI84dz27U9zMPHP-3I',
  na_file_id: '1EB3P4ILwfggCafPNwO-Vc5gZ4JjVVwFKDgQy-2t5WU8',
})

export default function App() {
  useEffect(() => {
    if (navigator.onLine && getStoredTokens()) {
      syncStructures().then(({ updated }) => {
        if (updated.length > 0) console.log('Synced structures:', updated)
      })
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuditListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/audit/:auditId" element={<AuditOutlinePage />} />
        <Route path="/audit/:auditId/fill/:itemId" element={<ItemFillPage />} />
        <Route path="/audit/:auditId/view" element={<AuditViewPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <SyncStatus />
      <VersionToast />
    </BrowserRouter>
  )
}

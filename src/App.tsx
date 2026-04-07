import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuditListPage from './pages/AuditListPage'
import AuditOutlinePage from './pages/AuditOutlinePage'
import ItemFillPage from './pages/ItemFillPage'
import AuditViewPage from './pages/AuditViewPage'
import LoginPage from './pages/LoginPage'

export default function App() {
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
    </BrowserRouter>
  )
}

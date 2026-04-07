import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function Placeholder({ name }: { name: string }) {
  return <div style={{ padding: 16 }}>{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="AuditListPage" />} />
        <Route path="/login" element={<Placeholder name="LoginPage" />} />
        <Route path="/audit/:auditId" element={<Placeholder name="AuditOutlinePage" />} />
        <Route path="/audit/:auditId/fill/:itemId" element={<Placeholder name="ItemFillPage" />} />
        <Route path="/audit/:auditId/view" element={<Placeholder name="AuditViewPage" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

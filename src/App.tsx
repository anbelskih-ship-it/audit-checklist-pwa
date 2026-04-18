import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import { useAuth } from './hooks/useAuth'
import { getAllowedUser, type AllowedUser } from './db/users'
import AuditListPage from './pages/AuditListPage'
import AuditOutlinePage from './pages/AuditOutlinePage'
import ItemFillPage from './pages/ItemFillPage'
import AuditViewPage from './pages/AuditViewPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminFollowupBotsPage from './pages/AdminFollowupBotsPage'
import LoginPage from './pages/LoginPage'
import SyncStatus from './components/SyncStatus'
import VersionToast from './components/VersionToast'
import InstallPrompt from './components/InstallPrompt'
import { configureMasterFiles, syncStructures } from './drive/sync'

configureMasterFiles({
  asp_file_id: '1ZMhcAhr1zFLI5PXASAKWj7FolxI84dz27U9zMPHP-3I',
  na_file_id: '1EB3P4ILwfggCafPNwO-Vc5gZ4JjVVwFKDgQy-2t5WU8',
})

// Context for user role
interface AppUser extends AllowedUser {
  uid: string
  displayName: string
  photoURL: string
}

export const AppUserContext = createContext<AppUser | null>(null)
export function useAppUser() { return useContext(AppUserContext)! }

function RequireRole({
  role,
  children,
}: {
  role: AllowedUser['role']
  children: ReactNode
}) {
  const appUser = useAppUser()
  if (appUser.role !== role) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { user, loading, logout } = useAuth()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  // Check user role after auth
  useEffect(() => {
    if (!user) {
      setAppUser(null)
      setRoleLoading(false)
      setDenied(false)
      return
    }

    const email = user.email?.toLowerCase()
    if (!email) {
      setDenied(true)
      setRoleLoading(false)
      return
    }

    getAllowedUser(email).then(allowed => {
      if (allowed) {
        setAppUser({
          ...allowed,
          uid: user.uid,
          displayName: user.displayName || allowed.name || email,
          photoURL: user.photoURL || '',
        })
        setDenied(false)
      } else {
        setDenied(true)
      }
      setRoleLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (navigator.onLine) {
      syncStructures()
    }
  }, [])

  if (loading || roleLoading) {
    return (
      <div className="center-screen text-disabled">
        Загрузка...
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (denied) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <div className="auth-icon">🔒</div>
          <h1 className="auth-title">Доступ ограничен</h1>
          <p className="auth-subtitle">
            Аккаунт <strong>{user.email}</strong> не добавлен в список пользователей.
          </p>
          <p className="auth-hint">
            Обратитесь к администратору для получения доступа.
          </p>
          <button className="btn-primary" onClick={logout}>Выйти</button>
        </div>
      </div>
    )
  }

  return (
    <AppUserContext.Provider value={appUser}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AuditListPage />} />
          <Route
            path="/admin/users"
            element={(
              <RequireRole role="admin">
                <AdminUsersPage />
              </RequireRole>
            )}
          />
          <Route
            path="/admin/followup-bots"
            element={(
              <RequireRole role="admin">
                <AdminFollowupBotsPage />
              </RequireRole>
            )}
          />
          <Route path="/audit/:auditId" element={<AuditOutlinePage />} />
          <Route path="/audit/:auditId/fill/:itemId" element={<ItemFillPage />} />
          <Route path="/audit/:auditId/view" element={<AuditViewPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <SyncStatus />
        <InstallPrompt />
        <VersionToast />
      </HashRouter>
    </AppUserContext.Provider>
  )
}

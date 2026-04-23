import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './hooks/useAuth'
import { getAllowedUser, type AllowedUser } from './db/users'
import { AppUserContext, useAppUser, type AppUser } from './app-user-context'
import AuditListPage from './pages/AuditListPage'
import AuditOutlinePage from './pages/AuditOutlinePage'
import AuditSettingsPage from './pages/AuditSettingsPage'
import ItemFillPage from './pages/ItemFillPage'
import AuditViewPage from './pages/AuditViewPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminFollowupBotsPage from './pages/AdminFollowupBotsPage'
import LoginPage from './pages/LoginPage'
import VersionToast from './components/VersionToast'
import InstallPrompt from './components/InstallPrompt'
import { configureMasterFiles, syncStructures } from './drive/sync'

configureMasterFiles({
  asp_file_id: '1ZMhcAhr1zFLI5PXASAKWj7FolxI84dz27U9zMPHP-3I',
  na_file_id: '1EB3P4ILwfggCafPNwO-Vc5gZ4JjVVwFKDgQy-2t5WU8',
})

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
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null)
  const [roleErrorEmail, setRoleErrorEmail] = useState<string | null>(null)
  const [roleLookupAttempt, setRoleLookupAttempt] = useState(0)

  // Check user role after auth
  useEffect(() => {
    if (!user) return

    const email = user.email?.toLowerCase()
    if (!email) return

    let active = true

    getAllowedUser(email).then(allowed => {
      if (!active) return
      if (allowed) {
        setAppUser({
          ...allowed,
          uid: user.uid,
          displayName: user.displayName || allowed.name || email,
          photoURL: user.photoURL || '',
        })
        setDeniedEmail(null)
      } else {
        setAppUser(null)
        setDeniedEmail(email)
      }
      setRoleErrorEmail(null)
      setResolvedEmail(email)
    }).catch(() => {
      if (!active) return
      setAppUser(null)
      setDeniedEmail(null)
      setRoleErrorEmail(email)
      setResolvedEmail(email)
    })

    return () => {
      active = false
    }
  }, [user, roleLookupAttempt])

  useEffect(() => {
    if (navigator.onLine) {
      syncStructures()
    }
  }, [])

  const email = user?.email?.toLowerCase() || null
  const roleLoading = Boolean(user && email && resolvedEmail !== email)
  const denied = Boolean((user && !email) || (email && deniedEmail === email))
  const roleLookupFailed = Boolean(email && roleErrorEmail === email)

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

  if (roleLookupFailed) {
    return (
      <div className="center-screen">
        <div className="auth-card">
          <div className="auth-icon">⚠️</div>
          <h1 className="auth-title">Не удалось проверить доступ</h1>
          <p className="auth-subtitle">
            Не получилось получить роль для аккаунта <strong>{user.email}</strong>.
          </p>
          <p className="auth-hint">
            Проверьте соединение и попробуйте ещё раз.
          </p>
          <div className="btn-group">
            <button className="btn-primary" onClick={() => {
              setResolvedEmail(null)
              setRoleErrorEmail(null)
              setRoleLookupAttempt((current) => current + 1)
            }}
            >
              Повторить
            </button>
            <button onClick={logout}>Выйти</button>
          </div>
        </div>
      </div>
    )
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
          <Route path="/audit/:auditId/settings" element={<AuditSettingsPage />} />
          <Route path="/audit/:auditId/fill/:itemId" element={<ItemFillPage />} />
          <Route path="/audit/:auditId/view" element={<AuditViewPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <InstallPrompt />
        <VersionToast />
      </HashRouter>
    </AppUserContext.Provider>
  )
}

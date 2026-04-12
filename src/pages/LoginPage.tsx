import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login, loading } = useAuth()

  if (loading) {
    return (
      <div className="center-screen text-disabled">
        Загрузка...
      </div>
    )
  }

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-icon">📋</div>
        <h1 className="auth-title" style={{ fontSize: 24 }}>Аудит Чек-лист</h1>
        <p className="auth-subtitle" style={{ marginBottom: 32 }}>Инструмент аудита дилерских центров</p>
        <button className="btn-primary btn-full btn-login" onClick={login}>
          Войти через Google
        </button>
      </div>
    </div>
  )
}

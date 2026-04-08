import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', color: '#999' }}>
        Загрузка...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Аудит Чек-лист</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 15 }}>Инструмент аудита дилерских центров</p>
        <button
          className="btn-primary btn-full"
          onClick={login}
          style={{ maxWidth: 320, padding: '14px 24px', fontSize: 16 }}
        >
          Войти через Google
        </button>
      </div>
    </div>
  )
}

import { useAuth } from '../hooks/useAuth'
import InstallPrompt from '../components/InstallPrompt'

export default function LoginPage() {
  const { login, loading, authError } = useAuth()
  const userAgent = window.navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(userAgent)
  const isInAppBrowser = /telegram|telegrambot|fbav|instagram|line|wv/i.test(userAgent)

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
        {authError && (
          <div className="auth-error mt-md">{authError}</div>
        )}
        {isIos && isInAppBrowser && (
          <div className="auth-hint" style={{ marginTop: 16 }}>
            Для iPhone откройте ссылку во внешнем Safari. Во встроенном браузере Telegram вход может не завершаться.
          </div>
        )}
        {isIos && !isInAppBrowser && (
          <div className="auth-hint" style={{ marginTop: 16 }}>
            Если вход зависает, полностью закройте вкладку, заново откройте ссылку в Safari и повторите попытку.
          </div>
        )}
      </div>
      <InstallPrompt />
    </div>
  )
}

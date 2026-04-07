import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getLoginUrl, exchangeCode } from '../drive/auth'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setLoading(true)
      exchangeCode(code)
        .then(() => navigate('/'))
        .catch(e => { setError(e.message); setLoading(false) })
    }
  }, [searchParams, navigate])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Авторизация...</div>

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Аудит Чек-лист</h1>
        <p>Войдите через Google для синхронизации с Drive</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <a href={getLoginUrl()} style={{ display: 'inline-block', padding: '12px 24px', fontSize: 16, background: '#4285f4', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
          Войти через Google
        </a>
        <p style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
          Или <a href="/" style={{ color: '#666' }}>продолжить без синхронизации</a>
        </p>
      </div>
    </div>
  )
}

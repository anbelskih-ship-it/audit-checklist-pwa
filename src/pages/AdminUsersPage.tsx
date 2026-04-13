import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllowedUsers, addAllowedUser, removeAllowedUser, updateUserRole, type AllowedUser, type UserRole } from '../db/users'
import { getGeminiApiKey, setGeminiApiKey } from '../db/config'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('auditor')
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    listAllowedUsers().then(u => { setUsers(u); setLoading(false) })
  }

  useEffect(() => {
    load()
    getGeminiApiKey().then(key => { if (key) setApiKey(key) })
  }, [])

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    await addAllowedUser(email, newRole, newName.trim())
    setNewEmail('')
    setNewName('')
    setNewRole('auditor')
    load()
  }

  const handleRemove = async (email: string) => {
    if (!confirm(`Удалить ${email}?`)) return
    await removeAllowedUser(email)
    load()
  }

  const handleRoleChange = async (email: string, role: UserRole) => {
    await updateUserRole(email, role)
    load()
  }

  if (loading) return <div className="page center-content text-disabled">Загрузка...</div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Назад</button>
        <h1 className="admin-title">Пользователи</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Current users */}
      {users.map(u => (
        <div key={u.email} className="card card--static">
          <div className="flex-between">
            <div>
              <div className="card-title">{u.name || u.email}</div>
              <div className="card-subtitle">{u.email}</div>
            </div>
            <div className="flex-center gap-sm">
              <select
                className="select-compact"
                value={u.role}
                onChange={e => handleRoleChange(u.email, e.target.value as UserRole)}
              >
                <option value="admin">Админ</option>
                <option value="auditor">Аудитор</option>
                <option value="guest">Гость</option>
              </select>
              {u.role !== 'admin' && (
                <button className="btn-sm-danger" onClick={() => handleRemove(u.email)}>
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add new user */}
      <div className="new-audit-form mt-md">
        <div className="fill-section-name mb-sm">Добавить пользователя</div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
            placeholder="user@gmail.com" type="email" />
        </div>
        <div className="form-group">
          <label className="form-label">Имя</label>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Иван Иванов" />
        </div>
        <div className="form-group">
          <label className="form-label">Роль</label>
          <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}>
            <option value="auditor">Аудитор</option>
            <option value="guest">Гость</option>
            <option value="admin">Админ</option>
          </select>
        </div>
        <button className="btn-primary btn-full" onClick={handleAdd} disabled={!newEmail.trim()}>
          Добавить
        </button>
      </div>

      {/* AI Settings */}
      <div className="new-audit-form mt-md">
        <div className="fill-section-name mb-sm">AI-резюме (Gemini)</div>
        <div className="form-group">
          <label className="form-label">API-ключ Google Gemini</label>
          <input
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setApiKeySaved(false) }}
            placeholder="AIzaSy..."
            type="password"
          />
        </div>
        <button
          className="btn-primary btn-full"
          disabled={!apiKey.trim()}
          onClick={async () => {
            await setGeminiApiKey(apiKey.trim())
            setApiKeySaved(true)
          }}
        >
          {apiKeySaved ? 'Сохранено' : 'Сохранить ключ'}
        </button>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
          Бесплатный ключ: aistudio.google.com/apikey
        </div>
      </div>

      <div className="info-block">
        <strong>Роли:</strong><br />
        Админ — полный доступ, управление пользователями<br />
        Аудитор — создание и заполнение аудитов<br />
        Гость — только просмотр
      </div>
    </div>
  )
}

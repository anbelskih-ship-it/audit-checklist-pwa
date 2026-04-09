import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllowedUsers, addAllowedUser, removeAllowedUser, updateUserRole, type AllowedUser, type UserRole } from '../db/users'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('auditor')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    listAllowedUsers().then(u => { setUsers(u); setLoading(false) })
  }

  useEffect(load, [])

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

  if (loading) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Назад</button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Пользователи</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Current users */}
      {users.map(u => (
        <div key={u.email} className="card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>{u.name || u.email}</div>
              <div className="card-subtitle">{u.email}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={u.role}
                onChange={e => handleRoleChange(u.email, e.target.value as UserRole)}
                style={{ minHeight: 36, fontSize: 13, padding: '4px 8px', width: 'auto' }}
              >
                <option value="admin">Админ</option>
                <option value="auditor">Аудитор</option>
                <option value="guest">Гость</option>
              </select>
              {u.role !== 'admin' && (
                <button
                  onClick={() => handleRemove(u.email)}
                  style={{ minHeight: 36, padding: '4px 10px', fontSize: 13, color: '#f44336', background: '#ffebee' }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add new user */}
      <div className="new-audit-form" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Добавить пользователя</div>
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

      <div style={{ marginTop: 16, padding: 12, fontSize: 13, color: '#999', lineHeight: 1.5 }}>
        <strong>Роли:</strong><br />
        Админ — полный доступ, управление пользователями<br />
        Аудитор — создание и заполнение аудитов<br />
        Гость — только просмотр
      </div>
    </div>
  )
}

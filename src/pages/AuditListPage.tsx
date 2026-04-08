import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAudits, createAudit } from '../db/audits'
import { getStructure } from '../db/structures'
import { useAuth } from '../hooks/useAuth'
import type { Audit } from '../types'
import ProgressBar from '../components/ProgressBar'

export default function AuditListPage() {
  const { user, logout } = useAuth()
  const [audits, setAudits] = useState<Audit[]>([])
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState<'АСП' | 'НА'>('АСП')
  const [newDealership, setNewDealership] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newPlannedEnd, setNewPlannedEnd] = useState('')
  const [newComment, setNewComment] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    listAudits().then(setAudits)
  }, [])

  const filtered = filter === 'my' && user
    ? audits.filter(a => a.authorUid === user.uid)
    : audits

  const drafts = filtered.filter(a => a.status === 'draft')
  const completed = filtered.filter(a => a.status === 'completed')

  const countProgress = (audit: Audit) => {
    const answers = Object.values(audit.answers)
    const filled = answers.filter(a => a.value !== null).length
    const total = answers.length
    return { filled, total: Math.max(total, 1) }
  }

  const handleCreate = async () => {
    if (!newDealership.trim() || !user) return
    setCreating(true)
    const structure = await getStructure(newType)
    const version = structure?.version || 'unknown'
    const audit = await createAudit({
      type: newType,
      dealership: newDealership.trim(),
      city: newCity.trim(),
      plannedEnd: newPlannedEnd,
      comment: newComment.trim(),
      authorUid: user.uid,
      authorName: user.displayName || '',
      authorEmail: user.email || '',
      structureVersion: version,
    })
    setCreating(false)
    navigate(`/audit/${audit.id}`)
  }

  const renderCard = (a: Audit) => {
    const { filled, total } = countProgress(a)
    return (
      <div key={a.id} className="card" onClick={() => navigate(`/audit/${a.id}`)}>
        <div className="card-title">{a.name}</div>
        <div className="card-subtitle">
          {a.city && `${a.city} · `}{a.authorName || a.authorEmail} · {new Date(a.updated).toLocaleDateString('ru')}
        </div>
        <ProgressBar filled={filled} total={total} />
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Аудиты</h1>
        <button className="btn-ghost" onClick={logout} style={{ fontSize: 13 }}>
          Выйти
        </button>
      </div>

      {/* User info */}
      <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
        {user?.displayName || user?.email}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={filter === 'all' ? 'btn-primary' : ''}
          onClick={() => setFilter('all')}
          style={{ flex: 1, minHeight: 36, fontSize: 14 }}
        >
          Все
        </button>
        <button
          className={filter === 'my' ? 'btn-primary' : ''}
          onClick={() => setFilter('my')}
          style={{ flex: 1, minHeight: 36, fontSize: 14 }}
        >
          Мои
        </button>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            В работе
          </div>
          {drafts.map(renderCard)}
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#999', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Завершённые
          </div>
          {completed.map(renderCard)}
        </>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15 }}>Пока нет аудитов</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Создайте первый аудит, чтобы начать</div>
        </div>
      )}

      {/* Create form */}
      {!showNew ? (
        <button className="btn-primary btn-full" onClick={() => setShowNew(true)} style={{ marginTop: 16 }}>
          + Новый аудит
        </button>
      ) : (
        <div className="new-audit-form">
          <div className="form-group">
            <label className="form-label">Тип</label>
            <select value={newType} onChange={e => setNewType(e.target.value as 'АСП' | 'НА')}>
              <option value="АСП">АСП (авто с пробегом)</option>
              <option value="НА">НА (новые авто)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Дилерский центр *</label>
            <input value={newDealership} onChange={e => setNewDealership(e.target.value)}
              placeholder="напр. Башавтоком" />
          </div>
          <div className="form-group">
            <label className="form-label">Город</label>
            <input value={newCity} onChange={e => setNewCity(e.target.value)}
              placeholder="напр. Уфа" />
          </div>
          <div className="form-group">
            <label className="form-label">Плановая дата окончания</label>
            <input type="date" value={newPlannedEnd} onChange={e => setNewPlannedEnd(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Комментарий</label>
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
              placeholder="Дополнительная информация..." rows={2} style={{ minHeight: 60 }} />
          </div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
            Ответственный: <strong>{user?.displayName || user?.email}</strong>
          </div>
          <div className="btn-group">
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newDealership.trim()} style={{ flex: 1 }}>
              {creating ? 'Создаю...' : 'Создать'}
            </button>
            <button onClick={() => setShowNew(false)} style={{ flex: 1 }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAudits, createAudit } from '../db/audits'
import { getStructure } from '../db/structures'
import { useAuth } from '../hooks/useAuth'
import { useAppUser } from '../App'
import type { Audit } from '../types'
import ProgressBar from '../components/ProgressBar'
import ThemeToggle from '../components/ThemeToggle'

export default function AuditListPage() {
  const { logout } = useAuth()
  const appUser = useAppUser()
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

  const filtered = filter === 'my' && appUser
    ? audits.filter(a => a.authorUid === appUser.uid)
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
    if (!newDealership.trim() || !appUser) return
    setCreating(true)
    const structure = await getStructure(newType)
    const version = structure?.version || 'unknown'
    const audit = await createAudit({
      type: newType,
      dealership: newDealership.trim(),
      city: newCity.trim(),
      plannedEnd: newPlannedEnd,
      comment: newComment.trim(),
      authorUid: appUser.uid,
      authorName: appUser.displayName,
      authorEmail: appUser.email,
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
        <div className="flex-center gap-sm">
          <ThemeToggle />
          {appUser?.role === 'admin' && (
            <button className="btn-ghost" onClick={() => navigate('/admin/users')}>
              Пользователи
            </button>
          )}
          <button className="btn-ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      {/* User info */}
      <div className="user-info">
        {appUser?.displayName} · {appUser?.role === 'admin' ? 'Админ' : appUser?.role === 'auditor' ? 'Аудитор' : 'Гость'}
      </div>

      {/* Filter */}
      <div className="filter-row">
        <button
          className={filter === 'all' ? 'btn-primary' : ''}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button
          className={filter === 'my' ? 'btn-primary' : ''}
          onClick={() => setFilter('my')}
        >
          Мои
        </button>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <>
          <div className="section-heading">В работе</div>
          {drafts.map(renderCard)}
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <div className="section-heading section-heading--spaced">Завершённые</div>
          {completed.map(renderCard)}
        </>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showNew && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">Пока нет аудитов</div>
          <div className="empty-state-hint">Создайте первый аудит, чтобы начать</div>
        </div>
      )}

      {/* Create form (hidden for guests) */}
      {appUser?.role === 'guest' ? null : !showNew ? (
        <button className="btn-primary btn-full mt-md" onClick={() => setShowNew(true)}>
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
              placeholder="Дополнительная информация..." rows={2} className="textarea-sm" />
          </div>
          <div className="user-info">
            Ответственный: <strong>{appUser?.displayName}</strong>
          </div>
          <div className="btn-group">
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={creating || !newDealership.trim()}>
              {creating ? 'Создаю...' : 'Создать'}
            </button>
            <button className="flex-1" onClick={() => setShowNew(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  )
}

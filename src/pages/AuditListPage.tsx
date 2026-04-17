import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAudits, createAudit } from '../db/audits'
import { useAuth } from '../hooks/useAuth'
import { useAppUser } from '../App'
import type { Audit, ChecklistStructure } from '../types'
import ProgressBar from '../components/ProgressBar'
import ThemeToggle from '../components/ThemeToggle'
import { getAuditCardMetrics } from './audit-list-metrics'
import { loadStructureWithSync } from '../hooks/useStructure'
import { compareAuditsByProjectDateDesc, formatAuditCardTitle } from './audit-list-format'
import { filterAuditsByOwner } from './audit-list-filter'
import { fillBadgeBg, fillBadgeColor } from '../utils/colors'

function countTotalItems(structure: ChecklistStructure): number {
  let total = 0
  for (const sheet of structure.sheets) {
    for (const section of sheet.sections) {
      total += section.items.length - 1 // skip section header
    }
  }
  return total
}

function collectEvalItemIds(structure: ChecklistStructure): Set<string> {
  return new Set(
    structure.sheets.flatMap((sheet) =>
      sheet.sections.flatMap((section) => section.items.slice(1).map((item) => item.id)),
    ),
  )
}

export default function AuditListPage() {
  const { logout } = useAuth()
  const appUser = useAppUser()
  const [audits, setAudits] = useState<Audit[]>([])
  const [structureTotals, setStructureTotals] = useState<Record<string, number>>({})
  const [structureItemIds, setStructureItemIds] = useState<Record<string, Set<string>>>({})
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

    const loadStructureTotals = async () => {
      const canSync = typeof navigator !== 'undefined' ? navigator.onLine : false
      const [asp, na] = await Promise.all([
        loadStructureWithSync('АСП', canSync),
        loadStructureWithSync('НА', canSync),
      ])
      const totals: Record<string, number> = {}
      const itemIds: Record<string, Set<string>> = {}
      if (asp) totals['АСП'] = countTotalItems(asp)
      if (asp) itemIds['АСП'] = collectEvalItemIds(asp)
      if (na) totals['НА'] = countTotalItems(na)
      if (na) itemIds['НА'] = collectEvalItemIds(na)
      setStructureTotals(totals)
      setStructureItemIds(itemIds)
    }

    loadStructureTotals()
  }, [])

  const filtered = filter === 'my' && appUser
    ? filterAuditsByOwner(audits, appUser.email)
    : audits

  const drafts = filtered.filter(a => a.status === 'draft')
  const aspDrafts = drafts.filter(a => a.type === 'АСП').sort(compareAuditsByProjectDateDesc)
  const naDrafts = drafts.filter(a => a.type === 'НА').sort(compareAuditsByProjectDateDesc)

  const getMetrics = (audit: Audit) => {
    return getAuditCardMetrics(audit.answers, structureTotals[audit.type], structureItemIds[audit.type])
  }

  const handleCreate = async () => {
    if (!newDealership.trim() || !appUser) return
    setCreating(true)
    const structure = await loadStructureWithSync(newType, typeof navigator !== 'undefined' ? navigator.onLine : false)
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
    const { answered, totalItems, fillPct, scorePct } = getMetrics(a)
    return (
      <div key={a.id} className="card" onClick={() => navigate(`/audit/${a.id}`)}>
        <div className="flex-between mb-sm">
          <div className="card-title">{formatAuditCardTitle(a)}</div>
          {a.status === 'completed' ? (
            <span className="badge badge--success">Завершён</span>
          ) : fillPct === null ? (
            <span className="badge badge--default">...</span>
          ) : (
            <div className="metrics-fill" style={{ background: fillBadgeBg(fillPct), color: fillBadgeColor(fillPct) }}>
              <div className="metrics-fill-pct" style={{ color: 'inherit' }}>{fillPct}%</div>
            </div>
          )}
        </div>
        <div className="card-subtitle">
          {a.authorName || a.authorEmail} · {new Date(a.updated).toLocaleDateString('ru')}
        </div>
        {totalItems ? <ProgressBar filled={answered} total={totalItems} hideLabel /> : <div className="text-disabled mb-sm">Загружаю структуру чек-листа...</div>}
        {scorePct !== null && (
          <div className="card-score">
            Результат: <strong>{scorePct}%</strong>
          </div>
        )}
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

      {/* ASP drafts */}
      {aspDrafts.length > 0 && (
        <section className="audit-group">
          <div className="audit-group__header">
            <div>
              <div className="section-heading">АСП с пробегом</div>
              <div className="audit-group__hint">Актуальные проекты по автомобилям с пробегом</div>
            </div>
            <div className="audit-group__count">{aspDrafts.length}</div>
          </div>
          {aspDrafts.map(renderCard)}
        </section>
      )}

      {/* NA drafts */}
      {naDrafts.length > 0 && (
        <section className={`audit-group ${aspDrafts.length > 0 ? 'audit-group--spaced' : ''}`}>
          <div className="audit-group__header">
            <div>
              <div className="section-heading">Новые АМ</div>
              <div className="audit-group__hint">Актуальные проекты по новым автомобилям</div>
            </div>
            <div className="audit-group__count">{naDrafts.length}</div>
          </div>
          {naDrafts.map(renderCard)}
        </section>
      )}

      {/* Empty state */}
      {drafts.length === 0 && !showNew && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">Пока нет активных аудитов</div>
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

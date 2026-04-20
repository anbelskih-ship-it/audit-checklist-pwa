import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAudits, createAudit } from '../db/audits'
import { useAuth } from '../hooks/useAuth'
import { useAppUser } from '../App'
import { listAllowedUsers, type AllowedUser } from '../db/users'
import type { Audit, ChecklistStructure } from '../types'
import ProgressBar from '../components/ProgressBar'
import ThemeToggle from '../components/ThemeToggle'
import { useOnline } from '../hooks/useOnline'
import { getAuditCardMetrics } from './audit-list-metrics'
import { loadStructureWithSync } from '../hooks/useStructure'
import { compareAuditsByProjectDateDesc, formatAuditCardTitle } from './audit-list-format'
import { filterAuditsByOwner } from './audit-list-filter'
import { fillBadgeBg, fillBadgeColor } from '../utils/colors'

const AUDIT_LIST_CACHE_KEY = 'audit-list-cache-v2'
const AUDIT_PAGE_SIZE = 40

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

function FollowupBotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6.5" y="7.5" width="11" height="9" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 4.5V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9.75" cy="12" r="1" fill="currentColor" />
      <circle cx="14.25" cy="12" r="1" fill="currentColor" />
      <path d="M10 14.25C10.55 14.7 11.2 15 12 15C12.8 15 13.45 14.7 14 14.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 11H4.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.25 11H17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function AdminPanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 9.25H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 12H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 14.75H12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7.25" cy="9.25" r="0.85" fill="currentColor" />
      <circle cx="7.25" cy="12" r="0.85" fill="currentColor" />
      <circle cx="7.25" cy="14.75" r="0.85" fill="currentColor" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 6.75H7.75C6.65 6.75 5.75 7.65 5.75 8.75V15.25C5.75 16.35 6.65 17.25 7.75 17.25H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 8.5L17 12L13 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 12H9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function AuditListPage() {
  const { logout } = useAuth()
  const appUser = useAppUser()
  const online = useOnline()
  const [audits, setAudits] = useState<Audit[]>([])
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([])
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
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(AUDIT_LIST_CACHE_KEY)
      if (cached) {
        setAudits(JSON.parse(cached) as Audit[])
      }
    } catch {
      // ignore broken cache
    }

    listAudits(AUDIT_PAGE_SIZE).then(({ audits: items, nextCursor: cursor }) => {
      setAudits(items)
      setNextCursor(cursor)
      try {
        window.localStorage.setItem(AUDIT_LIST_CACHE_KEY, JSON.stringify(items))
      } catch {
        // ignore cache write failures
      }
    })
    listAllowedUsers().then(setAllowedUsers)

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
  const authorNames = Object.fromEntries(
    allowedUsers.map(user => [user.email.toLowerCase(), user.name || user.email]),
  )

  const metricsByAuditId = useMemo(() => (
    Object.fromEntries(
      audits.map((audit) => [
        audit.id,
        getAuditCardMetrics(audit.answers, structureTotals[audit.type], structureItemIds[audit.type]),
      ]),
    )
  ), [audits, structureTotals, structureItemIds])

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
      authorName: appUser.name || appUser.displayName,
      authorEmail: appUser.email,
      structureVersion: version,
    })
    setCreating(false)
    navigate(`/audit/${audit.id}`)
  }

  const handleLoadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    const { audits: items, nextCursor: cursor } = await listAudits(AUDIT_PAGE_SIZE, nextCursor)
    setAudits((current) => {
      const merged = [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id))]
      try {
        window.localStorage.setItem(AUDIT_LIST_CACHE_KEY, JSON.stringify(merged))
      } catch {
        // ignore cache write failures
      }
      return merged
    })
    setNextCursor(cursor)
    setLoadingMore(false)
  }

  const renderCard = (a: Audit, index: number, totalInGroup: number) => {
    const { answered, totalItems, fillPct, scorePct } = metricsByAuditId[a.id] || {
      answered: 0,
      totalItems: null,
      fillPct: null,
      scorePct: null,
    }
    const zebraClass = totalInGroup >= 3 ? (index % 2 === 0 ? 'card--tone-a' : 'card--tone-b') : ''
    const authorLabel = authorNames[(a.authorEmail || '').toLowerCase()] || a.authorName || a.authorEmail
    return (
      <div key={a.id} className={`card ${zebraClass}`.trim()} onClick={() => navigate(`/audit/${a.id}`)}>
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
          {authorLabel} · {new Date(a.updated).toLocaleDateString('ru')}
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
      <div className="page-header page-header--compact">
        <div className="page-header__title-block">
          <div className="page-title-row">
            <h1 className="page-title">Аудиты</h1>
            <span className={`sync-badge sync-badge--inline ${online ? 'sync-badge--online' : 'sync-badge--offline'}`}>
              {online ? 'Онлайн' : 'Офлайн'}
            </span>
          </div>
          <div className="user-info user-info--header">
            {appUser?.displayName} · {appUser?.role === 'admin' ? 'Админ' : appUser?.role === 'auditor' ? 'Аудитор' : 'Гость'}
          </div>
        </div>
        <div className="page-header__actions">
          <ThemeToggle />
          {appUser?.role === 'admin' && (
            <>
              <button
                className="header-icon-btn header-icon-btn--bot"
                aria-label="Follow-up бот"
                onClick={() => navigate('/admin/followup-bots')}
              >
                <FollowupBotIcon />
              </button>
              <button
                className="header-icon-btn header-icon-btn--admin"
                aria-label="Админка пользователей"
                onClick={() => navigate('/admin/users')}
              >
                <AdminPanelIcon />
              </button>
            </>
          )}
          <button className="header-icon-btn header-icon-btn--danger" aria-label="Выйти" onClick={logout}>
            <LogoutIcon />
          </button>
        </div>
      </div>

      {!showNew && (
        <>
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

          {appUser?.role === 'guest' ? null : (
            <button className="btn-muted btn-full mb-md" onClick={() => setShowNew(true)}>
              + Новый аудит
            </button>
          )}

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
              {aspDrafts.map((audit, index) => renderCard(audit, index, aspDrafts.length))}
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
              {naDrafts.map((audit, index) => renderCard(audit, index, naDrafts.length))}
            </section>
          )}

          {/* Empty state */}
          {drafts.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">Пока нет активных аудитов</div>
              <div className="empty-state-hint">Создайте первый аудит, чтобы начать</div>
            </div>
          )}

          {nextCursor && (
            <button className="btn-muted btn-full mt-md" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Загружаю...' : 'Показать ещё'}
            </button>
          )}
        </>
      )}

      {/* Create form (hidden for guests) */}
      {appUser?.role === 'guest' ? null : showNew ? (
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
            Ответственный: <strong>{appUser?.name || appUser?.displayName}</strong>
          </div>
          <div className="btn-group">
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={creating || !newDealership.trim()}>
              {creating ? 'Создаю...' : 'Создать'}
            </button>
            <button className="flex-1" onClick={() => setShowNew(false)}>Отмена</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

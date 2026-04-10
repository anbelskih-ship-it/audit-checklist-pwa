import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import ScoreToggle from '../components/ScoreToggle'
import SearchDialog from '../components/SearchDialog'
import type { CheckItem, Section } from '../types'

interface FillItem {
  item: CheckItem
  sheetName: string
  section: Section
  sectionItemIndex: number   // index among evaluable items (excluding header)
  sectionEvalCount: number   // total evaluable items in section
  globalIndex: number
}

export default function ItemFillPage() {
  const { auditId, itemId } = useParams<{ auditId: string; itemId: string }>()
  const { audit, saveAnswer } = useAudit(auditId!)
  const { structure } = useStructure(audit?.type || 'АСП')
  const [searchOpen, setSearchOpen] = useState(false)
  const [comment, setComment] = useState('')
  const navigate = useNavigate()

  // Build list of EVALUABLE items (skip first item of each section — it's the section header)
  const allItems = useMemo(() => {
    if (!structure) return []
    const items: FillItem[] = []
    let idx = 0
    for (const sheet of structure.sheets) {
      for (const section of sheet.sections) {
        const evalItems = section.items.slice(1) // skip first item (section header)
        let sectionIdx = 0
        for (const item of evalItems) {
          items.push({
            item,
            sheetName: sheet.name,
            section,
            sectionItemIndex: sectionIdx++,
            sectionEvalCount: evalItems.length,
            globalIndex: idx++,
          })
        }
      }
    }
    return items
  }, [structure])

  const currentIndex = allItems.findIndex(i => i.item.id === itemId)
  const current = allItems[currentIndex]
  const currentAnswer = audit?.answers[itemId!]

  useEffect(() => {
    setComment(currentAnswer?.comment || '')
  }, [itemId, currentAnswer?.comment])

  if (!current || !audit || !structure) return <div className="page center-content" style={{ color: 'var(--color-text-disabled)' }}>Загрузка...</div>

  const handleScore = async (value: 0 | 1) => {
    await saveAnswer(current.item.id, { value, comment })
  }

  const handleCommentBlur = async () => {
    if (comment === (currentAnswer?.comment || '')) return // no change
    const val = currentAnswer?.value ?? null
    await saveAnswer(current.item.id, { value: val, comment })
  }

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < allItems.length) {
      navigate(`/audit/${auditId}/fill/${allItems[idx].item.id}`, { replace: true })
    }
  }

  // Section header = first item of section
  const sectionHeader = current.section.items[0]

  // Calculate section score: sum of 1s / number of evaluable items
  const evalItems = current.section.items.slice(1)
  let onesCount = 0
  let answeredCount = 0
  for (const item of evalItems) {
    const a = audit.answers[item.id]
    if (a?.value !== null && a?.value !== undefined) {
      answeredCount++
      if (a.value === 1) onesCount++
    }
  }
  const sectionPct = evalItems.length > 0 && answeredCount > 0
    ? Math.round((onesCount / evalItems.length) * 100)
    : null

  const progressColor = sectionPct !== null && sectionPct >= 80
    ? 'var(--color-success)'
    : sectionPct !== null && sectionPct >= 50
    ? 'var(--color-warning)'
    : 'var(--color-primary)'

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${auditId}`)}>← Оглавление</button>
        <button className="btn-ghost" onClick={() => setSearchOpen(true)} style={{ fontSize: 20 }}>🔍</button>
      </div>

      {/* Section header card */}
      <div className="fill-section-card">
        <div className="search-result-path">{current.sheetName}</div>
        <div className="fill-section-name">{current.section.name}</div>
        <div className="search-result-text" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>{sectionHeader.text}</div>
        <div className="progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${sectionPct ?? 0}%`, background: progressColor }} />
          </div>
          <span className="fill-counter" style={{ fontSize: 'var(--font-size-body)', minWidth: 40, textAlign: 'right', color: sectionPct !== null ? 'var(--color-text)' : 'var(--color-input-border)' }}>
            {sectionPct !== null ? `${sectionPct}%` : '—'}
          </span>
          <span className="search-result-path" style={{ whiteSpace: 'nowrap' }}>
            {current.sectionItemIndex + 1} из {current.sectionEvalCount}
          </span>
        </div>
      </div>

      {/* Item content */}
      <div className="flex-1">
        <div className="search-result-path" style={{ marginBottom: 'var(--space-3)', textAlign: 'right' }}>
          {currentIndex + 1} / {allItems.length}
        </div>

        <h2 className="fill-question">{current.item.text}</h2>
        {current.item.criteria && (
          <div className="criteria">{current.item.criteria}</div>
        )}

        <ScoreToggle value={currentAnswer?.value ?? null} onChange={handleScore} />

        <textarea value={comment} onChange={e => setComment(e.target.value)} onBlur={handleCommentBlur}
          placeholder="Комментарий..." />
      </div>

      <div className="btn-group-bottom">
        <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>← Назад</button>
        <button className="btn-primary" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === allItems.length - 1}>Далее →</button>
      </div>

      <SearchDialog structure={structure} open={searchOpen} onClose={() => setSearchOpen(false)}
        onSelect={id => navigate(`/audit/${auditId}/fill/${id}`, { replace: true })} />
    </div>
  )
}

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import { useSwipe } from '../hooks/useSwipe'
import ScoreToggle from '../components/ScoreToggle'
import SearchDialog from '../components/SearchDialog'
import ProgressBar from '../components/ProgressBar'
import type { CheckItem, Section } from '../types'

interface FillItem {
  item: CheckItem
  sheetName: string
  section: Section
  sectionItemIndex: number
  sectionEvalCount: number
  globalIndex: number
}

export default function ItemFillPage() {
  const { auditId, itemId } = useParams<{ auditId: string; itemId: string }>()
  const { audit, saveAnswer } = useAudit(auditId!)
  const { structure } = useStructure(audit?.type || 'АСП')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sectionJumpOpen, setSectionJumpOpen] = useState(false)
  const [comment, setComment] = useState('')
  const navigate = useNavigate()

  const allItems = useMemo(() => {
    if (!structure) return []
    const items: FillItem[] = []
    let idx = 0
    for (const sheet of structure.sheets) {
      for (const section of sheet.sections) {
        const evalItems = section.items.slice(1)
        let sectionIdx = 0
        for (const item of evalItems) {
          items.push({
            item, sheetName: sheet.name, section,
            sectionItemIndex: sectionIdx++,
            sectionEvalCount: evalItems.length,
            globalIndex: idx++,
          })
        }
      }
    }
    return items
  }, [structure])

  // All sections for quick jump
  const allSections = useMemo(() => {
    if (!structure) return []
    return structure.sheets.flatMap(sheet =>
      sheet.sections
        .filter(s => s.items.length > 1)
        .map(section => {
          const evalItems = section.items.slice(1)
          const answered = evalItems.filter(i =>
            audit?.answers[i.id]?.value !== null && audit?.answers[i.id]?.value !== undefined
          ).length
          return {
            id: section.id,
            name: section.name,
            sheetName: sheet.name,
            firstItemId: evalItems[0].id,
            answered,
            total: evalItems.length,
          }
        })
    )
  }, [structure, audit?.answers])

  const currentIndex = allItems.findIndex(i => i.item.id === itemId)
  const current = allItems[currentIndex]
  const currentAnswer = audit?.answers[itemId!]

  useEffect(() => {
    setComment(currentAnswer?.comment || '')
  }, [itemId, currentAnswer?.comment])

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < allItems.length) {
      navigate(`/audit/${auditId}/fill/${allItems[idx].item.id}`, { replace: true })
    }
  }, [allItems, auditId, navigate])

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])

  const swipe = useSwipe(goNext, goPrev)

  if (!current || !audit || !structure) return <div className="page center-content" style={{ color: 'var(--color-text-disabled)' }}>Загрузка...</div>

  const handleScore = async (value: 0 | 1) => {
    await saveAnswer(current.item.id, { value, comment })
  }

  const handleCommentBlur = async () => {
    if (comment === (currentAnswer?.comment || '')) return
    const val = currentAnswer?.value ?? null
    await saveAnswer(current.item.id, { value: val, comment })
  }

  const sectionHeader = current.section.items[0]
  const evalItems = current.section.items.slice(1)
  let onesCount = 0, answeredCount = 0
  for (const item of evalItems) {
    const a = audit.answers[item.id]
    if (a?.value !== null && a?.value !== undefined) {
      answeredCount++
      if (a.value === 1) onesCount++
    }
  }
  const sectionScorePct = answeredCount > 0 ? Math.round((onesCount / answeredCount) * 100) : null

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}
      {...swipe}
    >
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${auditId}`)}>← Оглавление</button>
        <button className="btn-ghost" onClick={() => setSearchOpen(true)} style={{ fontSize: 20 }}>🔍</button>
      </div>

      {/* Section header card — clickable for quick jump */}
      <div className="fill-section-card" onClick={() => setSectionJumpOpen(!sectionJumpOpen)}>
        <div className="search-result-path">{current.sheetName}</div>
        <div className="flex-between">
          <div className="fill-section-name">{current.section.name}</div>
          <span className="search-result-path">▾</span>
        </div>
        <div className="search-result-text" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>{sectionHeader.text}</div>
        <div className="metrics-row">
          <div className="metrics-bar">
            <ProgressBar filled={onesCount} total={answeredCount || 1} hideLabel />
            {sectionScorePct !== null && (
              <div className="metrics-score">Результат: <strong>{sectionScorePct}%</strong></div>
            )}
          </div>
          <div className="metrics-fill">
            <div className="metrics-fill-count">{current.sectionItemIndex + 1} из {current.sectionEvalCount}</div>
            <div className="metrics-fill-pct">{answeredCount}/{evalItems.length}</div>
          </div>
        </div>
      </div>

      {/* Section quick jump dropdown */}
      {sectionJumpOpen && (
        <div className="section-jump">
          {allSections.map(s => (
            <div
              key={s.id}
              className={`section-jump-item ${s.id === current.section.id ? 'section-jump-item--active' : ''}`}
              onClick={() => {
                setSectionJumpOpen(false)
                navigate(`/audit/${auditId}/fill/${s.firstItemId}`, { replace: true })
              }}
            >
              <div className="flex-between">
                <span className="search-result-text">{s.name}</span>
                <span className={`metrics-fill-count ${s.answered === s.total && s.total > 0 ? 'text-success' : ''}`}>
                  {s.answered}/{s.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

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
        <button onClick={goPrev} disabled={currentIndex === 0}>← Назад</button>
        <button className="btn-primary" onClick={goNext} disabled={currentIndex === allItems.length - 1}>Далее →</button>
      </div>

      <SearchDialog structure={structure} open={searchOpen} onClose={() => setSearchOpen(false)}
        onSelect={id => navigate(`/audit/${auditId}/fill/${id}`, { replace: true })} />
    </div>
  )
}

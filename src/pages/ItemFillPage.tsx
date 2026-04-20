import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import { useSwipe } from '../hooks/useSwipe'
import ScoreToggle from '../components/ScoreToggle'
import SearchDialog from '../components/SearchDialog'
import ProgressBar from '../components/ProgressBar'
import CommentComposer from '../components/CommentComposer'
import { calcMetrics } from '../utils/metrics'
import type { CheckItem, Section } from '../types'

interface FillItem {
  item: CheckItem
  sheetName: string
  section: Section
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
    for (const sheet of structure.sheets) {
      for (const section of sheet.sections) {
        const evalItems = section.items.slice(1)
        for (const item of evalItems) {
          items.push({
            item, sheetName: sheet.name, section,
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

  if (!current || !audit || !structure) return <div className="page center-content text-disabled">Загрузка...</div>

  const handleScore = async (value: 0 | 1) => {
    await saveAnswer(current.item.id, { value, comment })
  }

  const handleCommentBlur = async (nextComment = comment) => {
    if (nextComment === (currentAnswer?.comment || '')) return
    const val = currentAnswer?.value ?? null
    await saveAnswer(current.item.id, { value: val, comment: nextComment })
  }

  const evalItems = current.section.items.slice(1)
  const { filled: answeredCount, yesCount: onesCount, scorePct: sectionScorePct } = calcMetrics(evalItems, audit.answers)

  // Sheet navigation: find current sheet index + first items of prev/next sheets
  const currentSheetIndex = structure.sheets.findIndex(s =>
    s.sections.some(sec => sec.id === current.section.id)
  )
  const currentSheet = structure.sheets[currentSheetIndex]
  const currentSheetItems = currentSheet ? currentSheet.sections.flatMap((section) => section.items.slice(1)) : []
  const {
    filled: sheetAnsweredCount,
    total: sheetTotalCount,
    yesCount: sheetYesCount,
    scorePct: sheetScorePct,
  } = calcMetrics(currentSheetItems, audit.answers)
  const auditPositionLabel = `${currentIndex + 1} / ${allItems.length}`
  const sheetPositionLabel = `${sheetAnsweredCount}/${sheetTotalCount}`

  const getSheetFirstItem = (sheetIdx: number): string | null => {
    const sheet = structure.sheets[sheetIdx]
    if (!sheet) return null
    for (const sec of sheet.sections) {
      const evals = sec.items.slice(1)
      if (evals.length > 0) return evals[0].id
    }
    return null
  }
  const prevSheetItemId = currentSheetIndex > 0 ? getSheetFirstItem(currentSheetIndex - 1) : null
  const nextSheetItemId = currentSheetIndex < structure.sheets.length - 1 ? getSheetFirstItem(currentSheetIndex + 1) : null

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}
      {...swipe}
    >
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${auditId}`)}>← Оглавление</button>
        <button className="btn-ghost" onClick={() => setSearchOpen(true)} style={{ fontSize: 20 }}>🔍</button>
      </div>

      <div className="fill-audit-progress">{auditPositionLabel}</div>

      {/* Sheet name + nav */}
      <div className="fill-sheet-nav">
        <button
          className="fill-sheet-arrow"
          disabled={!prevSheetItemId}
          onClick={() => prevSheetItemId && navigate(`/audit/${auditId}/fill/${prevSheetItemId}`, { replace: true })}
        >‹</button>
        <div className="fill-sheet-title">{current.sheetName} <span className="fill-sheet-title__meta">({sheetPositionLabel})</span></div>
        <button
          className="fill-sheet-arrow"
          disabled={!nextSheetItemId}
          onClick={() => nextSheetItemId && navigate(`/audit/${auditId}/fill/${nextSheetItemId}`, { replace: true })}
        >›</button>
      </div>

      {/* Section header card — clickable for quick jump */}
      <div className="fill-section-card" onClick={() => setSectionJumpOpen(!sectionJumpOpen)}>
        <div className="flex-between">
          <div className="fill-section-name">{current.section.name}</div>
          <span className="search-result-path">▾</span>
        </div>
        <div className="fill-progress-stack">
          <div className="fill-progress-line">
            <div className="fill-progress-label">Процесс:</div>
            <div className="fill-progress-left">
              <ProgressBar filled={sheetYesCount} total={sheetAnsweredCount || 1} hideLabel />
            </div>
            <div className="fill-progress-value">{sheetScorePct ?? 0}%</div>
          </div>
          <div className="fill-progress-line">
            <div className="fill-progress-label">Этап:</div>
            <div className="fill-progress-left">
              <ProgressBar filled={onesCount} total={answeredCount || 1} hideLabel />
            </div>
            <div className="fill-progress-value">{sectionScorePct ?? 0}%</div>
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
        <h2 className="fill-question">{current.item.text}</h2>
        {current.item.criteria && (
          <div className="criteria">{current.item.criteria}</div>
        )}

        <ScoreToggle value={currentAnswer?.value ?? null} onChange={handleScore} />
        <CommentComposer value={comment} onChange={setComment} onBlur={handleCommentBlur} />
      </div>

      <div className="btn-group-bottom">
        <button onClick={goPrev} disabled={currentIndex === 0}>← Назад</button>
        <button className="btn-primary btn-primary--nav" onClick={goNext} disabled={currentIndex === allItems.length - 1}>Далее →</button>
      </div>

      <SearchDialog structure={structure} open={searchOpen} onClose={() => setSearchOpen(false)}
        onSelect={id => navigate(`/audit/${auditId}/fill/${id}`, { replace: true })} />
    </div>
  )
}

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

  if (!current || !audit || !structure) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div>

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

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${auditId}`)}>← Оглавление</button>
        <button className="btn-ghost" onClick={() => setSearchOpen(true)} style={{ fontSize: 20 }}>🔍</button>
      </div>

      {/* Section header card */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>{current.sheetName}</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{current.section.name}</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{sectionHeader.text}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${sectionPct ?? 0}%`,
              height: '100%',
              background: sectionPct !== null && sectionPct >= 80 ? '#4caf50' : sectionPct !== null && sectionPct >= 50 ? '#ff9800' : '#1976d2',
              borderRadius: 3,
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: sectionPct !== null ? '#1a1a1a' : '#ccc', minWidth: 40, textAlign: 'right' }}>
            {sectionPct !== null ? `${sectionPct}%` : '—'}
          </span>
          <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>
            {current.sectionItemIndex + 1} из {current.sectionEvalCount}
          </span>
        </div>
      </div>

      {/* Item content */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 6, textAlign: 'right' }}>
          {currentIndex + 1} / {allItems.length}
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 12 }}>{current.item.text}</h2>
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

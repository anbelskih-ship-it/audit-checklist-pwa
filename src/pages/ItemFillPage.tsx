import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import ScoreToggle from '../components/ScoreToggle'
import Breadcrumbs from '../components/Breadcrumbs'
import SearchDialog from '../components/SearchDialog'
import type { CheckItem } from '../types'

export default function ItemFillPage() {
  const { auditId, itemId } = useParams<{ auditId: string; itemId: string }>()
  const { audit, saveAnswer } = useAudit(auditId!)
  const { structure } = useStructure(audit?.type || 'АСП')
  const [searchOpen, setSearchOpen] = useState(false)
  const [comment, setComment] = useState('')
  const navigate = useNavigate()

  const allItems = useMemo(() => {
    if (!structure) return []
    const items: { item: CheckItem; sheetName: string; sectionName: string; globalIndex: number }[] = []
    let idx = 0
    for (const sheet of structure.sheets) {
      for (const section of sheet.sections) {
        for (const item of section.items) {
          items.push({ item, sheetName: sheet.name, sectionName: section.name, globalIndex: idx++ })
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

  if (!current || !audit || !structure) return <div style={{ padding: 16 }}>Загрузка...</div>

  const handleScore = async (value: 0 | 1) => {
    await saveAnswer(current.item.id, { value, comment })
  }

  const handleCommentBlur = async () => {
    const val = currentAnswer?.value ?? null
    await saveAnswer(current.item.id, { value: val, comment })
  }

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < allItems.length) {
      navigate(`/audit/${auditId}/fill/${allItems[idx].item.id}`, { replace: true })
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => navigate(`/audit/${auditId}`)} style={{ fontSize: 14 }}>← Оглавление</button>
        <button onClick={() => setSearchOpen(true)} style={{ fontSize: 18 }}>🔍</button>
      </div>

      <Breadcrumbs parts={[current.sheetName, current.sectionName]} counter={`${currentIndex + 1}/${allItems.length}`} />

      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 16, lineHeight: 1.4, marginBottom: 8 }}>{current.item.text}</h2>
        {current.item.criteria && (
          <div style={{ fontSize: 13, color: '#666', background: '#f9f9f9', padding: 8, borderRadius: 6, marginBottom: 16 }}>
            {current.item.criteria}
          </div>
        )}

        <ScoreToggle value={currentAnswer?.value ?? null} onChange={handleScore} />

        <textarea value={comment} onChange={e => setComment(e.target.value)} onBlur={handleCommentBlur}
          placeholder="Комментарий..." rows={4}
          style={{ width: '100%', padding: 10, fontSize: 14, border: '1px solid #ddd', borderRadius: 8, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
        <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} style={{ padding: '10px 20px' }}>← Назад</button>
        <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === allItems.length - 1} style={{ padding: '10px 20px' }}>Далее →</button>
      </div>

      <SearchDialog structure={structure} open={searchOpen} onClose={() => setSearchOpen(false)}
        onSelect={id => navigate(`/audit/${auditId}/fill/${id}`, { replace: true })} />
    </div>
  )
}

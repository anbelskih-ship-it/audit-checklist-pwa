import { useState, useMemo } from 'react'
import type { ChecklistStructure } from '../types'

interface Props {
  structure: ChecklistStructure
  open: boolean
  onClose: () => void
  onSelect: (itemId: string) => void
}

export default function SearchDialog({ structure, open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    const hits: { id: string; text: string; path: string }[] = []
    for (const sheet of structure.sheets) {
      for (const section of sheet.sections) {
        for (const item of section.items) {
          if (item.text.toLowerCase().includes(q) || item.criteria.toLowerCase().includes(q)) {
            hits.push({ id: item.id, text: item.text, path: `${sheet.name} > ${section.name}` })
          }
        }
      }
    }
    return hits.slice(0, 20)
  }, [query, structure])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: '#fff', margin: '10vh auto', maxWidth: 500, borderRadius: 12, padding: 16, maxHeight: '70vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по пунктам..."
          style={{ width: '100%', padding: 12, fontSize: 16, border: '1px solid #ddd', borderRadius: 8 }}
        />
        {results.map(r => (
          <div key={r.id} onClick={() => { onSelect(r.id); onClose() }}
            style={{ padding: 10, borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
            <div style={{ fontSize: 14 }}>{r.text}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{r.path}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
    <div className="overlay" onClick={onClose}>
      <div className="search-panel" onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 12 }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по пунктам..."
          />
        </div>
        {results.map(r => (
          <div key={r.id} className="search-result" onClick={() => { onSelect(r.id); onClose() }}>
            <div style={{ fontSize: 15 }}>{r.text}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{r.path}</div>
          </div>
        ))}
        {query.length >= 2 && results.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Ничего не найдено</div>
        )}
      </div>
    </div>
  )
}

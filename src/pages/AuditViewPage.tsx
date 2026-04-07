import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import ProgressBar from '../components/ProgressBar'

export default function AuditViewPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit } = useAudit(auditId!)
  const { structure } = useStructure(audit?.type || 'АСП')
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
  const navigate = useNavigate()

  if (!audit || !structure) return <div style={{ padding: 16 }}>Загрузка...</div>

  let totalItems = 0, totalFilled = 0, totalPassed = 0
  for (const sheet of structure.sheets) {
    for (const section of sheet.sections) {
      for (const item of section.items) {
        totalItems++
        const a = audit.answers[item.id]
        if (a?.value !== null && a?.value !== undefined) {
          totalFilled++
          if (a.value === 1) totalPassed++
        }
      }
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 22 }}>{audit.name}</h1>
      <p style={{ color: '#888' }}>{audit.type} · {new Date(audit.updated).toLocaleDateString('ru')}</p>

      <div style={{ display: 'flex', gap: 16, margin: '16px 0', flexWrap: 'wrap' }}>
        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalFilled > 0 ? Math.round(totalPassed / totalFilled * 100) : 0}%</div>
          <div style={{ fontSize: 12, color: '#888' }}>Общий результат</div>
        </div>
        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalFilled}/{totalItems}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Заполнено</div>
        </div>
        <div style={{ padding: 16, background: '#fff3e0', borderRadius: 8, flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f44336' }}>{totalFilled - totalPassed}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Зон роста</div>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={showOnlyIssues} onChange={e => setShowOnlyIssues(e.target.checked)} />
        Показать только зоны роста
      </label>

      {structure.sheets.map(sheet => {
        let sheetTotal = 0, sheetFilled = 0, sheetPassed = 0
        const issues: { text: string; comment: string; sectionName: string }[] = []

        for (const section of sheet.sections) {
          for (const item of section.items) {
            sheetTotal++
            const a = audit.answers[item.id]
            if (a?.value !== null && a?.value !== undefined) {
              sheetFilled++
              if (a.value === 1) sheetPassed++
              else issues.push({ text: item.text, comment: a.comment, sectionName: section.name })
            }
          }
        }

        if (showOnlyIssues && issues.length === 0) return null

        return (
          <div key={sheet.id} style={{ marginBottom: 12 }}>
            <div onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}
              style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500 }}>{sheet.name}</span>
                {issues.length > 0 && <span style={{ color: '#f44336', fontSize: 13 }}>{issues.length} зон роста</span>}
              </div>
              <ProgressBar filled={sheetPassed} total={sheetFilled || sheetTotal} />
            </div>

            {expandedSheet === sheet.id && (
              <div style={{ padding: 12 }}>
                {(showOnlyIssues ? issues : sheet.sections.flatMap(sec =>
                  sec.items.map(item => ({
                    text: item.text,
                    comment: audit.answers[item.id]?.comment || '',
                    sectionName: sec.name,
                    value: audit.answers[item.id]?.value,
                  }))
                )).map((item, i) => (
                  <div key={i} style={{ padding: 8, borderLeft: `3px solid ${'value' in item && item.value === 1 ? '#4caf50' : '#f44336'}`, marginBottom: 4, paddingLeft: 12 }}>
                    <div style={{ fontSize: 13, color: '#999' }}>{item.sectionName}</div>
                    <div style={{ fontSize: 14 }}>{item.text}</div>
                    {item.comment && <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>{item.comment}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <button onClick={() => navigate(`/audit/${auditId}`)} style={{ marginTop: 16 }}>← Назад к аудиту</button>
    </div>
  )
}

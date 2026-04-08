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

  if (!audit || !structure) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div>

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
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${auditId}`)}>← Назад</button>
      </div>

      <h1 className="page-title">{audit.name}</h1>
      <div className="card-subtitle">{audit.type} · {new Date(audit.updated).toLocaleDateString('ru')}</div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#1976d2' }}>
            {totalFilled > 0 ? Math.round(totalPassed / totalFilled * 100) : 0}%
          </div>
          <div className="stat-label">Результат</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalFilled}/{totalItems}</div>
          <div className="stat-label">Заполнено</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f44336' }}>{totalFilled - totalPassed}</div>
          <div className="stat-label">Зон роста</div>
        </div>
      </div>

      <label className="check-label" style={{ marginBottom: 16 }}>
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
          <div key={sheet.id} style={{ marginBottom: 8 }}>
            <div className="card" onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">{sheet.name}</span>
                {issues.length > 0 && <span style={{ color: '#f44336', fontSize: 13, fontWeight: 500 }}>{issues.length}</span>}
              </div>
              <ProgressBar filled={sheetPassed} total={sheetFilled || sheetTotal} />
            </div>

            {expandedSheet === sheet.id && (
              <div style={{ padding: '4px 0' }}>
                {(showOnlyIssues ? issues : sheet.sections.flatMap(sec =>
                  sec.items.map(item => ({
                    text: item.text,
                    comment: audit.answers[item.id]?.comment || '',
                    sectionName: sec.name,
                    value: audit.answers[item.id]?.value,
                  }))
                )).map((item, i) => (
                  <div key={i} className={`issue-item ${'value' in item && item.value === 1 ? 'issue-item--pass' : 'issue-item--fail'}`}>
                    <div style={{ fontSize: 12, color: '#999' }}>{item.sectionName}</div>
                    <div style={{ fontSize: 14 }}>{item.text}</div>
                    {item.comment && <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 4 }}>{item.comment}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import ProgressBar from '../components/ProgressBar'
import { calcMetrics } from '../utils/metrics'

export default function AuditViewPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit } = useAudit(auditId!)
  const { structure } = useStructure(audit?.type || 'АСП')
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  if (!audit || !structure) return <div className="page center-content text-disabled">Загрузка...</div>

  const allEvalItems = structure.sheets.flatMap(sh => sh.sections.flatMap(s => s.items.slice(1)))
  const { filled: totalFilled, total: totalItems, yesCount: totalPassed } = calcMetrics(allEvalItems, audit.answers)

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(`/audit/${auditId}`)}>← Назад</button>
      </div>

      <h1 className="page-title">{audit.name}</h1>
      <div className="card-subtitle">{audit.type} · {new Date(audit.updated).toLocaleDateString('ru')}</div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value stat-value--primary">
            {totalFilled > 0 ? Math.round(totalPassed / totalFilled * 100) : 0}%
          </div>
          <div className="stat-label">Результат</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalFilled}/{totalItems}</div>
          <div className="stat-label">Заполнено</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-value--danger">{totalFilled - totalPassed}</div>
          <div className="stat-label">Зон роста</div>
        </div>
      </div>

      <label className="check-label mb-md">
        <input type="checkbox" checked={showOnlyIssues} onChange={e => setShowOnlyIssues(e.target.checked)} />
        Показать только зоны роста
      </label>

      {structure.sheets.map(sheet => {
        let sheetTotal = 0, sheetFilled = 0, sheetPassed = 0
        const issues: { text: string; comment: string; sectionName: string }[] = []

        for (const section of sheet.sections) {
          const evalItems = section.items.slice(1) // skip section header
          for (const item of evalItems) {
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
          <div key={sheet.id} className="mb-sm">
            <div className="card" onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}>
              <div className="flex-between">
                <span className="card-title">{sheet.name}</span>
                {issues.length > 0 && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-caption)', fontWeight: 500 }}>{issues.length}</span>}
              </div>
              <ProgressBar filled={sheetPassed} total={sheetFilled || sheetTotal} />
            </div>

            {expandedSheet === sheet.id && (
              <div style={{ padding: '4px 0' }}>
                {(showOnlyIssues ? issues : sheet.sections.flatMap(sec =>
                  sec.items.slice(1).map(item => ({
                    text: item.text,
                    comment: audit.answers[item.id]?.comment || '',
                    sectionName: sec.name,
                    value: audit.answers[item.id]?.value,
                  }))
                )).map((item, i) => (
                  <div key={i} className={`issue-item ${'value' in item && item.value === 1 ? 'issue-item--pass' : 'issue-item--fail'}`}>
                    <div className="issue-item-section">{item.sectionName}</div>
                    <div className="issue-item-text">{item.text}</div>
                    {item.comment && <div className="issue-item-comment">{item.comment}</div>}
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

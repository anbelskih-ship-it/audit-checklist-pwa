import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuditRouteData } from '../routes/AuditRouteDataProvider'
import ProgressBar from '../components/ProgressBar'
import { calcMetrics } from '../utils/metrics'
import { getSectionEvalItems, getSheetEvalItems } from '../utils/checklist-items'

export default function AuditViewPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit, structure } = useAuditRouteData()
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  if (!audit || !structure) return <div className="page center-content text-disabled">Загрузка...</div>

  const allEvalItems = structure.sheets.flatMap(getSheetEvalItems)
  const { filled: totalFilled, total: totalItems, yesCount: totalPassed } = calcMetrics(allEvalItems, audit.answers)
  const sheetSummaries = structure.sheets.map(sheet => {
    let sheetTotal = 0, sheetFilled = 0, sheetPassed = 0
    const issues: { id: string; text: string; comment: string; sectionName: string }[] = []
    const allItems: { id: string; text: string; comment: string; sectionName: string; value: 0 | 1 | null | undefined }[] = []

    for (const section of sheet.sections) {
      const evalItems = getSectionEvalItems(section)
      for (const item of evalItems) {
        sheetTotal++
        const answer = audit.answers[item.id]
        const value = answer?.value
        const viewItem = {
          id: item.id,
          text: item.text,
          comment: answer?.comment || '',
          sectionName: section.name,
          value,
        }
        allItems.push(viewItem)
        if (value !== null && value !== undefined) {
          sheetFilled++
          if (value === 1) {
            sheetPassed++
          } else {
            issues.push({
              id: item.id,
              text: item.text,
              comment: answer?.comment || '',
              sectionName: section.name,
            })
          }
        }
      }
    }

    return {
      sheet,
      sheetTotal,
      sheetFilled,
      sheetPassed,
      issues,
      allItems,
    }
  })

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

      <div className="review-filter-row">
        <button
          type="button"
          role="switch"
          aria-label="Только зоны роста"
          aria-checked={showOnlyIssues}
          className={`ios-switch ${showOnlyIssues ? 'ios-switch--on' : ''}`}
          onClick={() => {
            setShowOnlyIssues(current => !current)
            setExpandedSheet(null)
          }}
        >
          <span className="ios-switch__track" aria-hidden="true">
            <span className="ios-switch__thumb" />
          </span>
          <span className="ios-switch__text">
            {showOnlyIssues ? 'Только зоны роста' : 'Все пункты'}
          </span>
        </button>
      </div>

      {sheetSummaries.map(({ sheet, sheetTotal, sheetFilled, sheetPassed, issues, allItems }) => {
        if (showOnlyIssues && issues.length === 0) return null

        return (
          <div key={sheet.id} className="mb-sm">
            <div
              className={`card ${showOnlyIssues ? 'review-sheet-card--issues' : ''}`}
              onClick={() => !showOnlyIssues && setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}
            >
              <div className="flex-between">
                <span className="card-title">{sheet.name}</span>
                {issues.length > 0 && <span className="review-issue-count">{issues.length}</span>}
              </div>
              <ProgressBar filled={sheetPassed} total={sheetFilled || sheetTotal} />
            </div>

            {(showOnlyIssues || expandedSheet === sheet.id) && (
              <div className="review-items-list">
                {(showOnlyIssues ? issues : allItems).map((item) => (
                  <div key={item.id} className={`issue-item ${'value' in item && item.value === 1 ? 'issue-item--pass' : 'issue-item--fail'}`}>
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

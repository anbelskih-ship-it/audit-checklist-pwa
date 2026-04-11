import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import ProgressBar from '../components/ProgressBar'
import { pdf } from '@react-pdf/renderer'
import { AuditPdfReport } from '../export/pdf-report'
import { generateFilledXlsx } from '../export/xlsx-export'
import { downloadFile } from '../drive/drive-api'
import * as XLSX from 'xlsx'
import type { Section } from '../types'

type ViewMode = 'edit' | 'review'

export default function AuditOutlinePage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit, loading: auditLoading } = useAudit(auditId!)
  const { structure, loading: structLoading } = useStructure(audit?.type || 'АСП')
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const navigate = useNavigate()

  const handleExportXlsx = async () => {
    if (!structure || !audit) return
    try {
      const buffer = await downloadFile(structure.driveFileId)
      const templateWb = XLSX.read(buffer, { type: 'array' })
      const result = generateFilledXlsx(templateWb, structure, audit)
      const blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${audit.name}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Для экспорта xlsx нужна авторизация Google Drive')
    }
  }

  const handleExportPdf = async () => {
    if (!structure || !audit) return
    const blob = await pdf(<AuditPdfReport structure={structure} audit={audit} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${audit.name}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (auditLoading || structLoading) return <div className="page center-content" style={{ color: 'var(--color-text-disabled)' }}>Загрузка...</div>
  if (!audit || !structure) return <div className="page center-content" style={{ color: 'var(--color-text-disabled)' }}>Аудит не найден</div>

  const getSheetProgress = (sheetId: string) => {
    const sheet = structure.sheets.find(s => s.id === sheetId)
    if (!sheet) return { filled: 0, total: 0 }
    let filled = 0, total = 0
    for (const section of sheet.sections) {
      const evalItems = section.items.slice(1)
      for (const item of evalItems) {
        total++
        if (audit.answers[item.id]?.value !== null && audit.answers[item.id]?.value !== undefined) filled++
      }
    }
    return { filled, total }
  }

  const getSectionProgress = (section: Section) => {
    const evalItems = section.items.slice(1)
    let filled = 0
    for (const item of evalItems) {
      if (audit.answers[item.id]?.value !== null && audit.answers[item.id]?.value !== undefined) filled++
    }
    return { filled, total: evalItems.length }
  }

  const handleSectionClick = (section: Section) => {
    if (viewMode === 'review') {
      setExpandedSection(expandedSection === section.id ? null : section.id)
    } else {
      const firstEvalItem = section.items.slice(1)[0]
      if (firstEvalItem) navigate(`/audit/${auditId}/fill/${firstEvalItem.id}`)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Назад</button>
      </div>

      <h1 className="page-title">{audit.name}</h1>
      <div className="card-subtitle mb-sm">
        {audit.type} · {audit.status === 'completed' ? 'Завершён' : 'Черновик'}
      </div>

      {/* Mode toggle */}
      <div className="filter-row">
        <button
          className={viewMode === 'edit' ? 'btn-primary' : ''}
          onClick={() => { setViewMode('edit'); setExpandedSection(null) }}
        >
          Заполнение
        </button>
        <button
          className={viewMode === 'review' ? 'btn-primary' : ''}
          onClick={() => setViewMode('review')}
        >
          Просмотр
        </button>
      </div>

      {structure.sheets.map(sheet => {
        const { filled, total } = getSheetProgress(sheet.id)
        const isExpanded = expandedSheet === sheet.id

        return (
          <div key={sheet.id}>
            <div className="card" onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}>
              <div className="card-title">{sheet.name}</div>
              {sheet.estimatedTime && <div className="card-subtitle">{sheet.estimatedTime}</div>}
              <ProgressBar filled={filled} total={total} />
            </div>

            {isExpanded && (
              <div className="mb-sm">
                {sheet.sections.map(section => {
                  const evalItems = section.items.slice(1)
                  if (!evalItems.length) return null
                  const { filled: sFilled, total: sTotal } = getSectionProgress(section)
                  const isSecExpanded = viewMode === 'review' && expandedSection === section.id

                  return (
                    <div key={section.id}>
                      <div
                        className="section-item"
                        onClick={() => handleSectionClick(section)}
                      >
                        <div className="flex-1" style={{ marginRight: 'var(--space-4)' }}>
                          <div className="search-result-text">{section.name}</div>
                          <ProgressBar filled={sFilled} total={sTotal} />
                        </div>
                        <span className="search-result-path" style={{ whiteSpace: 'nowrap' }}>
                          {sFilled}/{sTotal}
                        </span>
                      </div>

                      {/* Review mode: expanded section with questions */}
                      {isSecExpanded && (
                        <div className="review-items">
                          {evalItems.map(item => {
                            const answer = audit.answers[item.id]
                            const hasValue = answer?.value !== null && answer?.value !== undefined
                            return (
                              <div key={item.id} className="review-item">
                                <div className="review-item-row">
                                  {hasValue && (
                                    <span className={`review-dot ${answer!.value === 1 ? 'review-dot--yes' : 'review-dot--no'}`} />
                                  )}
                                  {!hasValue && <span className="review-dot" />}
                                  <span className="review-item-text">{item.text}</span>
                                </div>
                                {answer?.comment && (
                                  <div className="review-item-comment">{answer.comment}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div className="btn-group mt-md">
        <button className="btn-primary flex-1" onClick={() => navigate(`/audit/${auditId}/view`)}>
          Просмотр для клиента
        </button>
      </div>
      <div className="btn-group mt-sm">
        <button className="flex-1" onClick={handleExportPdf}>Скачать PDF</button>
        <button className="flex-1" onClick={handleExportXlsx}>Выгрузить xlsx</button>
      </div>
    </div>
  )
}

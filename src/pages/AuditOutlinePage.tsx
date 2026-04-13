import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import ProgressBar from '../components/ProgressBar'
import { fillBadgeColor, fillBadgeBg } from '../utils/colors'
import { calcMetrics } from '../utils/metrics'
import { pdf } from '@react-pdf/renderer'
import { AuditPdfReport } from '../export/pdf-report'
import { generateFilledXlsx } from '../export/xlsx-export'
import { downloadFile } from '../drive/drive-api'
import * as XLSX from 'xlsx'
import { buildAuditPrompt } from '../ai/prompt-builder'
import { callGemini } from '../ai/gemini'
import { getGeminiApiKey } from '../db/config'
import { saveAuditSummary } from '../db/audits'
import type { Section } from '../types'

type ViewMode = 'edit' | 'review'

export default function AuditOutlinePage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit, loading: auditLoading } = useAudit(auditId!)
  const { structure, loading: structLoading } = useStructure(audit?.type || 'АСП')
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [geminiKey, setGeminiKey] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getGeminiApiKey().then(setGeminiKey)
  }, [])

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

  const handleGenerateSummary = async () => {
    if (!audit || !structure || !geminiKey) return
    setSummaryLoading(true)
    try {
      const prompt = buildAuditPrompt(audit, structure)
      const result = await callGemini(prompt, geminiKey)
      if (result) {
        await saveAuditSummary(audit.id, result)
        alert('Резюме сгенерировано и сохранено')
      } else {
        alert('Не удалось сгенерировать резюме. Проверьте API-ключ.')
      }
    } catch {
      alert('Ошибка при генерации резюме')
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleCopyPrompt = () => {
    if (!audit || !structure) return
    const prompt = buildAuditPrompt(audit, structure)
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Промпт скопирован в буфер обмена. Вставьте в claude.ai или другой AI-чат.')
    })
  }

  if (auditLoading || structLoading) return <div className="page center-content text-disabled">Загрузка...</div>
  if (!audit || !structure) return <div className="page center-content text-disabled">Аудит не найден</div>

  const getSheetMetrics = (sheetId: string) => {
    const sheet = structure.sheets.find(s => s.id === sheetId)
    if (!sheet) return { filled: 0, total: 0, yesCount: 0, scorePct: null }
    const allItems = sheet.sections.flatMap(s => s.items.slice(1))
    return calcMetrics(allItems, audit.answers)
  }

  const getSectionMetrics = (section: Section) => {
    return calcMetrics(section.items.slice(1), audit.answers)
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
        const { filled, total, yesCount, scorePct } = getSheetMetrics(sheet.id)
        const fillPct = total > 0 ? Math.round((filled / total) * 100) : 0
        const isExpanded = expandedSheet === sheet.id

        return (
          <div key={sheet.id}>
            <div className="card" onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}>
              <div className="card-header-row">
                <div className="card-header-left">
                  <div className="card-title">{sheet.name}</div>
                  {sheet.estimatedTime && <div className="card-subtitle">{sheet.estimatedTime}</div>}
                </div>
                <div className="metrics-fill" style={{ background: fillBadgeBg(fillPct), color: fillBadgeColor(fillPct) }}>
                  <div className="metrics-fill-count" style={{ color: 'inherit' }}>{filled}/{total}</div>
                  <div className="metrics-fill-pct" style={{ color: 'inherit' }}>{fillPct}%</div>
                </div>
              </div>
              <div className="metrics-bar">
                <ProgressBar filled={yesCount} total={filled || 1} hideLabel />
                {scorePct !== null && (
                  <div className="metrics-score">Результат: <strong>{scorePct}%</strong></div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="mb-sm">
                {sheet.sections.map(section => {
                  const evalItems = section.items.slice(1)
                  if (!evalItems.length) return null
                  const { filled: sFilled, total: sTotal, yesCount: sYes, scorePct: sScore } = getSectionMetrics(section)
                  const sFillPct = sTotal > 0 ? Math.round((sFilled / sTotal) * 100) : 0
                  const isSecExpanded = viewMode === 'review' && expandedSection === section.id

                  return (
                    <div key={section.id}>
                      <div
                        className="section-item section-item--col"
                        onClick={() => handleSectionClick(section)}
                      >
                        <div className="card-header-row">
                          <div className="card-header-left">
                            <div className="search-result-text">{section.name}</div>
                          </div>
                          <div className="metrics-fill" style={{ background: fillBadgeBg(sFillPct), color: fillBadgeColor(sFillPct) }}>
                            <div className="metrics-fill-count" style={{ color: 'inherit' }}>{sFilled}/{sTotal}</div>
                            <div className="metrics-fill-pct" style={{ color: 'inherit' }}>{sFillPct}%</div>
                          </div>
                        </div>
                        <div className="metrics-bar">
                          <ProgressBar filled={sYes} total={sFilled || 1} hideLabel />
                          {sScore !== null && (
                            <div className="metrics-score">Результат: <strong>{sScore}%</strong></div>
                          )}
                        </div>
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

      {/* AI Summary section */}
      {audit.summary && (
        <div className="card mt-md">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>AI-резюме</div>
          <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {audit.summary}
          </div>
        </div>
      )}

      <div className="btn-group mt-md">
        {geminiKey ? (
          <button className="btn-primary flex-1" onClick={handleGenerateSummary} disabled={summaryLoading}>
            {summaryLoading ? 'Генерация...' : (audit.summary ? 'Обновить резюме' : 'Сгенерировать резюме')}
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={handleCopyPrompt}>
            Скопировать промпт для AI
          </button>
        )}
      </div>

      <div className="btn-group mt-sm">
        <button className="flex-1" onClick={() => navigate(`/audit/${auditId}/view`)}>
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

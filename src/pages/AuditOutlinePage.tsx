import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudit } from '../hooks/useAudit'
import { useStructure } from '../hooks/useStructure'
import { useAuth } from '../hooks/useAuth'
import ProgressBar from '../components/ProgressBar'
import { fillBadgeColor, fillBadgeBg } from '../utils/colors'
import { calcMetrics } from '../utils/metrics'
import { pdf } from '@react-pdf/renderer'
import { AuditPdfReport } from '../export/pdf-report'
import { buildAuditPrompt } from '../ai/prompt-builder'
import { saveAuditExportMeta, saveAuditSummary } from '../db/audits'
import type { Section } from '../types'
import { exportAuditToGoogleSheet, getExportFolderId } from '../export/google-sheet-export'
import { formatAuditCardTitle } from './audit-list-format'
import { downloadBlobFile } from '../export/file-download'
import { getSectionEvalItems, getSheetEvalItems } from '../utils/checklist-items'

type ViewMode = 'edit' | 'review'

function EditAuditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 16.5V19H7.5L16.6 9.9L14.1 7.4L5 16.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.4 8.1L15.9 10.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 6.5L17.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function AuditOutlinePage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit, loading: auditLoading } = useAudit(auditId!)
  const { structure, loading: structLoading } = useStructure(audit?.type || 'АСП', audit?.structureVersion)
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [showPasteField, setShowPasteField] = useState(false)
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [exportingXlsx, setExportingXlsx] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const finishXlsxExport = async () => {
    if (!structure || !audit) return

    const result = await exportAuditToGoogleSheet(audit, structure)
    await saveAuditExportMeta(audit.id, {
      exportFileId: result.fileId,
      exportFileName: result.fileName,
      exportUrl: result.fileUrl,
    })

    alert(result.action === 'created'
      ? `Создан файл: ${result.fileName}\n${result.fileUrl}`
      : `Обновлен файл: ${result.fileName}\n${result.fileUrl}`)
  }

  const handleExportXlsx = async () => {
    if (!structure || !audit) return
    if (!getExportFolderId()) {
      alert('Не задана папка выгрузки. Нужен VITE_EXPORT_FOLDER_ID.')
      return
    }

    setExportingXlsx(true)
    try {
      await finishXlsxExport()
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      if (message === 'Not authenticated' || message === 'Drive auth expired') {
        const strategy = await login()
        if (strategy === 'popup') {
          try {
            await finishXlsxExport()
            return
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : ''
            alert(`Не удалось выгрузить файл в Google Drive: ${retryMessage || 'неизвестная ошибка'}`)
            return
          }
        }
        alert('Подтвердите повторный вход через Google и повторите выгрузку, если она не началась автоматически.')
      } else if (message === 'EXPORT_FOLDER_NOT_CONFIGURED') {
        alert('Не задана папка выгрузки. Нужен VITE_EXPORT_FOLDER_ID.')
      } else {
        alert(`Не удалось выгрузить файл в Google Drive: ${message || 'неизвестная ошибка'}`)
      }
    } finally {
      setExportingXlsx(false)
    }
  }

  const handleExportPdf = async () => {
    if (!structure || !audit) return
    const blob = await pdf(<AuditPdfReport structure={structure} audit={audit} />).toBlob()
    downloadBlobFile(blob, `${audit.name}.pdf`)
  }

  const handleSavePastedSummary = async () => {
    if (!audit || !pasteText.trim()) return
    await saveAuditSummary(audit.id, pasteText.trim())
    setShowPasteField(false)
    setPasteText('')
    alert('Резюме сохранено')
  }

  const handleCopyPrompt = () => {
    if (!audit || !structure) return
    const prompt = buildAuditPrompt(audit, structure)
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Промпт скопирован в буфер обмена. Вставьте его в DeepSeek или другой AI-чат.')
    })
  }

  if (auditLoading || structLoading) return <div className="page center-content text-disabled">Загрузка...</div>
  if (!audit || !structure) return <div className="page center-content text-disabled">Аудит не найден</div>

  const getSheetMetrics = (sheetId: string) => {
    const sheet = structure.sheets.find(s => s.id === sheetId)
    if (!sheet) return { filled: 0, total: 0, yesCount: 0, scorePct: null }
    const allItems = getSheetEvalItems(sheet)
    return calcMetrics(allItems, audit.answers)
  }

  const getSectionMetrics = (section: Section) => {
    return calcMetrics(getSectionEvalItems(section), audit.answers)
  }

  const handleSectionClick = (section: Section) => {
    if (viewMode === 'review') {
      setExpandedSection(expandedSection === section.id ? null : section.id)
    } else {
      const firstEvalItem = getSectionEvalItems(section)[0]
      if (firstEvalItem) navigate(`/audit/${auditId}/fill/${firstEvalItem.id}`)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Назад</button>
        <button
          type="button"
          className="header-icon-btn header-icon-btn--admin"
          aria-label="Редактировать параметры аудита"
          onClick={() => navigate(`/audit/${audit.id}/settings`)}
        >
          <EditAuditIcon />
        </button>
      </div>

      <h1 className="page-title">{formatAuditCardTitle(audit)}</h1>
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
              <div className="section-stack mb-sm">
                {sheet.sections.map(section => {
                  const evalItems = getSectionEvalItems(section)
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
                          <div className={`metrics-score ${sScore === null ? 'metrics-score--placeholder' : ''}`}>
                            {sScore !== null ? <>Результат: <strong>{sScore}%</strong></> : 'Результат:'}
                          </div>
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
        <button
          type="button"
          className="summary-indicator mt-md"
          onClick={() => setShowSummaryDrawer(true)}
        >
          <span className="summary-indicator__dot" aria-hidden="true" />
          <span className="summary-indicator__content">
            <span className="summary-indicator__title">Выжимка DeepSeek сохранена</span>
            <span className="summary-indicator__hint">Нажмите, чтобы открыть полный ответ</span>
          </span>
          <span className="summary-indicator__arrow" aria-hidden="true">↗</span>
        </button>
      )}

      <div className="btn-group mt-md">
        <button className="btn-primary flex-1" onClick={() => { handleCopyPrompt(); setShowPasteField(true) }}>
          {audit.summary ? 'Обновить резюме (промпт)' : 'Скопировать промпт для AI'}
        </button>
      </div>

      {showPasteField && (
        <div className="card mt-sm">
          <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Вставьте ответ от AI</div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Скопируйте ответ из DeepSeek или другого AI-чата и вставьте сюда..."
            rows={6}
          />
          <div className="btn-group mt-sm">
            <button className="btn-primary flex-1" onClick={handleSavePastedSummary} disabled={!pasteText.trim()}>
              Сохранить резюме
            </button>
            <button className="flex-1" onClick={() => { setShowPasteField(false); setPasteText('') }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="btn-group mt-sm">
        <button className="flex-1" onClick={() => navigate(`/audit/${auditId}/view`)}>
          Просмотр для клиента
        </button>
      </div>
      <div className="btn-group mt-sm">
        <button className="flex-1" onClick={handleExportPdf}>Скачать PDF</button>
        <button className="flex-1" onClick={handleExportXlsx} disabled={exportingXlsx}>
          {exportingXlsx ? 'Выгружаю xlsx...' : 'Выгрузить xlsx'}
        </button>
      </div>

      {showSummaryDrawer && audit.summary && (
        <div
          className="drawer-overlay"
          onClick={() => setShowSummaryDrawer(false)}
          role="presentation"
        >
          <div
            className="bottom-drawer"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-drawer-title"
          >
            <div className="bottom-drawer__handle" aria-hidden="true" />
            <div className="bottom-drawer__header">
              <div>
                <div id="summary-drawer-title" className="card-title">Выжимка DeepSeek</div>
                <div className="card-subtitle">Полный текст сохранённого ответа</div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setShowSummaryDrawer(false)}>
                Закрыть
              </button>
            </div>
            <div className="bottom-drawer__content">
              {audit.summary}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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

export default function AuditOutlinePage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { audit, loading: auditLoading } = useAudit(auditId!)
  const { structure, loading: structLoading } = useStructure(audit?.type || 'АСП')
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null)
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
      const evalItems = section.items.slice(1) // skip section header
      for (const item of evalItems) {
        total++
        if (audit.answers[item.id]?.value !== null && audit.answers[item.id]?.value !== undefined) filled++
      }
    }
    return { filled, total }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Назад</button>
      </div>

      <h1 className="page-title">{audit.name}</h1>
      <div className="card-subtitle mb-md">
        {audit.type} · {audit.status === 'completed' ? 'Завершён' : 'Черновик'}
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
                  const answered = evalItems.filter(i => audit.answers[i.id]?.value !== null && audit.answers[i.id]?.value !== undefined).length
                  const firstEvalItem = evalItems[0]
                  if (!firstEvalItem) return null // skip sections with only a header
                  return (
                    <div key={section.id} className="section-item"
                      onClick={() => navigate(`/audit/${auditId}/fill/${firstEvalItem.id}`)}>
                      <span className="search-result-text">{section.name}</span>
                      <span className="search-result-path">
                        {answered}/{evalItems.length}
                      </span>
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

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

  if (auditLoading || structLoading) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div>
  if (!audit || !structure) return <div className="page" style={{ paddingTop: 40, textAlign: 'center', color: '#999' }}>Аудит не найден</div>

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
      <div className="card-subtitle" style={{ marginBottom: 16 }}>
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
              <div style={{ marginBottom: 8 }}>
                {sheet.sections.map(section => {
                  const evalItems = section.items.slice(1)
                  const answered = evalItems.filter(i => audit.answers[i.id]?.value !== null && audit.answers[i.id]?.value !== undefined).length
                  const firstEvalItem = evalItems[0]
                  if (!firstEvalItem) return null // skip sections with only a header
                  return (
                    <div key={section.id} className="section-item"
                      onClick={() => navigate(`/audit/${auditId}/fill/${firstEvalItem.id}`)}>
                      <span style={{ fontSize: 14 }}>{section.name}</span>
                      <span style={{ fontSize: 13, color: '#999' }}>
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

      <div className="btn-group" style={{ marginTop: 16 }}>
        <button className="btn-primary" onClick={() => navigate(`/audit/${auditId}/view`)} style={{ flex: 1 }}>
          Просмотр для клиента
        </button>
      </div>
      <div className="btn-group" style={{ marginTop: 8 }}>
        <button onClick={handleExportPdf} style={{ flex: 1 }}>Скачать PDF</button>
        <button onClick={handleExportXlsx} style={{ flex: 1 }}>Выгрузить xlsx</button>
      </div>
    </div>
  )
}

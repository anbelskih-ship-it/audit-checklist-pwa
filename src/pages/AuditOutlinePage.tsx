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

  if (auditLoading || structLoading) return <div style={{ padding: 16 }}>Загрузка...</div>
  if (!audit || !structure) return <div style={{ padding: 16 }}>Аудит не найден</div>

  const getSheetProgress = (sheetId: string) => {
    const sheet = structure.sheets.find(s => s.id === sheetId)
    if (!sheet) return { filled: 0, total: 0 }
    let filled = 0, total = 0
    for (const section of sheet.sections) {
      for (const item of section.items) {
        total++
        if (audit.answers[item.id]?.value !== null && audit.answers[item.id]?.value !== undefined) filled++
      }
    }
    return { filled, total }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>{audit.name}</h1>
      <p style={{ color: '#888', fontSize: 13 }}>{audit.type} · {audit.status === 'completed' ? 'Завершён' : 'Черновик'}</p>

      {structure.sheets.map(sheet => {
        const { filled, total } = getSheetProgress(sheet.id)
        const isExpanded = expandedSheet === sheet.id

        return (
          <div key={sheet.id} style={{ marginBottom: 8 }}>
            <div onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
              style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, cursor: 'pointer' }}>
              <div style={{ fontWeight: 500 }}>{sheet.name}</div>
              {sheet.estimatedTime && <div style={{ fontSize: 11, color: '#999' }}>{sheet.estimatedTime}</div>}
              <ProgressBar filled={filled} total={total} />
            </div>

            {isExpanded && (
              <div style={{ paddingLeft: 16, marginTop: 4 }}>
                {sheet.sections.map(section => (
                  <div key={section.id}
                    onClick={() => navigate(`/audit/${auditId}/fill/${section.items[0]?.id}`)}
                    style={{ padding: 8, cursor: 'pointer', borderLeft: '2px solid #ddd' }}>
                    <span style={{ fontSize: 14 }}>{section.name}</span>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                      ({section.items.filter(i => audit.answers[i.id]?.value !== null && audit.answers[i.id]?.value !== undefined).length}/{section.items.length})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => navigate(`/audit/${auditId}/view`)}>Просмотр для клиента</button>
        <button onClick={handleExportPdf}>Скачать PDF</button>
        <button onClick={handleExportXlsx}>Выгрузить xlsx</button>
        <button onClick={() => navigate('/')}>← Назад</button>
      </div>
    </div>
  )
}

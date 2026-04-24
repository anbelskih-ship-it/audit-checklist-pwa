import * as XLSX from 'xlsx'
import { SKIP_SHEETS } from '../parser/xlsx-parser'
import { getExportRowItemText, resolveSheetExportLayout } from './sheet-layout'
import type { ChecklistStructure, Audit } from '../types'

export function generateFilledXlsx(
  templateWb: XLSX.WorkBook,
  structure: ChecklistStructure,
  audit: Audit
): ArrayBuffer {
  const wb = XLSX.read(XLSX.write(templateWb, { type: 'array', bookType: 'xlsx' }))

  for (const sheet of structure.sheets) {
    const sheetName = wb.SheetNames.find(n => n.includes(sheet.id) || n.includes(sheet.name))
    if (!sheetName) continue
    if (SKIP_SHEETS.some(s => sheetName.includes(s))) continue

    const ws = wb.Sheets[sheetName]
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 3) continue

    const { headerRowIndex, itemCol, commentCol, scoreCol, isKpiSheet } = resolveSheetExportLayout(data, sheetName, sheet.name)

    if (scoreCol === -1 || itemCol === -1) continue

    for (const section of sheet.sections) {
      for (const item of section.items) {
        for (let r = headerRowIndex + 1; r < data.length; r++) {
          if (getExportRowItemText(data[r], itemCol, isKpiSheet) === item.text) {
            const answer = audit.answers[item.id]
            if (answer?.value != null) {
              const cellRef = XLSX.utils.encode_cell({ r, c: scoreCol })
              ws[cellRef] = { v: answer.value, t: 'n' }
              if (commentCol !== -1 && answer.comment) {
                const commentRef = XLSX.utils.encode_cell({ r, c: commentCol })
                ws[commentRef] = { v: answer.comment, t: 's' }
              }
            }
            break
          }
        }
      }
    }
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

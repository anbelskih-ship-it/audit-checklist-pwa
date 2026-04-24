import * as XLSX from 'xlsx'
import { findColumnByHeaders, ITEM_HEADERS, SKIP_SHEETS } from '../parser/xlsx-parser'
import type { ChecklistStructure, Audit } from '../types'

const COMMENT_HEADERS = ['Комментарий Консультанта', 'Комментарий', 'комментарий']
const SCORE_HEADERS = ['Результат (1/0)', 'Результат', 'Статус']

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

    let headers = (data[1] || []).map(h => h?.toString() ?? null)
    let headerRowIndex = 1
    if (findColumnByHeaders(headers, ITEM_HEADERS) === -1) {
      headers = (data[0] || []).map(h => h?.toString() ?? null)
      headerRowIndex = 0
    }

    const itemCol = findColumnByHeaders(headers, ITEM_HEADERS)
    const commentCol = findColumnByHeaders(headers, COMMENT_HEADERS)
    const scoreCol = findColumnByHeaders(headers, SCORE_HEADERS)

    if (scoreCol === -1 || itemCol === -1) continue

    for (const section of sheet.sections) {
      for (const item of section.items) {
        for (let r = headerRowIndex + 1; r < data.length; r++) {
          if (data[r]?.[itemCol]?.toString()?.trim() === item.text) {
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

import * as XLSX from 'xlsx'
import { findColumnByHeaders } from '../parser/xlsx-parser'
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

    const ws = wb.Sheets[sheetName]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 3) continue

    const headers = data[1]?.map((h: any) => h?.toString() ?? null) || []
    const commentCol = findColumnByHeaders(headers, COMMENT_HEADERS)
    const scoreCol = findColumnByHeaders(headers, SCORE_HEADERS)

    if (scoreCol === -1) continue

    for (const section of sheet.sections) {
      for (const item of section.items) {
        for (let r = 2; r < data.length; r++) {
          if (data[r]?.[3]?.toString()?.trim() === item.text) {
            const answer = audit.answers[item.id]
            if (answer?.value !== null && answer?.value !== undefined) {
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

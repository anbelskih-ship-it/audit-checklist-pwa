import { findColumnByHeaders, ITEM_HEADERS } from '../parser/xlsx-parser'

const COMMENT_HEADERS = ['Комментарий Консультанта', 'Комментарий', 'комментарий']
const SCORE_HEADERS = ['Результат (1/0)', 'Результат', 'Статус']

function isKpiSheetName(value: string): boolean {
  return /kpis|показател/i.test(value)
}

function isKpiIndexCell(value: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(value)
}

function findColumnAcrossRows(data: (string | number | null)[][], candidates: string[]): number {
  for (const rowIndex of [1, 0]) {
    const headers = (data[rowIndex] || []).map(h => h?.toString() ?? null)
    const found = findColumnByHeaders(headers, candidates)
    if (found !== -1) return found
  }
  return -1
}

export function resolveSheetExportLayout(
  data: (string | number | null)[][],
  sheetName: string,
  sheetDisplayName: string,
): {
  headerRowIndex: number
  itemCol: number
  commentCol: number
  scoreCol: number
  isKpiSheet: boolean
} {
  let headers = (data[1] || []).map(h => h?.toString() ?? null)
  let headerRowIndex = 1
  let itemCol = findColumnByHeaders(headers, ITEM_HEADERS)
  if (itemCol === -1) {
    headers = (data[0] || []).map(h => h?.toString() ?? null)
    headerRowIndex = 0
    itemCol = findColumnByHeaders(headers, ITEM_HEADERS)
  }

  const isKpiSheet = isKpiSheetName(sheetName) || isKpiSheetName(sheetDisplayName)
  if (isKpiSheet && itemCol === -1) {
    itemCol = 2
    headerRowIndex = 1
  }

  return {
    headerRowIndex,
    itemCol,
    commentCol: findColumnAcrossRows(data, COMMENT_HEADERS),
    scoreCol: findColumnAcrossRows(data, SCORE_HEADERS),
    isKpiSheet,
  }
}

export function getExportRowItemText(
  row: (string | number | null)[] | undefined,
  itemCol: number,
  isKpiSheet: boolean,
): string {
  if (!row) return ''
  if (!isKpiSheet) {
    return row[itemCol]?.toString()?.trim() || ''
  }

  const rawItemCell = row[itemCol]?.toString()?.trim() || ''
  const shiftedItemCell = row[itemCol + 1]?.toString()?.trim() || ''
  if (isKpiIndexCell(rawItemCell) && shiftedItemCell) {
    return shiftedItemCell
  }

  return rawItemCell || shiftedItemCell
}

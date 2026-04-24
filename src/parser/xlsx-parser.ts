import * as XLSX from 'xlsx'
import type { ChecklistStructure, SheetBlock, Section } from '../types'

export const SECTION_HEADERS = ['Шаги процесса / Этапы операций', 'Шаг процесса', 'Шаги процесса']
export const ITEM_HEADERS = ['Операции процесса', 'Пояснения для критериев', 'Вопрос', 'Критерий выполнения']
export const CRITERIA_HEADERS = ['Критерии выполнения операции', 'Критерий выполнения', 'Пояснения для критериев']

export const SKIP_SHEETS = ['Сводный результат', 'Лист3']

function isKpiSheet(sheetName: string): boolean {
  return /kpis|показател/i.test(sheetName)
}

function isKpiIntroRow(itemText: string): boolean {
  return /отслеживаются следующие показатели/i.test(itemText)
}

function isKpiIndexCell(value: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(value)
}

function parseKpiSheet(
  data: (string | number | null)[][]
): SheetBlock | null {
  const sections: Section[] = []
  let currentSection: Section | null = null
  let sectionCounter = 0
  let itemCounter = 0

  for (let r = 1; r < data.length; r++) {
    const row = data[r]
    if (!row) continue

    const sectionName = row[1]?.toString()?.trim()
    const rawItemCell = row[2]?.toString()?.trim() || ''
    const shiftedItemCell = row[3]?.toString()?.trim() || ''
    const shiftedBenchmarkCell = row[4]?.toString()?.trim() || ''
    const hasSeparateIndexColumn = isKpiIndexCell(rawItemCell) && Boolean(shiftedItemCell)
    const itemText = hasSeparateIndexColumn ? shiftedItemCell : rawItemCell
    const benchmark = hasSeparateIndexColumn
      ? shiftedBenchmarkCell
      : shiftedItemCell || ''

    if (sectionName) {
      sectionCounter++
      itemCounter = 0
      currentSection = {
        id: `KPIs.${sectionCounter}`,
        name: sectionName.replace(/^\d+\.\s*/, ''),
        items: [],
      }
      sections.push(currentSection)
    }

    if (!itemText) continue

    if (isKpiIntroRow(itemText)) {
      if (currentSection) {
        itemCounter++
      } else if (sectionCounter === 0) {
        sectionCounter = 1
      }
      continue
    }

    if (!currentSection) {
      sectionCounter++
      itemCounter = 0
      currentSection = {
        id: `KPIs.${sectionCounter}`,
        name: 'Показатели',
        items: [],
      }
      sections.push(currentSection)
    }

    itemCounter++
    currentSection.items.push({
      id: `${currentSection.id}.${itemCounter}`,
      text: itemText,
      criteria: benchmark,
    })
  }

  const nonEmptySections = sections.filter(section => section.items.length > 0)
  if (!nonEmptySections.length) return null

  return {
    id: 'KPIs',
    name: 'Показатели',
    estimatedTime: '',
    sections: nonEmptySections,
  }
}

export function findColumnByHeaders(headers: (string | null)[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h =>
      h != null && h.toString().trim().toLowerCase().includes(candidate.toLowerCase())
    )
    if (idx !== -1) return idx
  }
  return -1
}

export function isChecklistSheet(headers: (string | null)[]): boolean {
  const hasSection = findColumnByHeaders(headers, SECTION_HEADERS) !== -1
  const hasItem = findColumnByHeaders(headers, ITEM_HEADERS) !== -1
  return hasSection || hasItem
}

export function parseChecklistXlsx(
  workbook: XLSX.WorkBook,
  type: 'АСП' | 'НА',
  version: string,
  driveFileId: string
): ChecklistStructure {
  const sheets: SheetBlock[] = []

  for (const sheetName of workbook.SheetNames) {
    if (SKIP_SHEETS.some(s => sheetName.includes(s))) continue

    const ws = workbook.Sheets[sheetName]
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 3) continue

    if (isKpiSheet(sheetName)) {
      const parsedKpiSheet = parseKpiSheet(data)
      if (parsedKpiSheet) sheets.push(parsedKpiSheet)
      continue
    }

    // Try headers in row 2 first, then row 1 (НА files have some sheets with headers in row 1)
    const row1 = data[0] || []
    let headers = (data[1] || []).map(h => h?.toString() ?? null)
    let headerRowIndex = 1

    if (!isChecklistSheet(headers)) {
      // Try row 1 as headers (some НА sheets)
      headers = row1.map(h => h?.toString() ?? null)
      headerRowIndex = 0
      if (!isChecklistSheet(headers)) continue
    }

    const sectionCol = findColumnByHeaders(headers, SECTION_HEADERS)
    let itemCol = findColumnByHeaders(headers, ITEM_HEADERS)
    const criteriaCol = findColumnByHeaders(headers, CRITERIA_HEADERS)

    // Fallback: if we have section col but no item col, use the column after the second "№"
    if (itemCol === -1 && sectionCol >= 0) {
      // Find the second occurrence of "№" or similar numbering column
      let numColCount = 0
      for (let c = 0; c < headers.length; c++) {
        const h = headers[c]?.trim()
        if (h === '№' || h === '№№') {
          numColCount++
          if (numColCount === 2 && c + 1 < headers.length) {
            itemCol = c + 1
            break
          }
        }
      }
    }

    if (itemCol === -1) continue

    const displayName = (headerRowIndex === 1 ? row1[0]?.toString()?.trim() : null) || sheetName.replace(/^\d+\s*/, '').trim() || sheetName
    // Scan title row for time-like values (e.g. "1 час", "2,5 часа", "0,5 часа")
    let estimatedTime = ''
    if (headerRowIndex === 1) {
      for (const cell of row1) {
        const val = cell?.toString()?.trim() || ''
        if (/час/i.test(val)) {
          estimatedTime = val
          break
        }
      }
    }

    const idMatch = sheetName.match(/^(\d+)/)
    const sheetId = idMatch ? idMatch[1] : sheetName.substring(0, 3)

    const sections: Section[] = []
    let currentSection: Section | null = null
    let sectionCounter = 0
    let itemCounter = 0

    for (let r = headerRowIndex + 1; r < data.length; r++) {
      const row = data[r]
      if (!row) continue

      const sectionName = sectionCol >= 0 ? row[sectionCol]?.toString()?.trim() : null
      const itemText = row[itemCol]?.toString()?.trim()
      const criteriaText = criteriaCol >= 0 ? row[criteriaCol]?.toString()?.trim() : ''

      if (sectionName) {
        sectionCounter++
        itemCounter = 0
        currentSection = {
          id: `${sheetId}.${sectionCounter}`,
          name: sectionName,
          items: [],
        }
        sections.push(currentSection)
      }

      if (itemText) {
        if (!currentSection) {
          sectionCounter++
          itemCounter = 0
          currentSection = {
            id: `${sheetId}.${sectionCounter}`,
            name: displayName,
            items: [],
          }
          sections.push(currentSection)
        }

        itemCounter++
        currentSection.items.push({
          id: `${currentSection.id}.${itemCounter}`,
          text: itemText,
          criteria: criteriaText || '',
        })
      }
    }

    // Filter out empty sections (e.g. summary rows like "TTL")
    const nonEmptySections = sections.filter(s => s.items.length > 0)

    if (nonEmptySections.length > 0) {
      sheets.push({
        id: sheetId,
        name: displayName,
        estimatedTime,
        sections: nonEmptySections,
      })
    }
  }

  return { type, version, driveFileId, sheets }
}

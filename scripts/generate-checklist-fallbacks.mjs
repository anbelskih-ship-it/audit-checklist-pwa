import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

const root = '/Users/anbelskih/audit-checklist-pwa'

function findColumnByHeaders(headers, candidates) {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h =>
      h != null && h.toString().trim().toLowerCase().includes(candidate.toLowerCase())
    )
    if (idx !== -1) return idx
  }
  return -1
}

const SECTION_HEADERS = ['Шаги процесса / Этапы операций', 'Шаг процесса', 'Шаги процесса']
const ITEM_HEADERS = ['Операции процесса', 'Пояснения для критериев', 'Вопрос', 'Критерий выполнения']
const CRITERIA_HEADERS = ['Критерии выполнения операции', 'Критерий выполнения', 'Пояснения для критериев']
const SKIP_SHEETS = ['Сводный результат', 'Лист3']

function isKpiSheet(sheetName) {
  return /kpis|показател/i.test(sheetName)
}

function isKpiIntroRow(itemText) {
  return /отслеживаются следующие показатели/i.test(itemText)
}

function parseKpiSheet(data) {
  const sections = []
  let currentSection = null
  let sectionCounter = 0
  let itemCounter = 0

  for (let r = 1; r < data.length; r++) {
    const row = data[r]
    if (!row) continue

    const sectionName = row[1]?.toString()?.trim()
    const itemText = row[2]?.toString()?.trim()
    const criteriaText = row[3]?.toString()?.trim() || ''

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

    if (!itemText || isKpiIntroRow(itemText)) continue

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
      criteria: criteriaText,
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

function isChecklistSheet(headers) {
  const hasSection = findColumnByHeaders(headers, SECTION_HEADERS) !== -1
  const hasItem = findColumnByHeaders(headers, ITEM_HEADERS) !== -1
  return hasSection || hasItem
}

function parseChecklistXlsx(workbook, type, version, driveFileId) {
  const sheets = []

  for (const sheetName of workbook.SheetNames) {
    if (SKIP_SHEETS.some(s => sheetName.includes(s))) continue

    const ws = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 3) continue

    if (isKpiSheet(sheetName)) {
      const parsedKpiSheet = parseKpiSheet(data)
      if (parsedKpiSheet) sheets.push(parsedKpiSheet)
      continue
    }

    const row1 = data[0] || []
    let headers = (data[1] || []).map(h => h?.toString() ?? null)
    let headerRowIndex = 1

    if (!isChecklistSheet(headers)) {
      headers = row1.map(h => h?.toString() ?? null)
      headerRowIndex = 0
      if (!isChecklistSheet(headers)) continue
    }

    const sectionCol = findColumnByHeaders(headers, SECTION_HEADERS)
    let itemCol = findColumnByHeaders(headers, ITEM_HEADERS)
    const criteriaCol = findColumnByHeaders(headers, CRITERIA_HEADERS)

    if (itemCol === -1 && sectionCol >= 0) {
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

    const sections = []
    let currentSection = null
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

const sources = {
  ASP_FALLBACK: {
    type: 'АСП',
    version: 'local-fallback-2026-04-14',
    driveFileId: '1ZMhcAhr1zFLI5PXASAKWj7FolxI84dz27U9zMPHP-3I',
    filePath: '/Users/anbelskih/Desktop/Work/Проект для ПМ/Чек-лист консалтинг_FIN.xlsx',
  },
  NA_FALLBACK: {
    type: 'НА',
    version: 'local-fallback-2026-04-14',
    driveFileId: '1EB3P4ILwfggCafPNwO-Vc5gZ4JjVVwFKDgQy-2t5WU8',
    filePath: '/Users/anbelskih/Desktop/Work/Проект для ПМ/Шаблон для аудита НА_fin.xlsx',
  },
}

const outPath = path.join(root, 'src/data/checklist-fallbacks.ts')
const generated = {}

for (const [name, config] of Object.entries(sources)) {
  const buffer = fs.readFileSync(config.filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  generated[name] = parseChecklistXlsx(workbook, config.type, config.version, config.driveFileId)
}

const fileContents = `/* eslint-disable */
// Generated by scripts/generate-checklist-fallbacks.mjs
import type { ChecklistStructure } from '../types'

export const ASP_FALLBACK: ChecklistStructure = ${JSON.stringify(generated.ASP_FALLBACK, null, 2)} as ChecklistStructure

export const NA_FALLBACK: ChecklistStructure = ${JSON.stringify(generated.NA_FALLBACK, null, 2)} as ChecklistStructure
`

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, fileContents)
console.log(`Generated ${outPath}`)

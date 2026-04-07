import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import { parseChecklistXlsx } from './xlsx-parser'

const ASP_PATH = '/Users/anbelskih/Desktop/Work/Проект для ПМ/Чек-лист консалтинг_FIN.xlsx'
const NA_PATH = '/Users/anbelskih/Desktop/Work/Проект для ПМ/Шаблон для аудита НА_fin.xlsx'

describe('parse real master files', () => {
  it('parses АСП FIN checklist', () => {
    if (!fs.existsSync(ASP_PATH)) return
    const wb = XLSX.readFile(ASP_PATH)
    const result = parseChecklistXlsx(wb, 'АСП', '2026-04-03', 'test')
    expect(result.sheets.length).toBeGreaterThanOrEqual(10)
    for (const sheet of result.sheets) {
      expect(sheet.sections.length).toBeGreaterThan(0)
      for (const section of sheet.sections) {
        expect(section.items.length).toBeGreaterThan(0)
      }
    }
    console.log(`АСП: ${result.sheets.length} sheets, ${result.sheets.reduce((s, sh) => s + sh.sections.reduce((a, sec) => a + sec.items.length, 0), 0)} items`)
  })

  it('parses НА checklist', () => {
    if (!fs.existsSync(NA_PATH)) return
    const wb = XLSX.readFile(NA_PATH)
    const result = parseChecklistXlsx(wb, 'НА', '2026-04-03', 'test')
    expect(result.sheets.length).toBeGreaterThanOrEqual(5)
    console.log(`НА: ${result.sheets.length} sheets, ${result.sheets.reduce((s, sh) => s + sh.sections.reduce((a, sec) => a + sec.items.length, 0), 0)} items`)
  })
})

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { generateFilledXlsx } from './xlsx-export'
import type { ChecklistStructure, Audit } from '../types'

describe('generateFilledXlsx', () => {
  it('fills score and comment columns in output', () => {
    const structure: ChecklistStructure = {
      type: 'АСП', version: 'v1', driveFileId: 'f1',
      sheets: [{
        id: '01', name: 'Тест', estimatedTime: '1ч',
        sections: [{
          id: '01.1', name: 'Раздел',
          items: [
            { id: '01.1.1', text: 'Пункт 1', criteria: '' },
            { id: '01.1.2', text: 'Пункт 2', criteria: '' },
          ]
        }]
      }]
    }
    const audit: Audit = {
      id: 'a1', name: 'Test', type: 'АСП',
      dealership: 'TestDC', city: 'Москва',
      authorUid: 'uid1', authorName: 'Tester', authorEmail: 'test@email.com',
      created: '', updated: '', plannedEnd: '', comment: '',
      structureVersion: 'v1', status: 'completed',
      answers: {
        '01.1.1': { value: 1, comment: '' },
        '01.1.2': { value: 0, comment: 'Проблема' },
      }
    }

    const wb = XLSX.utils.book_new()
    const data = [
      ['Тест', null, null, null, null, null, '1ч'],
      ['№', 'Шаги процесса / Этапы операций', '№№', 'Операции процесса', 'Критерии', 'Комментарий Консультанта', 'Результат (1/0)'],
      [1, 'Раздел', 1, 'Пункт 1', '', '', ''],
      [null, null, 2, 'Пункт 2', '', '', ''],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), '01 Тест')

    const result = generateFilledXlsx(wb, structure, audit)
    expect(result).toBeInstanceOf(ArrayBuffer)

    const resultWb = XLSX.read(result)
    const ws = resultWb.Sheets['01 Тест']
    const resultData = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 })
    expect(resultData[2][6]).toBe(1)
    expect(resultData[3][6]).toBe(0)
    expect(resultData[3][5]).toBe('Проблема')
  })

  it('fills KPI sheet rows when template uses KPI-specific columns', () => {
    const structure: ChecklistStructure = {
      type: 'АСП', version: 'v1', driveFileId: 'f1',
      sheets: [{
        id: 'KPIs', name: 'Показатели', estimatedTime: '',
        sections: [{
          id: 'KPIs.1', name: 'Использование платформы',
          items: [
            { id: 'KPIs.1.1', text: 'Средний срок хранения по проданным АМ', criteria: '40' },
            { id: 'KPIs.1.2', text: 'Доля быстрых продаж в первые 15 дней публикации', criteria: '0' },
          ],
        }],
      }],
    }
    const audit: Audit = {
      id: 'a1', name: 'Test', type: 'АСП',
      dealership: 'TestDC', city: 'Москва',
      authorUid: 'uid1', authorName: 'Tester', authorEmail: 'test@email.com',
      created: '', updated: '', plannedEnd: '', comment: '',
      structureVersion: 'v1', status: 'completed',
      answers: {
        'KPIs.1.1': { value: 1, comment: 'Норма' },
        'KPIs.1.2': { value: 0, comment: 'Ниже цели' },
      },
    }

    const wb = XLSX.utils.book_new()
    const data = [
      ['', '', '', '', '', 'Комментарий Консультанта', 'Результат (1/0)'],
      ['', '', '', 'Отслеживаются следующие показатели', '', '', ''],
      ['', '1. Использование платформы', 1, 'Средний срок хранения по проданным АМ', '40', '', ''],
      ['', '', 2, 'Доля быстрых продаж в первые 15 дней публикации', '0', '', ''],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'KPIs')

    const result = generateFilledXlsx(wb, structure, audit)
    const resultWb = XLSX.read(result)
    const ws = resultWb.Sheets.KPIs
    const resultData = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 })

    expect(resultData[2][6]).toBe(1)
    expect(resultData[2][5]).toBe('Норма')
    expect(resultData[3][6]).toBe(0)
    expect(resultData[3][5]).toBe('Ниже цели')
  })
})

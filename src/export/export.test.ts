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
    const resultData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    expect(resultData[2][6]).toBe(1)
    expect(resultData[3][6]).toBe(0)
    expect(resultData[3][5]).toBe('Проблема')
  })
})

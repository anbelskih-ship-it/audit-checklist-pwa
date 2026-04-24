import { describe, it, expect } from 'vitest'
import { parseChecklistXlsx, findColumnByHeaders, isChecklistSheet } from './xlsx-parser'
import * as XLSX from 'xlsx'

describe('findColumnByHeaders', () => {
  it('finds column by exact header match', () => {
    const headers = ['№', 'Шаги процесса / Этапы операций', '№№', 'Операции процесса']
    expect(findColumnByHeaders(headers, ['Операции процесса'])).toBe(3)
  })

  it('finds column by partial match', () => {
    const headers = ['№', 'Шаг процесса', '№', 'Пояснения для критериев']
    expect(findColumnByHeaders(headers, ['Шаг процесса', 'Шаги процесса'])).toBe(1)
  })

  it('returns -1 when not found', () => {
    const headers = ['A', 'B', 'C']
    expect(findColumnByHeaders(headers, ['Missing'])).toBe(-1)
  })
})

describe('isChecklistSheet', () => {
  it('accepts sheets with checklist headers', () => {
    expect(isChecklistSheet(['№', 'Шаги процесса / Этапы операций', '№№', 'Операции процесса'])).toBe(true)
  })

  it('accepts НА-style sheets', () => {
    expect(isChecklistSheet(['№', 'Шаг процесса', '№', 'Пояснения для критериев', 'Статус'])).toBe(true)
  })

  it('rejects non-checklist sheets without checklist headers', () => {
    expect(isChecklistSheet(['Произвольная колонка', 'Средний срок хранения'])).toBe(false)
  })
})

describe('parseChecklistXlsx', () => {
  it('parses a minimal workbook into structure', () => {
    const wb = XLSX.utils.book_new()
    const data = [
      ['Тест', null, null, null, null, null, '1 час'],
      ['№', 'Шаги процесса / Этапы операций', '№№', 'Операции процесса', 'Критерии выполнения операции', 'Комментарий Консультанта', 'Результат (1/0)'],
      [1, 'Раздел А', 1, 'Пункт 1', 'Критерий 1', null, null],
      [null, null, 2, 'Пункт 2', 'Критерий 2', null, null],
      [2, 'Раздел Б', 1, 'Пункт 3', null, null, null],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, '01 Тестовый лист')

    const result = parseChecklistXlsx(wb, 'АСП', '2026-04-01', 'file123')
    expect(result.type).toBe('АСП')
    expect(result.sheets).toHaveLength(1)
    expect(result.sheets[0].name).toBe('Тест')
    expect(result.sheets[0].sections).toHaveLength(2)
    expect(result.sheets[0].sections[0].name).toBe('Раздел А')
    expect(result.sheets[0].sections[0].items).toHaveLength(2)
    expect(result.sheets[0].sections[1].items).toHaveLength(1)
  })

  it('parses metrics sheet with the common checklist format', () => {
    const wb = XLSX.utils.book_new()
    const metricsData = [
      ['Показатели', null, null, null, null, null, '1 час'],
      ['№', 'Шаги процесса / Этапы операций', '№№', 'Операции процесса', 'Критерии выполнения операции', 'Комментарий Консультанта', 'Результат (1/0)'],
      [1, 'Использование платформы', 1, 'Средний срок хранения по проданным АМ', '40', null, null],
      [null, null, 2, 'Доля быстрых продаж в первые 15 дней публикации', '0', null, null],
      [2, 'Найм и адаптация', 1, 'Кол-во оценщиков ТИ/ТА', '', null, null],
    ]
    const ws = XLSX.utils.aoa_to_sheet(metricsData)
    XLSX.utils.book_append_sheet(wb, ws, '11 Показатели')

    const result = parseChecklistXlsx(wb, 'АСП', '2026-04-01', 'file123')

    expect(result.sheets).toHaveLength(1)
    expect(result.sheets[0].id).toBe('11')
    expect(result.sheets[0].name).toBe('Показатели')
    expect(result.sheets[0].sections).toHaveLength(2)
    expect(result.sheets[0].sections[0].id).toBe('11.1')
    expect(result.sheets[0].sections[0].name).toBe('Использование платформы')
    expect(result.sheets[0].sections[0].items).toHaveLength(2)
    expect(result.sheets[0].sections[0].items[0].id).toBe('11.1.1')
    expect(result.sheets[0].sections[0].items[0].text).toBe('Средний срок хранения по проданным АМ')
    expect(result.sheets[0].sections[0].items[0].criteria).toBe('40')
  })
})

import { describe, expect, it } from 'vitest'
import { buildPdfReportData } from './pdf-report-data'
import { PDF_LAYOUT_TOKENS, PDF_PAGINATION_GUARDS } from './pdf-report'
import type { Audit, ChecklistStructure } from '../types'

describe('buildPdfReportData', () => {
  it('builds detailed report sections and grouped issues for the PDF', () => {
    const structure: ChecklistStructure = {
      type: 'АСП',
      version: 'v1',
      driveFileId: 'drive-1',
      sheets: [
        {
          id: '01',
          name: 'Персонал',
          estimatedTime: '1,5 часа',
          sections: [
            {
              id: '01.1',
              name: 'Проактивный поиск',
              items: [
                { id: '01.1.1', text: 'Есть сценарий поиска кандидатов', criteria: '' },
                { id: '01.1.2', text: 'Есть еженедельный обзвон базы', criteria: '' },
              ],
            },
            {
              id: '01.2',
              name: 'Адаптация',
              items: [
                { id: '01.2.1', text: 'Есть план адаптации сотрудников', criteria: '' },
              ],
            },
          ],
        },
        {
          id: '02',
          name: 'Маркетинг',
          estimatedTime: '1 час',
          sections: [
            {
              id: '02.1',
              name: 'Лиды',
              items: [
                { id: '02.1.1', text: 'Ведётся разбор качества лидов', criteria: '' },
              ],
            },
          ],
        },
      ],
    }

    const audit: Audit = {
      id: 'audit-1',
      name: 'ДЦ Тест — АСП — апрель 2026',
      type: 'АСП',
      dealership: 'ДЦ Тест',
      city: 'Москва',
      authorUid: 'user-1',
      authorName: 'Иван Иванов',
      authorEmail: 'ivan@example.com',
      created: '2026-04-14T08:00:00.000Z',
      updated: '2026-04-14T10:30:00.000Z',
      plannedEnd: '2026-04-20',
      comment: 'Полевой аудит',
      structureVersion: 'v1',
      status: 'completed',
      summary: 'Персонал: отсутствует проактивный поиск кандидатов.',
      answers: {
        '01.1.1': { value: 0, comment: 'Нет единого сценария поиска' },
        '01.1.2': { value: 0, comment: 'Обзвон не ведётся' },
        '01.2.1': { value: 1, comment: '' },
        '02.1.1': { value: 1, comment: '' },
      },
    }

    const report = buildPdfReportData(structure, audit)

    expect(report.title).toBe('ДЦ Тест — АСП — апрель 2026')
    expect(report.summary).toBe('Персонал: отсутствует проактивный поиск кандидатов.')
    expect(report.metrics.scorePct).toBe(50)
    expect(report.metrics.filled).toBe(4)
    expect(report.metrics.total).toBe(4)
    expect(report.metrics.issueCount).toBe(2)
    expect(report.sheets).toHaveLength(1)
    expect(report.sheets[0].name).toBe('Персонал')
    expect(report.sheets[0].issuesBySection).toHaveLength(1)
    expect(report.sheets[0].issuesBySection[0].sectionName).toBe('Проактивный поиск')
    expect(report.sheets[0].issuesBySection[0].issues).toHaveLength(2)
    expect(report.sheets[0].issuesBySection[0].issues[0]).toEqual({
      text: 'Есть сценарий поиска кандидатов',
      comment: 'Нет единого сценария поиска',
    })
  })

  it('adds pagination guards so PDF blocks do not split awkwardly', () => {
    expect(PDF_PAGINATION_GUARDS.sheetMinPresenceAhead).toBe(160)
    expect(PDF_PAGINATION_GUARDS.issueGroupMinPresenceAhead).toBe(56)
  })

  it('uses tighter layout tokens for a cleaner first page rhythm', () => {
    expect(PDF_LAYOUT_TOKENS.heroPadding).toBe(16)
    expect(PDF_LAYOUT_TOKENS.heroMarginBottom).toBe(14)
    expect(PDF_LAYOUT_TOKENS.metricCardPadding).toBe(12)
    expect(PDF_LAYOUT_TOKENS.metricsRowMarginBottom).toBe(14)
    expect(PDF_LAYOUT_TOKENS.sheetCardPadding).toBe(14)
  })
})

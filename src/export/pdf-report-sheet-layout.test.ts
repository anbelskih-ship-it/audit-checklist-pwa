import { describe, expect, it } from 'vitest'
import { buildPdfSheetLayout } from './pdf-report-sheet-layout'
import type { PdfSheetReport } from './pdf-report-data'

describe('buildPdfSheetLayout', () => {
  it('separates sheet header from section groups so the whole checklist is not a single container', () => {
    const sheet: PdfSheetReport = {
      id: '01',
      name: 'Предпродажная подготовка',
      estimatedTime: '2 часа',
      metrics: {
        filled: 25,
        total: 25,
        scorePct: 44,
        issueCount: 14,
      },
      issuesBySection: [
        {
          sectionName: 'Подготовка АСП',
          issues: [
            { text: 'Пункт 1', comment: 'Комментарий 1' },
            { text: 'Пункт 2', comment: 'Комментарий 2' },
          ],
        },
      ],
    }

    const layout = buildPdfSheetLayout(sheet)

    expect(layout.header.name).toBe('Предпродажная подготовка')
    expect(layout.groups).toHaveLength(1)
    expect(layout.groups[0].sectionName).toBe('Подготовка АСП')
    expect(layout.groups[0].issues).toHaveLength(2)
  })
})

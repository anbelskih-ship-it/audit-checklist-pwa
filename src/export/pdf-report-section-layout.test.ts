import { describe, expect, it } from 'vitest'
import { buildPdfSectionLayout } from './pdf-report-section-layout'

describe('buildPdfSectionLayout', () => {
  it('keeps section title together only with the first issue block', () => {
    const layout = buildPdfSectionLayout({
      sectionName: 'Подготовка АСП',
      issues: [
        { text: 'Пункт 1', comment: 'Комментарий 1' },
        { text: 'Пункт 2', comment: 'Комментарий 2' },
      ],
    })

    expect(layout.lead.sectionName).toBe('Подготовка АСП')
    expect(layout.lead.blocks).toHaveLength(1)
    expect(layout.tail).toHaveLength(1)
    expect(layout.tail[0].text).toBe('Пункт 2')
  })
})

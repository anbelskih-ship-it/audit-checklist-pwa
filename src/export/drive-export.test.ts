import { describe, expect, it } from 'vitest'
import { buildExportFileName } from './google-sheet-export'
import type { Audit } from '../types'

function makeAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    id: 'audit-1',
    name: 'Test',
    type: 'АСП',
    dealership: 'Башавтоком',
    city: 'Уфа',
    authorUid: 'u1',
    authorName: 'Tester',
    authorEmail: 'test@example.com',
    created: '2026-04-14T10:00:00.000Z',
    updated: '2026-04-14T10:00:00.000Z',
    plannedEnd: '2026-04-20',
    comment: '',
    structureVersion: 'v1',
    answers: {},
    status: 'draft',
    ...overrides,
  }
}

describe('buildExportFileName', () => {
  it('builds stable readable filename', () => {
    expect(buildExportFileName(makeAudit())).toBe('АСП - Башавтоком - Уфа - 2026-04-20')
  })

  it('sanitizes unsafe characters and falls back to created date', () => {
    const audit = makeAudit({
      dealership: 'Рольф/Север:*',
      city: '',
      plannedEnd: '',
    })

    expect(buildExportFileName(audit)).toBe('АСП - Рольф Север - Без города - 2026-04-14')
  })
})

import { describe, expect, it } from 'vitest'
import { compareAuditsByProjectDateDesc, formatAuditCardTitle } from './audit-list-format'
import type { Audit } from '../types'

function makeAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    id: 'a1',
    name: 'Test',
    type: 'АСП',
    dealership: '2 Автосила',
    city: 'Барнаул',
    authorUid: 'u1',
    authorName: 'Tester',
    authorEmail: 'test@example.com',
    created: '2026-02-15T10:00:00.000Z',
    updated: '2026-02-15T10:00:00.000Z',
    plannedEnd: '2026-05-15',
    comment: '',
    structureVersion: 'v1',
    answers: {},
    status: 'draft',
    ...overrides,
  }
}

describe('formatAuditCardTitle', () => {
  it('removes leading numbers and formats project date range', () => {
    expect(formatAuditCardTitle(makeAudit())).toBe('Автосила Барнаул 15 фев - 15 май')
  })
})

describe('compareAuditsByProjectDateDesc', () => {
  it('sorts audits by planned end date descending', () => {
    const newer = makeAudit({ id: 'newer', plannedEnd: '2026-06-30' })
    const older = makeAudit({ id: 'older', plannedEnd: '2026-05-15' })

    expect([older, newer].sort(compareAuditsByProjectDateDesc).map(a => a.id)).toEqual(['newer', 'older'])
  })
})

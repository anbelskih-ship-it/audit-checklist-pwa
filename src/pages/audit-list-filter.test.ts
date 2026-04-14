import { describe, expect, it } from 'vitest'
import type { Audit } from '../types'
import { filterAuditsByOwner } from './audit-list-filter'

const baseAudit: Audit = {
  id: '1',
  name: 'Test',
  type: 'АСП',
  dealership: 'Test',
  city: 'Уфа',
  authorUid: 'uid-1',
  authorName: 'User',
  authorEmail: 'user@example.com',
  created: '2026-04-14T00:00:00.000Z',
  updated: '2026-04-14T00:00:00.000Z',
  plannedEnd: '2026-04-30',
  comment: '',
  structureVersion: 'v1',
  answers: {},
  status: 'draft',
}

describe('filterAuditsByOwner', () => {
  it('matches by email regardless of uid mismatch', () => {
    const audits = [{ ...baseAudit, authorUid: 'legacy-uid' }]
    const result = filterAuditsByOwner(audits, 'USER@example.com')
    expect(result).toHaveLength(1)
  })

  it('excludes audits of other users', () => {
    const audits = [{ ...baseAudit, authorEmail: 'other@example.com' }]
    const result = filterAuditsByOwner(audits, 'user@example.com')
    expect(result).toHaveLength(0)
  })
})

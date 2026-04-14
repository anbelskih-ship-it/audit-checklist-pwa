import { describe, expect, it } from 'vitest'
import { getAuditCardMetrics } from './audit-list-metrics'

describe('getAuditCardMetrics', () => {
  it('does not report 100 percent fill when structure total is unknown', () => {
    const metrics = getAuditCardMetrics({
      a: { value: 1, comment: '', updated: '2026-04-14T11:00:00.000Z' },
      b: { value: 0, comment: '', updated: '2026-04-14T11:01:00.000Z' },
    })

    expect(metrics.answered).toBe(2)
    expect(metrics.totalItems).toBeNull()
    expect(metrics.fillPct).toBeNull()
    expect(metrics.scorePct).toBe(50)
  })

  it('calculates fill percent from real structure total when available', () => {
    const metrics = getAuditCardMetrics({
      a: { value: 1, comment: '', updated: '2026-04-14T11:00:00.000Z' },
      b: { value: 0, comment: '', updated: '2026-04-14T11:01:00.000Z' },
    }, 20)

    expect(metrics.totalItems).toBe(20)
    expect(metrics.fillPct).toBe(10)
    expect(metrics.scorePct).toBe(50)
  })
})

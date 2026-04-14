import type { Answer } from '../types'

export interface AuditCardMetrics {
  answered: number
  totalItems: number | null
  fillPct: number | null
  scorePct: number | null
}

export function getAuditCardMetrics(
  answers: Record<string, Answer>,
  structureTotal?: number
): AuditCardMetrics {
  const values = Object.values(answers)
  const answered = values.filter(a => a.value !== null && a.value !== undefined).length
  const yesCount = values.filter(a => a.value === 1).length
  const totalItems = typeof structureTotal === 'number' ? structureTotal : null
  const fillPct = totalItems && totalItems > 0
    ? Math.round((answered / totalItems) * 100)
    : null
  const scorePct = answered > 0 ? Math.round((yesCount / answered) * 100) : null

  return { answered, totalItems, fillPct, scorePct }
}

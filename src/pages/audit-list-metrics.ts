import type { Answer } from '../types'

export interface AuditCardMetrics {
  answered: number
  totalItems: number | null
  fillPct: number | null
  scorePct: number | null
}

export function getAuditCardMetrics(
  answers: Record<string, Answer>,
  structureTotal?: number,
  validItemIds?: Set<string>
): AuditCardMetrics {
  const entries = validItemIds
    ? Object.entries(answers).filter(([itemId]) => validItemIds.has(itemId))
    : Object.entries(answers)
  const rawAnswered = entries.filter(([, answer]) => answer.value !== null && answer.value !== undefined).length
  const rawYesCount = entries.filter(([, answer]) => answer.value === 1).length
  const totalItems = typeof structureTotal === 'number' ? structureTotal : null
  const answered = rawAnswered
  const yesCount = rawYesCount
  const fillPct = totalItems && totalItems > 0
    ? Math.round((answered / totalItems) * 100)
    : null
  const scorePct = answered > 0 ? Math.round((yesCount / answered) * 100) : null

  return { answered, totalItems, fillPct, scorePct }
}

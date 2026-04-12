import type { CheckItem, Answer } from '../types'

export interface Metrics {
  filled: number
  total: number
  yesCount: number
  scorePct: number | null
}

export function calcMetrics(items: CheckItem[], answers: Record<string, Answer>): Metrics {
  let filled = 0, yesCount = 0
  for (const item of items) {
    const a = answers[item.id]
    if (a?.value != null) {
      filled++
      if (a.value === 1) yesCount++
    }
  }
  return {
    filled,
    total: items.length,
    yesCount,
    scorePct: filled > 0 ? Math.round((yesCount / filled) * 100) : null,
  }
}

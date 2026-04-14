import type { Audit } from '../types'

const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function normalizeDealershipName(value: string): string {
  return value.replace(/^\s*\d+\s*/u, '').trim()
}

function formatShortDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} ${RU_MONTHS_SHORT[date.getMonth()]}`
}

export function formatAuditCardTitle(audit: Audit): string {
  const start = formatShortDate(audit.created)
  const end = formatShortDate(audit.plannedEnd)
  const range = start && end ? `${start} - ${end}` : start || end

  return [normalizeDealershipName(audit.dealership), audit.city, range].filter(Boolean).join(' ')
}

function toSortableTime(value: string): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function compareAuditsByProjectDateDesc(a: Audit, b: Audit): number {
  const bProjectTime = toSortableTime(b.plannedEnd) || toSortableTime(b.created)
  const aProjectTime = toSortableTime(a.plannedEnd) || toSortableTime(a.created)
  return bProjectTime - aProjectTime
}

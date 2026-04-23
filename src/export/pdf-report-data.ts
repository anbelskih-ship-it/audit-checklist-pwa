import { calcMetrics } from '../utils/metrics'
import type { Audit, ChecklistStructure } from '../types'
import { getSectionEvalItems, getSheetEvalItems } from '../utils/checklist-items'

export interface PdfIssue {
  text: string
  comment: string
}

export interface PdfIssueGroup {
  sectionName: string
  issues: PdfIssue[]
}

export interface PdfSheetReport {
  id: string
  name: string
  estimatedTime: string
  metrics: {
    filled: number
    total: number
    scorePct: number | null
    issueCount: number
  }
  issuesBySection: PdfIssueGroup[]
}

export interface PdfReportData {
  title: string
  summary: string
  meta: {
    type: string
    city: string
    dealership: string
    status: string
    updatedLabel: string
    authorName: string
  }
  metrics: {
    filled: number
    total: number
    scorePct: number
    issueCount: number
    completionPct: number
  }
  sheets: PdfSheetReport[]
}

function formatRuDate(value: string): string {
  if (!value) return 'Не указано'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Не указано'
  return date.toLocaleDateString('ru-RU')
}

function formatStatus(status: Audit['status']): string {
  return status === 'completed' ? 'Завершён' : 'Черновик'
}

export function buildPdfReportData(structure: ChecklistStructure, audit: Audit): PdfReportData {
  const allEvalItems = structure.sheets.flatMap(getSheetEvalItems)
  const allMetrics = calcMetrics(allEvalItems, audit.answers)

  const sheets = structure.sheets
    .map(sheet => {
      const sheetEvalItems = getSheetEvalItems(sheet)
      const sheetMetrics = calcMetrics(sheetEvalItems, audit.answers)

      const issuesBySection = sheet.sections
        .map(section => {
          const issues = getSectionEvalItems(section)
            .map(item => audit.answers[item.id] ? { item, answer: audit.answers[item.id] } : null)
            .filter((entry): entry is { item: typeof section.items[number], answer: NonNullable<typeof audit.answers[string]> } => {
              return Boolean(entry && entry.answer.value === 0)
            })
            .map(entry => ({
              text: entry.item.text,
              comment: entry.answer.comment || '',
            }))

          return {
            sectionName: section.name,
            issues,
          }
        })
        .filter(group => group.issues.length > 0)

      return {
        id: sheet.id,
        name: sheet.name,
        estimatedTime: sheet.estimatedTime,
        metrics: {
          filled: sheetMetrics.filled,
          total: sheetMetrics.total,
          scorePct: sheetMetrics.scorePct,
          issueCount: issuesBySection.reduce((sum, group) => sum + group.issues.length, 0),
        },
        issuesBySection,
      }
    })
    .filter(sheet => sheet.metrics.issueCount > 0)

  return {
    title: audit.name,
    summary: audit.summary || '',
    meta: {
      type: audit.type,
      city: audit.city,
      dealership: audit.dealership,
      status: formatStatus(audit.status),
      updatedLabel: formatRuDate(audit.updated),
      authorName: audit.authorName,
    },
    metrics: {
      filled: allMetrics.filled,
      total: allMetrics.total,
      scorePct: allMetrics.scorePct ?? 0,
      issueCount: sheets.reduce((sum, sheet) => sum + sheet.metrics.issueCount, 0),
      completionPct: allMetrics.total > 0 ? Math.round((allMetrics.filled / allMetrics.total) * 100) : 0,
    },
    sheets,
  }
}

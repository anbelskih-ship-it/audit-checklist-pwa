import { buildPdfIssueBlocks } from './pdf-report-layout'
import type { PdfIssueGroup } from './pdf-report-data'

export function buildPdfSectionLayout(group: PdfIssueGroup) {
  const expanded = group.issues.flatMap(issue => buildPdfIssueBlocks(issue))

  return {
    lead: {
      sectionName: group.sectionName,
      blocks: expanded.slice(0, 1),
    },
    tail: expanded.slice(1),
  }
}

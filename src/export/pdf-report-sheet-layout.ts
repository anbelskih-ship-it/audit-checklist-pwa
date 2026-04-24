import type { PdfSheetReport } from './pdf-report-data'

export function buildPdfSheetLayout(sheet: PdfSheetReport) {
  return {
    header: {
      id: sheet.id,
      name: sheet.name,
      estimatedTime: sheet.estimatedTime,
      metrics: sheet.metrics,
    },
    groups: sheet.issuesBySection,
  }
}

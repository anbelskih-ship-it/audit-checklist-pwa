import * as XLSX from 'xlsx'
import { findColumnByHeaders, ITEM_HEADERS, SKIP_SHEETS } from '../parser/xlsx-parser'
import {
  batchUpdateSpreadsheet,
  clearSpreadsheetRanges,
  copySpreadsheetFile,
  copySheetToSpreadsheet,
  downloadFile,
  getFileMetadata,
  getSpreadsheetSheets,
  isGoogleSpreadsheetMime,
  listFilesInFolder,
  updateSpreadsheetValues,
  type SpreadsheetValueUpdate,
} from '../drive/drive-api'
import type { Audit, ChecklistStructure } from '../types'
const EXPORT_FOLDER_ID = import.meta.env.VITE_EXPORT_FOLDER_ID || ''
const COMMENT_HEADERS = ['Комментарий Консультанта', 'Комментарий', 'комментарий']
const SCORE_HEADERS = ['Результат (1/0)', 'Результат', 'Статус']

function sanitizePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildExportFileName(audit: Audit): string {
  const date = audit.plannedEnd || audit.created.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const parts = [
    sanitizePart(audit.type),
    sanitizePart(audit.dealership),
    sanitizePart(audit.city || 'Без города'),
    date,
  ].filter(Boolean)

  return parts.join(' - ')
}

export function getExportFolderId(): string {
  return EXPORT_FOLDER_ID
}

function columnToLetters(col: number): string {
  let value = ''
  let current = col + 1
  while (current > 0) {
    const rem = (current - 1) % 26
    value = String.fromCharCode(65 + rem) + value
    current = Math.floor((current - 1) / 26)
  }
  return value
}

function toA1(sheetName: string, rowIndex: number, colIndex: number): string {
  return `'${sheetName.replace(/'/g, "''")}'!${columnToLetters(colIndex)}${rowIndex + 1}`
}

function buildSpreadsheetUpdates(
  templateWb: XLSX.WorkBook,
  structure: ChecklistStructure,
  audit: Audit
): { clearRanges: string[]; updates: SpreadsheetValueUpdate[] } {
  const clearRanges: string[] = []
  const updates: SpreadsheetValueUpdate[] = []

  for (const sheet of structure.sheets) {
    const sheetName = templateWb.SheetNames.find(n => n.includes(sheet.id) || n.includes(sheet.name))
    if (!sheetName) continue
    if (SKIP_SHEETS.some(s => sheetName.includes(s))) continue

    const ws = templateWb.Sheets[sheetName]
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 3) continue

    let headers = (data[1] || []).map(h => h?.toString() ?? null)
    let headerRowIndex = 1
    if (findColumnByHeaders(headers, ITEM_HEADERS) === -1) {
      headers = (data[0] || []).map(h => h?.toString() ?? null)
      headerRowIndex = 0
    }

    const itemCol = findColumnByHeaders(headers, ITEM_HEADERS)
    const commentCol = findColumnByHeaders(headers, COMMENT_HEADERS)
    const scoreCol = findColumnByHeaders(headers, SCORE_HEADERS)

    if (scoreCol === -1 || itemCol === -1) continue

    for (const section of sheet.sections) {
      for (const item of section.items) {
        for (let r = headerRowIndex + 1; r < data.length; r++) {
          if (data[r]?.[itemCol]?.toString()?.trim() !== item.text) continue

          const scoreRange = toA1(sheetName, r, scoreCol)
          clearRanges.push(scoreRange)
          if (commentCol !== -1) clearRanges.push(toA1(sheetName, r, commentCol))

          const answer = audit.answers[item.id]
          if (answer?.value != null) {
            updates.push({ range: scoreRange, values: [[answer.value]] })
          }
          if (commentCol !== -1 && answer?.comment) {
            updates.push({
              range: toA1(sheetName, r, commentCol),
              values: [[answer.comment]],
            })
          }
          break
        }
      }
    }
  }

  return { clearRanges, updates }
}

function normalizeSheetRow(row: (string | number | null)[] | undefined): string[] {
  return (row || []).map((cell) => cell == null ? '' : String(cell).trim())
}

function buildWorkbookLayoutSignature(
  workbook: XLSX.WorkBook,
  structure: ChecklistStructure,
): string {
  return structure.sheets.map((sheet) => {
    const sheetName = workbook.SheetNames.find((name) => name.includes(sheet.id) || name.includes(sheet.name))
    if (!sheetName) return `${sheet.id}:missing`
    const ws = workbook.Sheets[sheetName]
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const firstRows = data.slice(0, 3).map(normalizeSheetRow)
    return JSON.stringify([sheet.id, sheetName, firstRows])
  }).join('|')
}

async function rebuildSpreadsheetFromTemplate(
  targetSpreadsheetId: string,
  templateSpreadsheetId: string,
): Promise<void> {
  const [sourceSheets, targetSheets] = await Promise.all([
    getSpreadsheetSheets(templateSpreadsheetId),
    getSpreadsheetSheets(targetSpreadsheetId),
  ])

  const summarySheet = sourceSheets.find((sheet) => sheet.title === 'Сводный результат')
  const regularSheets = sourceSheets.filter((sheet) => sheet.title !== 'Сводный результат')

  const copiedRegularSheets = await Promise.all(regularSheets.map(async (sourceSheet) => ({
    source: sourceSheet,
    copied: await copySheetToSpreadsheet(templateSpreadsheetId, sourceSheet.sheetId, targetSpreadsheetId),
  })))

  const regularRequests = [
    ...targetSheets.map((sheet) => ({
      deleteSheet: {
        sheetId: sheet.sheetId,
      },
    })),
    ...copiedRegularSheets.map(({ source, copied }, index) => ({
      updateSheetProperties: {
        properties: {
          sheetId: copied.sheetId,
          title: source.title,
          index,
        },
        fields: 'title,index',
      },
    })),
  ]

  await batchUpdateSpreadsheet(targetSpreadsheetId, regularRequests)

  if (!summarySheet) return

  const copiedSummarySheet = await copySheetToSpreadsheet(
    templateSpreadsheetId,
    summarySheet.sheetId,
    targetSpreadsheetId,
  )

  await batchUpdateSpreadsheet(targetSpreadsheetId, [
    {
      updateSheetProperties: {
        properties: {
          sheetId: copiedSummarySheet.sheetId,
          title: summarySheet.title,
          index: 0,
        },
        fields: 'title,index',
      },
    },
  ])
}

export interface ExportAuditResult {
  fileId: string
  fileName: string
  fileUrl: string
  action: 'created' | 'updated'
}

async function findExistingExportFileId(fileName: string): Promise<string> {
  const files = await listFilesInFolder(EXPORT_FOLDER_ID)
  const existing = files.find(file => file.name === fileName && isGoogleSpreadsheetMime(file.mimeType))
  return existing?.id || ''
}

async function resolveExportFileId(audit: Audit, fileName: string): Promise<string> {
  if (audit.exportFileId) {
    try {
      const meta = await getFileMetadata(audit.exportFileId)
      const inExportFolder = Array.isArray(meta.parents) && meta.parents.includes(EXPORT_FOLDER_ID)
      const isActive = meta.trashed !== true
      if (isGoogleSpreadsheetMime(meta.mimeType) && inExportFolder && isActive) {
        return audit.exportFileId
      }
    } catch {
      // File may have been deleted or access may be lost; fall through to folder scan.
    }
  }

  return findExistingExportFileId(fileName)
}

export async function exportAuditToGoogleSheet(
  audit: Audit,
  structure: ChecklistStructure
): Promise<ExportAuditResult> {
  if (!EXPORT_FOLDER_ID) {
    throw new Error('EXPORT_FOLDER_NOT_CONFIGURED')
  }

  const templateBuffer = await downloadFile(structure.driveFileId)
  const templateWb = XLSX.read(templateBuffer, { type: 'array' })
  const { clearRanges, updates } = buildSpreadsheetUpdates(templateWb, structure, audit)
  const fileName = buildExportFileName(audit)

  let fileId = await resolveExportFileId(audit, fileName)
  let action: 'created' | 'updated' = 'updated'
  let isStaleLayout = false

  if (fileId) {
    const existingBuffer = await downloadFile(fileId)
    const existingWb = XLSX.read(existingBuffer, { type: 'array' })
    const templateSignature = buildWorkbookLayoutSignature(templateWb, structure)
    const existingSignature = buildWorkbookLayoutSignature(existingWb, structure)

    if (templateSignature !== existingSignature) {
      isStaleLayout = true
    }
  }

  if (!fileId) {
    fileId = await copySpreadsheetFile(structure.driveFileId, EXPORT_FOLDER_ID, fileName)
    action = 'created'
  } else if (isStaleLayout) {
    await rebuildSpreadsheetFromTemplate(fileId, structure.driveFileId)
  }

  await clearSpreadsheetRanges(fileId, clearRanges)
  await updateSpreadsheetValues(fileId, updates)

  return {
    fileId,
    fileName,
    fileUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
    action,
  }
}

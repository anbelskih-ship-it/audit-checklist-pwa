import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'
import type { Audit, ChecklistStructure } from '../types'

const batchUpdateSpreadsheetMock = vi.fn()
const clearSpreadsheetRangesMock = vi.fn()
const copySpreadsheetFileMock = vi.fn()
const copySheetToSpreadsheetMock = vi.fn()
const deleteFileMock = vi.fn()
const downloadFileMock = vi.fn()
const getFileMetadataMock = vi.fn()
const getSpreadsheetSheetsMock = vi.fn()
const listFilesInFolderMock = vi.fn()
const updateSpreadsheetValuesMock = vi.fn()

vi.mock('../drive/drive-api', () => ({
  batchUpdateSpreadsheet: (...args: unknown[]) => batchUpdateSpreadsheetMock(...args),
  clearSpreadsheetRanges: (...args: unknown[]) => clearSpreadsheetRangesMock(...args),
  copySpreadsheetFile: (...args: unknown[]) => copySpreadsheetFileMock(...args),
  copySheetToSpreadsheet: (...args: unknown[]) => copySheetToSpreadsheetMock(...args),
  deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  downloadFile: (...args: unknown[]) => downloadFileMock(...args),
  getFileMetadata: (...args: unknown[]) => getFileMetadataMock(...args),
  getSpreadsheetSheets: (...args: unknown[]) => getSpreadsheetSheetsMock(...args),
  isGoogleSpreadsheetMime: (mimeType?: string) => mimeType === 'application/vnd.google-apps.spreadsheet',
  listFilesInFolder: (...args: unknown[]) => listFilesInFolderMock(...args),
  updateSpreadsheetValues: (...args: unknown[]) => updateSpreadsheetValuesMock(...args),
}))

function makeWorkbook(rowsBySheet: Record<string, (string | number | null)[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(rowsBySheet)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

const structure: ChecklistStructure = {
  type: 'АСП',
  version: 'v2',
  driveFileId: 'template-file',
  sheets: [
    {
      id: '11',
      name: 'Показатели',
      estimatedTime: '',
      sections: [
        {
          id: '11.1',
          name: 'Использование платформы',
          items: [
            { id: '11.1.1', text: 'Средний срок хранения по проданным АМ', criteria: '' },
          ],
        },
      ],
    },
  ],
}

const audit: Audit = {
  id: 'audit-1',
  name: 'Test',
  type: 'АСП',
  dealership: 'ДЦ',
  city: 'Москва',
  authorUid: 'u1',
  authorName: 'Tester',
  authorEmail: 'test@example.com',
  created: '2026-04-24T00:00:00.000Z',
  updated: '2026-04-24T00:00:00.000Z',
  plannedEnd: '2026-04-30',
  comment: '',
  structureVersion: 'v2',
  status: 'draft',
  exportFileId: 'existing-export',
  answers: {
    '11.1.1': { value: 1, comment: 'Норма' },
  },
}

describe('exportAuditToGoogleSheet', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('VITE_EXPORT_FOLDER_ID', 'folder-1')
    getFileMetadataMock.mockResolvedValue({
      modifiedTime: '2026-04-24T10:00:00.000Z',
      name: 'existing',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: ['folder-1'],
      trashed: false,
    })
    listFilesInFolderMock.mockResolvedValue([])
    copySpreadsheetFileMock.mockResolvedValue('new-export')
    copySheetToSpreadsheetMock.mockResolvedValue({ sheetId: 301, title: 'Copy of 11 Показатели', index: 1 })
    deleteFileMock.mockResolvedValue(undefined)
    getSpreadsheetSheetsMock.mockResolvedValue([
      { sheetId: 201, title: '11 Показатели', index: 0 },
    ])
    batchUpdateSpreadsheetMock.mockResolvedValue(undefined)
    clearSpreadsheetRangesMock.mockResolvedValue(undefined)
    updateSpreadsheetValuesMock.mockResolvedValue(undefined)
  })

  it('rebuilds stale export layout in the same spreadsheet file', async () => {
    const freshTemplate = makeWorkbook({
      '11 Показатели': [
        ['№', 'Шаги процесса / Этапы операций', '№№', 'Операции процесса', 'Комментарий Консультанта', 'Результат (1/0)'],
        [1, 'Использование платформы', 1, 'Средний срок хранения по проданным АМ', '', ''],
      ],
    })

    const staleExport = makeWorkbook({
      '11 Показатели': [
        ['№', 'Старый заголовок', '№№', 'Старый вопрос', 'Комментарий Консультанта', 'Результат (1/0)'],
        [1, 'Старый раздел', 1, 'Старый пункт', '', ''],
      ],
    })

    downloadFileMock.mockImplementation(async (fileId: string) => (
      fileId === 'existing-export' ? staleExport : freshTemplate
    ))

    const { exportAuditToGoogleSheet } = await import('./google-sheet-export')
    await exportAuditToGoogleSheet(audit, structure)

    expect(copySpreadsheetFileMock).not.toHaveBeenCalled()
    expect(deleteFileMock).not.toHaveBeenCalled()
    expect(getSpreadsheetSheetsMock).toHaveBeenNthCalledWith(1, 'template-file')
    expect(getSpreadsheetSheetsMock).toHaveBeenNthCalledWith(2, 'existing-export')
    expect(copySheetToSpreadsheetMock).toHaveBeenCalledWith('template-file', 201, 'existing-export')
    expect(batchUpdateSpreadsheetMock).toHaveBeenCalledWith('existing-export', expect.arrayContaining([
      expect.objectContaining({
        deleteSheet: { sheetId: 201 },
      }),
      expect.objectContaining({
        updateSheetProperties: expect.objectContaining({
          properties: expect.objectContaining({
            sheetId: 301,
            title: '11 Показатели',
            index: 0,
          }),
        }),
      }),
    ]))
    expect(clearSpreadsheetRangesMock).toHaveBeenCalledWith('existing-export', expect.any(Array))
    expect(updateSpreadsheetValuesMock).toHaveBeenCalledWith('existing-export', expect.any(Array))
  })
})

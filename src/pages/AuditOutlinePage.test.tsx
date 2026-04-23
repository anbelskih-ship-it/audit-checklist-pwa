import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuditOutlinePage from './AuditOutlinePage'
import type { Audit, ChecklistStructure } from '../types'

const useAuditMock = vi.fn()
const useStructureMock = vi.fn()
const useAuthMock = vi.fn()
const exportAuditToGoogleSheetMock = vi.fn()
const saveAuditExportMetaMock = vi.fn()

vi.mock('../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}))

vi.mock('../hooks/useStructure', () => ({
  useStructure: (...args: unknown[]) => useStructureMock(...args),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}))

vi.mock('../export/google-sheet-export', () => ({
  exportAuditToGoogleSheet: (...args: unknown[]) => exportAuditToGoogleSheetMock(...args),
  getExportFolderId: () => 'folder-1',
}))

vi.mock('../db/audits', () => ({
  saveAuditExportMeta: (...args: unknown[]) => saveAuditExportMetaMock(...args),
  saveAuditSummary: vi.fn(),
}))

vi.mock('../components/ProgressBar', () => ({
  default: () => <div data-testid="progress-bar" />,
}))

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({ toBlob: vi.fn() })),
}))

vi.mock('../export/pdf-report', () => ({
  AuditPdfReport: () => null,
}))

const structure: ChecklistStructure = {
  type: 'АСП',
  version: 'v1',
  driveFileId: 'drive-1',
  sheets: [
    {
      id: 'sheet-1',
      name: 'Работа руководителя',
      estimatedTime: '1 час',
      sections: [
        {
          id: 'section-1',
          name: 'Секция 1',
          items: [
            { id: 'header-1', text: 'Заголовок', criteria: '' },
            { id: 'item-1', text: 'Пункт 1', criteria: '' },
          ],
        },
      ],
    },
  ],
}

const audit: Audit = {
  id: 'audit-1',
  name: 'Тестовый аудит',
  type: 'АСП',
  dealership: 'ДЦ',
  city: 'Москва',
  authorUid: 'uid-1',
  authorName: 'User',
  authorEmail: 'user@example.com',
  created: '2026-04-17T00:00:00.000Z',
  updated: '2026-04-17T00:00:00.000Z',
  plannedEnd: '2026-04-30',
  comment: '',
  structureVersion: 'v1',
  answers: {
    'item-1': { value: 1, comment: '' },
  },
  status: 'draft',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/audit/audit-1']}>
      <Routes>
        <Route path="/audit/:auditId" element={<AuditOutlinePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuditOutlinePage export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.alert = vi.fn()
    useAuditMock.mockReturnValue({ audit, loading: false })
    useStructureMock.mockReturnValue({ structure, loading: false })
    useAuthMock.mockReturnValue({ login: vi.fn().mockResolvedValue('popup') })
  })

  it('reauthorizes Drive and retries xlsx export on popup devices', async () => {
    const login = vi.fn().mockResolvedValue('popup')
    useAuthMock.mockReturnValue({ login })
    exportAuditToGoogleSheetMock
      .mockRejectedValueOnce(new Error('Drive auth expired'))
      .mockResolvedValueOnce({
        fileId: 'file-1',
        fileName: 'АСП - ДЦ - Москва - 2026-04-30',
        fileUrl: 'https://docs.google.com/spreadsheets/d/file-1/edit',
        action: 'created',
      })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Выгрузить xlsx' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledTimes(1)
      expect(exportAuditToGoogleSheetMock).toHaveBeenCalledTimes(2)
      expect(saveAuditExportMetaMock).toHaveBeenCalledWith('audit-1', {
        exportFileId: 'file-1',
        exportFileName: 'АСП - ДЦ - Москва - 2026-04-30',
        exportUrl: 'https://docs.google.com/spreadsheets/d/file-1/edit',
      })
    })
  })
})

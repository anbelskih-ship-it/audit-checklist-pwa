import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuditViewPage from './AuditViewPage'
import type { Audit, ChecklistStructure } from '../types'

const useAuditRouteDataMock = vi.fn()

vi.mock('../routes/AuditRouteDataProvider', () => ({
  useAuditRouteData: (...args: unknown[]) => useAuditRouteDataMock(...args),
}))

vi.mock('../components/ProgressBar', () => ({
  default: () => <div data-testid="progress-bar" />,
}))

const structure: ChecklistStructure = {
  type: 'АСП',
  version: 'v1',
  driveFileId: 'drive-1',
  sheets: [
    {
      id: 'sheet-1',
      name: 'Лист с зоной роста',
      estimatedTime: '1 час',
      sections: [
        {
          id: 'section-1',
          name: 'Секция 1',
          items: [
            { id: 'header-1', text: 'Заголовок 1', criteria: '' },
            { id: 'item-1', text: 'Проблемный пункт', criteria: '' },
          ],
        },
      ],
    },
    {
      id: 'sheet-2',
      name: 'Лист без зон роста',
      estimatedTime: '1 час',
      sections: [
        {
          id: 'section-2',
          name: 'Секция 2',
          items: [
            { id: 'header-2', text: 'Заголовок 2', criteria: '' },
            { id: 'item-2', text: 'Успешный пункт', criteria: '' },
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
    'item-1': { value: 0, comment: 'Нет контроля' },
    'item-2': { value: 1, comment: '' },
  },
  status: 'draft',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/audit/audit-1/view']}>
      <Routes>
        <Route path="/audit/:auditId/view" element={<AuditViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuditViewPage', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
    useAuditRouteDataMock.mockReturnValue({
      audit,
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: vi.fn(),
    })
  })

  it('shows issue details immediately when growth areas mode is enabled', () => {
    renderPage()

    const switchButton = screen.getByRole('switch', { name: 'Только зоны роста' })
    fireEvent.click(switchButton)

    expect(switchButton).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Проблемный пункт')).toBeInTheDocument()
    expect(screen.getByText('Нет контроля')).toBeInTheDocument()
    expect(screen.queryByText('Лист без зон роста')).not.toBeInTheDocument()
  })
})

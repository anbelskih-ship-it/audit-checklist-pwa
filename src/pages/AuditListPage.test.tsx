import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuditListPage from './AuditListPage'
import type { Audit, ChecklistStructure } from '../types'

const listAuditsMock = vi.fn()
const createAuditMock = vi.fn()
const useAuthMock = vi.fn()
const useAppUserMock = vi.fn()
const listAllowedUsersMock = vi.fn()
const loadStructureWithSyncMock = vi.fn()
const useOnlineMock = vi.fn()
const progressBarMock = vi.fn()

vi.mock('../db/audits', () => ({
  listAudits: (...args: unknown[]) => listAuditsMock(...args),
  createAudit: (...args: unknown[]) => createAuditMock(...args),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}))

vi.mock('../app-user-context', () => ({
  useAppUser: (...args: unknown[]) => useAppUserMock(...args),
}))

vi.mock('../db/users', () => ({
  listAllowedUsers: (...args: unknown[]) => listAllowedUsersMock(...args),
}))

vi.mock('../hooks/useStructure', () => ({
  loadStructureWithSync: (...args: unknown[]) => loadStructureWithSyncMock(...args),
}))

vi.mock('../hooks/useOnline', () => ({
  useOnline: (...args: unknown[]) => useOnlineMock(...args),
}))

vi.mock('../components/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle" />,
}))

vi.mock('../components/ProgressBar', () => ({
  default: (props: unknown) => {
    progressBarMock(props)
    return <div data-testid="progress-bar" />
  },
}))

const structure: ChecklistStructure = {
  type: 'АСП',
  version: 'v1',
  driveFileId: 'drive-1',
  sheets: [
    {
      id: '01',
      name: 'Лист',
      estimatedTime: '1 час',
      sections: [
        {
          id: '01.1',
          name: 'Раздел',
          items: [
            { id: 'item-1', text: 'Пункт 1', criteria: '' },
            { id: 'item-2', text: 'Пункт 2', criteria: '' },
            { id: 'item-3', text: 'Пункт 3', criteria: '' },
            { id: 'item-4', text: 'Пункт 4', criteria: '' },
          ],
        },
      ],
    },
  ],
}

const audit: Audit = {
  id: 'audit-1',
  name: 'Тест',
  type: 'АСП',
  dealership: 'Тест',
  city: 'Москва',
  authorUid: 'uid-1',
  authorName: 'Екатерина Есипенко',
  authorEmail: 'user@example.com',
  created: '2026-04-24T00:00:00.000Z',
  updated: '2026-04-24T00:00:00.000Z',
  plannedEnd: '2026-04-30',
  comment: '',
  structureVersion: 'v1',
  status: 'draft',
  answers: {
    'item-1': { value: 1, comment: '' },
    'item-2': { value: 1, comment: '' },
    'item-3': { value: 0, comment: '' },
  },
}

describe('AuditListPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })
    listAuditsMock.mockResolvedValue({ audits: [audit], nextCursor: null })
    createAuditMock.mockReset()
    useAuthMock.mockReturnValue({ logout: vi.fn() })
    useAppUserMock.mockReturnValue({
      uid: 'uid-1',
      email: 'user@example.com',
      name: 'Екатерина Есипенко',
      displayName: 'Екатерина Есипенко',
      role: 'auditor',
    })
    listAllowedUsersMock.mockResolvedValue([])
    loadStructureWithSyncMock.mockImplementation(async (type: 'АСП' | 'НА', _canSync: boolean, options?: { onFresh?: (structure: ChecklistStructure) => void }) => {
      if (type !== 'АСП') return null
      options?.onFresh?.(structure)
      return structure
    })
    useOnlineMock.mockReturnValue(true)
    progressBarMock.mockReset()
  })

  it('uses score percent for the main card progress bar', async () => {
    render(
      <MemoryRouter>
        <AuditListPage />
      </MemoryRouter>,
    )

    await screen.findByText('Результат:')

    await waitFor(() => {
      expect(progressBarMock).toHaveBeenCalled()
    })

    expect(progressBarMock).toHaveBeenCalledWith(expect.objectContaining({
      filled: 67,
      total: 100,
      hideLabel: true,
    }))
  })
})

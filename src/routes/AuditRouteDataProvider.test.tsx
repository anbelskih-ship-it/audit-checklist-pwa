import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuditRouteDataProvider, useAuditRouteData } from './AuditRouteDataProvider'
import type { Audit, ChecklistStructure } from '../types'

const useAuditMock = vi.fn()
const useStructureMock = vi.fn()

vi.mock('../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}))

vi.mock('../hooks/useStructure', () => ({
  useStructure: (...args: unknown[]) => useStructureMock(...args),
}))

const audit: Audit = {
  id: 'audit-1',
  name: 'Тестовый аудит',
  type: 'АСП',
  dealership: 'ДЦ',
  city: 'Москва',
  authorUid: 'uid-1',
  authorName: 'User',
  authorEmail: 'user@example.com',
  created: '2026-04-24T00:00:00.000Z',
  updated: '2026-04-24T00:00:00.000Z',
  plannedEnd: '2026-04-30',
  comment: '',
  structureVersion: 'v1',
  answers: {},
  status: 'draft',
}

const structure: ChecklistStructure = {
  type: 'АСП',
  version: 'v1',
  driveFileId: 'drive-1',
  sheets: [],
}

function Probe() {
  const { audit, structure } = useAuditRouteData()
  return <div>{audit?.id}:{structure?.version}</div>
}

describe('AuditRouteDataProvider', () => {
  it('provides shared audit and structure data for nested audit routes', () => {
    useAuditMock.mockReturnValue({
      audit,
      loading: false,
      saveAnswer: vi.fn(),
    })
    useStructureMock.mockReturnValue({
      structure,
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/audit/audit-1']}>
        <Routes>
          <Route path="/audit/:auditId" element={<AuditRouteDataProvider />}>
            <Route index element={<Probe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('audit-1:v1')).toBeInTheDocument()
    expect(useAuditMock).toHaveBeenCalledWith('audit-1')
    expect(useStructureMock).toHaveBeenCalledWith('АСП', 'v1')
  })
})

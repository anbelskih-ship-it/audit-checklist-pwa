import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ItemFillPage from './ItemFillPage'
import type { Audit, ChecklistStructure } from '../types'

const saveAnswerMock = vi.fn()
const useAuditRouteDataMock = vi.fn()

vi.mock('../routes/AuditRouteDataProvider', () => ({
  useAuditRouteData: (...args: unknown[]) => useAuditRouteDataMock(...args),
}))

vi.mock('../hooks/useSwipe', () => ({
  useSwipe: () => ({}),
}))

vi.mock('../components/SearchDialog', () => ({
  default: () => null,
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
      name: 'Лист 1',
      estimatedTime: '1 час',
      sections: [
        {
          id: 'section-1',
          name: 'Секция 1',
          items: [
            { id: 'header-1', text: 'Заголовок секции', criteria: '' },
            { id: 'item-1', text: 'Проверяемый пункт', criteria: 'Критерий' },
          ],
        },
      ],
    },
  ],
}

function createAudit(answer: Audit['answers'][string]): Audit {
  return {
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
      'item-1': answer,
    },
    status: 'draft',
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/audit/audit-1/fill/item-1']}>
      <Routes>
        <Route path="/audit/:auditId/fill/:itemId" element={<ItemFillPage />} />
        <Route path="/audit/:auditId" element={<div>Оглавление аудита</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ItemFillPage', () => {
  beforeEach(() => {
    saveAnswerMock.mockReset()
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
  })

  it('renders CommentComposer controls and keeps current answer comment in the field', () => {
    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: 1, comment: 'Текущий комментарий' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    expect(screen.getByRole('button', { name: 'Дополнить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Переписать' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Текущий комментарий')
  })

  it('persists the latest local comment on blur', async () => {
    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: 0, comment: 'Старый комментарий' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    const textbox = screen.getByRole('textbox', { name: 'Комментарий' })
    fireEvent.change(textbox, { target: { value: 'Обновлённый комментарий' } })
    fireEvent.blur(textbox)

    await waitFor(() => {
      expect(saveAnswerMock).toHaveBeenCalledWith('item-1', {
        value: 0,
        comment: 'Обновлённый комментарий',
      })
    })
  })

  it('drops a stale local draft after the audit comment is refreshed from source of truth', async () => {
    let currentAudit = createAudit({ value: 0, comment: 'Старый комментарий' })
    useAuditRouteDataMock.mockImplementation(() => ({
      audit: currentAudit,
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    }))

    const view = renderPage()

    const textbox = screen.getByRole('textbox', { name: 'Комментарий' })
    fireEvent.change(textbox, { target: { value: 'Локальный draft' } })
    expect(textbox).toHaveValue('Локальный draft')

    currentAudit = createAudit({ value: 0, comment: 'Комментарий с сервера' })
    view.rerender(
      <MemoryRouter initialEntries={['/audit/audit-1/fill/item-1']}>
        <Routes>
          <Route path="/audit/:auditId/fill/:itemId" element={<ItemFillPage />} />
          <Route path="/audit/:auditId" element={<div>Оглавление аудита</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Комментарий с сервера')
    })
  })

  it('passes the latest comment to handleScore after a composer phrase selection', async () => {
    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: null, comment: '' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    fireEvent.click(screen.getByRole('button', { name: 'Нет регулярности' }))
    fireEvent.click(screen.getByRole('button', { name: 'Да' }))

    await waitFor(() => {
      expect(saveAnswerMock).toHaveBeenCalledWith('item-1', {
        value: 1,
        comment: 'Нет регулярности',
      })
    })
  })

  it('saves phrase-driven comment changes without waiting for a later textarea blur', async () => {
    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: null, comment: '' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    fireEvent.click(screen.getByRole('button', { name: 'Нет регулярности' }))

    await waitFor(() => {
      expect(saveAnswerMock).toHaveBeenCalledWith('item-1', {
        value: null,
        comment: 'Нет регулярности',
      })
    })
  })

  it('clears phrase highlight and persisted comment after deselecting the phrase', async () => {
    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: null, comment: '' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    const phrase = screen.getByRole('button', { name: 'Нет регулярности' })

    fireEvent.click(phrase)
    fireEvent.click(phrase)

    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('')
    expect(phrase).toHaveAttribute('aria-pressed', 'false')

    await waitFor(() => {
      expect(saveAnswerMock).toHaveBeenLastCalledWith('item-1', {
        value: null,
        comment: '',
      })
    })
  })

  it('saves voice-driven comment changes after a final transcript', async () => {
    class FakeRecognition {
      static instances: FakeRecognition[] = []
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult: ((event: { results: { 0: { 0: { transcript: string }; isFinal: boolean }; length: number }; resultIndex: number }) => void) | null = null
      onerror = null
      onend: (() => void) | null = null

      constructor() {
        FakeRecognition.instances.push(this)
      }

      start() {}

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: null, comment: '' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))

    act(() => {
      FakeRecognition.instances.at(-1)?.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: 'Голосовой комментарий' },
            isFinal: true,
          },
          length: 1,
        },
      })
    })

    await waitFor(() => {
      expect(saveAnswerMock).toHaveBeenCalledWith('item-1', {
        value: null,
        comment: 'Голосовой комментарий',
      })
    })

    delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition
  })

  it('returns to the audit outline from the last item', async () => {
    useAuditRouteDataMock.mockReturnValue({
      audit: createAudit({ value: 1, comment: '' }),
      auditLoading: false,
      structure,
      structureLoading: false,
      saveAnswer: saveAnswerMock,
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Завершить →' }))

    expect(await screen.findByText('Оглавление аудита')).toBeInTheDocument()
  })
})

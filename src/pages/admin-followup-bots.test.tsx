// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppUserContext } from '../App'
import AdminFollowupBotsPage from './AdminFollowupBotsPage'

const appUser = {
  uid: 'admin-1',
  email: 'admin@example.com',
  role: 'admin' as const,
  name: 'Админ',
  displayName: 'Админ',
  photoURL: '',
}

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>, container: HTMLDivElement }> = []

function renderPage() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ root, container })

  act(() => {
    root.render(
      <AppUserContext.Provider value={appUser}>
        <MemoryRouter>
          <AdminFollowupBotsPage />
        </MemoryRouter>
      </AppUserContext.Provider>,
    )
  })

  return container
}

function changeValue(container: Element, selector: string, value: string) {
  const input = container.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null
  if (!input) throw new Error(`Missing element: ${selector}`)
  const prototype = Object.getPrototypeOf(input)
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!valueSetter) throw new Error(`Missing value setter: ${selector}`)
  act(() => {
    valueSetter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  return input
}

afterEach(() => {
  while (mountedRoots.length > 0) {
    const current = mountedRoots.pop()
    if (!current) break
    act(() => current.root.unmount())
    current.container.remove()
  }
})

describe('AdminFollowupBotsPage', () => {
  it('renders follow-up projects, lifecycle chain and creation form', () => {
    const container = renderPage()

    expect(container.textContent).toContain('Follow-up бот')
    expect(container.textContent).toContain('АтлантикPRO')
    expect(container.textContent).toContain('pending_connect')
    expect(container.textContent).toContain('Bot health')
    expect(container.querySelector('#followup-client')).not.toBeNull()
    expect(container.querySelector('#followup-plan')).not.toBeNull()
    expect(container.querySelector('#followup-transport')).not.toBeNull()
    const createButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Создать проект')
    expect(createButton?.hasAttribute('disabled')).toBe(true)
  })

  it('enables project creation when required fields are filled', () => {
    const container = renderPage()

    changeValue(container, '#followup-client', 'Новый клиент')
    changeValue(container, '#followup-plan', 'https://docs.google.com/spreadsheets/d/test/edit')
    changeValue(container, '#followup-transport', '@client_transport')
    changeValue(container, '#followup-regular', '2026-04-25T10:00')

    const createButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Создать проект')
    expect(createButton?.hasAttribute('disabled')).toBe(false)
  })
})

import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const useAuthMock = vi.fn()
const getAllowedUserMock = vi.fn()
const logoutMock = vi.fn()

vi.mock('./hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}))

vi.mock('./db/users', async () => {
  const actual = await vi.importActual<typeof import('./db/users')>('./db/users')
  return {
    ...actual,
    getAllowedUser: (...args: unknown[]) => getAllowedUserMock(...args),
  }
})

vi.mock('./drive/sync', () => ({
  configureMasterFiles: vi.fn(),
  syncStructures: vi.fn(),
}))

vi.mock('./pages/AuditListPage', () => ({
  default: () => <div>Список аудитов</div>,
}))

vi.mock('./pages/AuditOutlinePage', () => ({
  default: () => <div>Оглавление</div>,
}))

vi.mock('./pages/AuditSettingsPage', () => ({
  default: () => <div>Настройки</div>,
}))

vi.mock('./pages/ItemFillPage', () => ({
  default: () => <div>Заполнение</div>,
}))

vi.mock('./pages/AuditViewPage', () => ({
  default: () => <div>Просмотр</div>,
}))

vi.mock('./pages/AdminUsersPage', () => ({
  default: () => <div>Админ пользователи</div>,
}))

vi.mock('./pages/AdminFollowupBotsPage', () => ({
  default: () => <div>Админ боты</div>,
}))

vi.mock('./pages/LoginPage', () => ({
  default: () => <div>Логин</div>,
}))

vi.mock('./components/VersionToast', () => ({
  default: () => null,
}))

vi.mock('./components/InstallPrompt', () => ({
  default: () => null,
}))

describe('App', () => {
  beforeEach(() => {
    logoutMock.mockReset()
    useAuthMock.mockReturnValue({
      user: {
        uid: 'uid-1',
        email: 'user@example.com',
        displayName: 'User',
        photoURL: '',
      },
      loading: false,
      logout: logoutMock,
    })
    getAllowedUserMock.mockReset()
  })

  it('shows access check fallback instead of staying on loading when role lookup fails', async () => {
    getAllowedUserMock.mockRejectedValue(new Error('permission-denied'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Не удалось проверить доступ')).toBeInTheDocument()
    })
    expect(screen.queryByText('Загрузка...')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })
})

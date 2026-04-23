import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CommentComposer from './CommentComposer'

interface HarnessProps {
  initialValue?: string
  onChange?: (nextValue: string) => void
  onBlur?: (nextValue: string) => void
}

function Harness({ initialValue = '', onChange, onBlur }: HarnessProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <CommentComposer
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue)
        onChange?.(nextValue)
      }}
      onBlur={onBlur}
    />
  )
}

describe('CommentComposer', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  })

  it('stops active recognition when switching away from voice while listening', () => {
    const stop = vi.fn()

    class FakeRecognition {
      static instances: FakeRecognition[] = []
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult = null
      onerror = null
      onend = null
      start = vi.fn()
      stop = stop

      constructor() {
        FakeRecognition.instances.push(this)
      }
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))
    fireEvent.click(screen.getByRole('button', { name: 'Текст' }))

    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('leaves listening state when recognition ends naturally', () => {
    class FakeRecognition {
      static instances: FakeRecognition[] = []
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult: ((event: never) => void) | null = null
      onerror = null
      onend: (() => void) | null = null

      constructor() {
        FakeRecognition.instances.push(this)
      }

      start() {}

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))
    act(() => {
      FakeRecognition.instances.at(-1)?.onend?.()
    })

    expect(screen.getByText('Поддерживается')).toBeInTheDocument()
    expect(screen.getByText('Голосовой ввод доступен. Нажмите «Начать запись», чтобы добавить фразу.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Начать запись' })).toBeInTheDocument()
  })

  it('shows a controlled error state when recognition start throws', () => {
    class FakeRecognition {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult = null
      onerror = null
      onend = null

      start() {
        throw new Error('start failed')
      }

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))

    expect(screen.getByText('Ошибка')).toBeInTheDocument()
    expect(screen.getByText('Ошибка голосового ввода: start failed')).toBeInTheDocument()
  })

  it('ignores stale callbacks from an old recognition session after a new one starts', () => {
    class FakeRecognition {
      static instances: FakeRecognition[] = []
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult = null
      onerror: ((event: { error: string; message?: string }) => void) | null = null
      onend: (() => void) | null = null

      constructor() {
        FakeRecognition.instances.push(this)
      }

      start() {}

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))
    const sessionA = FakeRecognition.instances.at(-1)
    const staleOnError = sessionA?.onerror
    const staleOnEnd = sessionA?.onend

    fireEvent.click(screen.getByRole('button', { name: 'Текст' }))
    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))

    act(() => {
      staleOnError?.({ error: 'network', message: 'Старая ошибка' })
      staleOnEnd?.()
    })

    expect(screen.getByText('Запись')).toBeInTheDocument()
    expect(screen.getByText('Идёт запись. Говорите короткими фразами.')).toBeInTheDocument()
    expect(screen.queryByText('Старая ошибка')).not.toBeInTheDocument()
  })

  it('uses unique textarea ids for multiple component instances', () => {
    render(
      <>
        <Harness initialValue="Первый" />
        <Harness initialValue="Второй" />
      </>,
    )

    const [first, second] = screen.getAllByRole('textbox', { name: 'Комментарий' })

    expect(first).toHaveAttribute('id')
    expect(second).toHaveAttribute('id')
    expect(first.getAttribute('id')).not.toBe(second.getAttribute('id'))
  })

  it('shows a distinct ready state when voice input is supported', () => {
    class FakeRecognition {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult = null
      onerror = null
      onend = null

      start() {}

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))

    expect(screen.getByText('Голосовой ввод доступен. Нажмите «Начать запись», чтобы добавить фразу.')).toBeInTheDocument()
  })

  it('keeps the old comment visible as a preview after switching to rewrite before first input', () => {
    render(<Harness initialValue="Текущий комментарий" />)

    fireEvent.click(screen.getByRole('button', { name: 'Переписать' }))

    expect(screen.getAllByText('Текущий комментарий')).toHaveLength(2)
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('')
  })

  it('calls onChange with the appended value in append mode', () => {
    const onChange = vi.fn()

    render(<Harness initialValue="База" onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Комментарий' }), {
      target: { value: 'База и дополнение' },
    })

    expect(onChange).toHaveBeenCalledWith('База и дополнение')
  })

  it('does not call onChange when switching to rewrite until the first meaningful input', () => {
    const onChange = vi.fn()

    render(<Harness initialValue="База" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Переписать' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('База')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('')
  })

  it('replaces the old comment with the first rewrite phrase', () => {
    const onChange = vi.fn()

    render(<Harness initialValue="База" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Переписать' }))
    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    fireEvent.click(screen.getByRole('button', { name: 'Нет контроля' }))

    expect(onChange).toHaveBeenCalledWith('Нет контроля')
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Нет контроля')
  })

  it('calls onBlur with the committed phrase value after a phrase selection', () => {
    const onBlur = vi.fn()

    render(<Harness initialValue="База" onBlur={onBlur} />)

    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    fireEvent.click(screen.getByRole('button', { name: 'Нет контроля' }))

    expect(onBlur).toHaveBeenCalledWith('База, Нет контроля')
  })

  it('calls onBlur with the committed value after a final voice transcript', () => {
    const onBlur = vi.fn()

    class FakeRecognition {
      static instances: FakeRecognition[] = []
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult: ((event: { results: { 0: { 0: { transcript: string }; isFinal: boolean }; length: number }; resultIndex: number }) => void) | null = null
      onerror = null
      onend = null

      constructor() {
        FakeRecognition.instances.push(this)
      }

      start() {}

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" onBlur={onBlur} />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))

    act(() => {
      FakeRecognition.instances.at(-1)?.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: 'Голос' },
            isFinal: true,
          },
          length: 1,
        },
      })
    })

    expect(onBlur).toHaveBeenCalledWith('База, Голос')
  })

  it('commits the last voice draft when the user stops recording manually', () => {
    const onBlur = vi.fn()

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

    render(<Harness initialValue="База" onBlur={onBlur} />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))

    act(() => {
      FakeRecognition.instances.at(-1)?.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: 'Черновая фраза' },
            isFinal: false,
          },
          length: 1,
        },
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Остановить запись' }))

    expect(onBlur).toHaveBeenCalledWith('База, Черновая фраза')
  })

  it('commits the last voice draft after 3 seconds of silence', () => {
    vi.useFakeTimers()
    const onBlur = vi.fn()

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

    render(<Harness initialValue="База" onBlur={onBlur} />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать запись' }))

    act(() => {
      FakeRecognition.instances.at(-1)?.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: 'Фраза после тишины' },
            isFinal: false,
          },
          length: 1,
        },
      })
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(onBlur).toHaveBeenCalledWith('База, Фраза после тишины')
  })

  it('highlights selected phrases and does not duplicate them on repeated click', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    const phrase = screen.getByRole('button', { name: 'Нет контроля' })

    fireEvent.click(phrase)
    fireEvent.click(phrase)

    expect(phrase).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Нет контроля')
  })

  it('keeps short phrases compact and leaves long phrases wide in the given order', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))

    const phraseButtons = screen.getAllByRole('button').map((button) => button.textContent).filter(Boolean)
    expect(phraseButtons).toContain('Нет регламента')
    expect(phraseButtons).toContain('Есть, не используется')

    expect(screen.getByRole('button', { name: 'Нет контроля' }).className).not.toContain('comment-composer__phrase--wide')
    expect(screen.getByRole('button', { name: 'Нет ответственного' }).className).toContain('comment-composer__phrase--wide')
    expect(screen.getByRole('button', { name: 'Есть, не используется' }).className).toContain('comment-composer__phrase--wide')
  })

  it('shows a fallback message when voice input is unsupported', () => {
    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))

    expect(screen.getByText('Голосовой ввод недоступен на этом устройстве.')).toBeInTheDocument()
  })

  it('lets the user rewrite first, then switch to append and continue editing the new version', () => {
    const onChange = vi.fn()

    render(<Harness initialValue="Старый комментарий" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Переписать' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Комментарий' }), {
      target: { value: 'Новая версия' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Дополнить' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Комментарий' }), {
      target: { value: 'Новая версия и детали' },
    })

    expect(onChange).toHaveBeenNthCalledWith(1, 'Новая версия')
    expect(onChange).toHaveBeenNthCalledWith(2, 'Новая версия и детали')
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Новая версия и детали')
  })
})

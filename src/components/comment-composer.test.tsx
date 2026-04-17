import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CommentComposer from './CommentComposer'

interface HarnessProps {
  initialValue?: string
  onChange?: (nextValue: string) => void
  onBlur?: () => void
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
  afterEach(() => {
    delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  })

  it('shows a distinct ready state when voice input is supported', () => {
    class FakeRecognition {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult = null
      onerror = null

      start() {}

      stop() {}
    }

    ;(window as typeof window & { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition = FakeRecognition

    render(<Harness initialValue="База" />)

    fireEvent.click(screen.getByRole('button', { name: 'Голос' }))

    expect(screen.getByText('Голосовой ввод доступен. Нажмите «Начать запись», чтобы добавить фразу.')).toBeInTheDocument()
  })

  it('keeps the old comment visible after switching to rewrite before first input', () => {
    render(<Harness initialValue="Текущий комментарий" />)

    fireEvent.click(screen.getByRole('button', { name: 'Переписать' }))

    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Текущий комментарий')
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
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('База')
  })

  it('replaces the old comment with the first rewrite phrase', () => {
    const onChange = vi.fn()

    render(<Harness initialValue="База" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Переписать' }))
    fireEvent.click(screen.getByRole('button', { name: 'Фразы' }))
    fireEvent.click(screen.getByRole('button', { name: 'Нет регулярного контроля' }))

    expect(onChange).toHaveBeenCalledWith('Нет регулярного контроля')
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveValue('Нет регулярного контроля')
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

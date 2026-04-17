import { describe, expect, it, vi } from 'vitest'
import {
  createConfiguredRecognition,
  getSpeechRecognitionCtor,
  normalizeTranscript,
} from './comment-voice'

describe('comment-voice', () => {
  it('returns null when speech recognition is unavailable', () => {
    expect(getSpeechRecognitionCtor({} as Window)).toBeNull()
  })

  it('supports SpeechRecognition on window', () => {
    const ctor = vi.fn()

    expect(getSpeechRecognitionCtor({
      SpeechRecognition: ctor,
    } as unknown as Window)).toBe(ctor)
  })

  it('supports webkitSpeechRecognition on window', () => {
    const ctor = vi.fn()

    expect(getSpeechRecognitionCtor({
      webkitSpeechRecognition: ctor,
    } as unknown as Window)).toBe(ctor)
  })

  it('normalizes transcript text', () => {
    expect(normalizeTranscript('  Привет\n\nмир   ')).toBe('Привет мир')
  })

  it('returns null when configured recognition is unavailable', () => {
    expect(createConfiguredRecognition({} as Window)).toBeNull()
  })

  it('creates a configured recognition instance from SpeechRecognition', () => {
    class FakeRecognition {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult: unknown = 'unset'
      onerror: unknown = 'unset'

      start() {}

      stop() {}
    }

    const recognition = createConfiguredRecognition({
      SpeechRecognition: FakeRecognition,
    })

    expect(recognition).toBeInstanceOf(FakeRecognition)
    expect(recognition?.lang).toBe('ru-RU')
    expect(recognition?.continuous).toBe(false)
    expect(recognition?.interimResults).toBe(true)
    expect(recognition?.maxAlternatives).toBe(1)
    expect(recognition?.onresult).toBeNull()
    expect(recognition?.onerror).toBeNull()
    expect(recognition?.start).toBeTypeOf('function')
    expect(recognition?.stop).toBeTypeOf('function')
  })

  it('creates a configured recognition instance from webkitSpeechRecognition', () => {
    class FakeWebkitRecognition {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 0
      onresult: unknown = 'unset'
      onerror: unknown = 'unset'

      start() {}

      stop() {}
    }

    const recognition = createConfiguredRecognition({
      webkitSpeechRecognition: FakeWebkitRecognition,
    })

    expect(recognition).toBeInstanceOf(FakeWebkitRecognition)
    expect(recognition?.lang).toBe('ru-RU')
    expect(recognition?.continuous).toBe(false)
    expect(recognition?.interimResults).toBe(true)
    expect(recognition?.maxAlternatives).toBe(1)
    expect(recognition?.onresult).toBeNull()
    expect(recognition?.onerror).toBeNull()
  })
})

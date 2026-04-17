import { describe, expect, it, vi } from 'vitest'
import {
  createConfiguredRecognition,
  getSpeechRecognitionCtor,
  normalizeTranscript,
  type SpeechRecognitionEventLike,
} from './comment-voice'

describe('comment-voice', () => {
  it('returns null when speech recognition is unavailable', () => {
    expect(getSpeechRecognitionCtor({})).toBeNull()
  })

  it('supports SpeechRecognition on window', () => {
    const ctor = vi.fn()

    expect(getSpeechRecognitionCtor({ SpeechRecognition: ctor })).toBe(ctor)
  })

  it('supports webkitSpeechRecognition on window', () => {
    const ctor = vi.fn()

    expect(getSpeechRecognitionCtor({ webkitSpeechRecognition: ctor })).toBe(ctor)
  })

  it('normalizes transcript text', () => {
    expect(normalizeTranscript('  Привет\n\nмир   ')).toBe('Привет мир')
  })

  it('returns null when configured recognition is unavailable', () => {
    expect(createConfiguredRecognition({})).toBeNull()
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

  it('models the result event with transcript and finality at the expected levels', () => {
    const event: SpeechRecognitionEventLike = {
      resultIndex: 0,
      results: [
        {
          0: {
            confidence: 0.9,
            transcript: 'Привет мир',
          },
          isFinal: true,
          length: 1,
        },
      ],
    }

    expect(event.results[0].isFinal).toBe(true)
    expect(event.results[0][0].transcript).toBe('Привет мир')
    expect(event.results[0][0].confidence).toBe(0.9)
  })
})

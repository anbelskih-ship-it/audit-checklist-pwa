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

  it('creates a configured recognition instance with ru-RU language', () => {
    class FakeRecognition {
      lang = ''
    }

    const recognition = createConfiguredRecognition({
      SpeechRecognition: FakeRecognition,
    } as unknown as Window)

    expect(recognition).toBeInstanceOf(FakeRecognition)
    expect(recognition?.lang).toBe('ru-RU')
  })
})

export interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionResultLike {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

export interface SpeechRecognitionResultListLike {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}

export interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultListLike
  resultIndex: number
}

export interface SpeechRecognitionErrorEventLike {
  error: string
  message?: string
}

export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

export interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike
}

export type SpeechRecognitionSource = {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

export function getSpeechRecognitionCtor(source: SpeechRecognitionSource): SpeechRecognitionCtor | null {
  return source.SpeechRecognition ?? source.webkitSpeechRecognition ?? null
}

export function normalizeTranscript(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export function createConfiguredRecognition(source: SpeechRecognitionSource): SpeechRecognitionLike | null {
  const ctor = getSpeechRecognitionCtor(source)
  if (!ctor) return null

  const recognition = new ctor()
  recognition.lang = 'ru-RU'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  recognition.onresult = null
  recognition.onerror = null
  recognition.onend = null
  return recognition
}

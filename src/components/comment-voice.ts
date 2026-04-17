export interface SpeechRecognitionLike {
  lang: string
}

export interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

export function getSpeechRecognitionCtor(win: Window): SpeechRecognitionCtor | null {
  const speechWindow = win as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function normalizeTranscript(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export function createConfiguredRecognition(win: Window): SpeechRecognitionLike | null {
  const ctor = getSpeechRecognitionCtor(win)
  if (!ctor) return null

  const recognition = new ctor()
  recognition.lang = 'ru-RU'
  return recognition
}

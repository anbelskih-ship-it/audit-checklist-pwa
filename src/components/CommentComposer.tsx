import { useEffect, useId, useRef, useState } from 'react'
import {
  applyPhraseSelection,
  removePhraseSelection,
  applyTextInput,
  applyVoiceTranscript,
  createComposerState,
  getCommittedComment,
  getVisibleComment,
  setMode,
  type CommentComposerState,
  type CommentEditMode,
} from './comment-composer-state'
import {
  createConfiguredRecognition,
  normalizeTranscript,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
  type SpeechRecognitionSource,
} from './comment-voice'

type InputMethod = 'text' | 'phrases' | 'voice'
type VoiceStatus = 'idle' | 'ready' | 'listening' | 'unsupported' | 'error'

const PHRASES = [
  { label: 'Нет регламента', wide: false },
  { label: 'Нет отчётности', wide: false },
  { label: 'Нет процесса', wide: false },
  { label: 'Не обучены', wide: false },
  { label: 'Нет ответственного', wide: true },
  { label: 'Не зафиксировано', wide: false },
  { label: 'Нет регулярности', wide: false },
  { label: 'Нет контроля', wide: false },
  { label: 'Нет аналитики', wide: false },
  { label: 'Не актуально', wide: true },
  { label: 'Есть, не используется', wide: true },
  { label: 'Аутсорсинг', wide: false },
  { label: 'Внедряется', wide: false },
] as const

interface CommentComposerProps {
  value: string
  onChange: (nextValue: string) => void
  onBlur?: (nextValue: string) => void
}

function resolveComposerState(state: CommentComposerState, value: string): CommentComposerState {
  return value === state.workingComment ? state : createComposerState(value)
}

function buildChunk(state: CommentComposerState, text: string): string {
  const chunk = text.trim()

  if (!chunk) return ''
  if (state.mode === 'rewrite' && !state.rewriteStarted) return chunk

  const comment = state.workingComment.trim()
  if (!comment) return chunk
  if (comment.endsWith(',')) return ` ${chunk}`
  return `, ${chunk}`
}

function getPhraseSource(state: CommentComposerState): string {
  if (state.mode === 'rewrite' && !state.rewriteStarted) return ''
  return getCommittedComment(state)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasPhrase(source: string, phrase: string): boolean {
  return new RegExp(`(^|,\\s*)${escapeRegExp(phrase)}(?=,\\s*|$)`).test(source)
}

function getSelectedPhrases(state: CommentComposerState): Set<string> {
  const source = getPhraseSource(state)
  return new Set(PHRASES.map((phrase) => phrase.label).filter((phrase) => hasPhrase(source, phrase)))
}

function getVoiceMessage(status: VoiceStatus, errorMessage: string): string {
  switch (status) {
    case 'ready':
      return 'Голосовой ввод доступен. Нажмите «Начать запись», чтобы добавить фразу.'
    case 'unsupported':
      return 'Голосовой ввод недоступен на этом устройстве.'
    case 'listening':
      return 'Идёт запись. Говорите короткими фразами.'
    case 'error':
      return errorMessage || 'Не удалось получить голосовой ввод.'
    default:
      return 'Нажмите кнопку записи, чтобы добавить комментарий голосом.'
  }
}

function getVoiceErrorMessage(event: SpeechRecognitionErrorEventLike): string {
  switch (event.error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Нет доступа к микрофону. Разрешите микрофон для этой страницы и попробуйте снова.'
    case 'audio-capture':
      return 'Микрофон не найден или недоступен.'
    case 'network':
      return 'Не удалось обратиться к сервису распознавания. Проверьте интернет и попробуйте снова.'
    case 'no-speech':
      return 'Речь не распознана. Попробуйте говорить ближе к микрофону.'
    default:
      return event.message || `Ошибка голосового ввода: ${event.error}`
  }
}

function getVoiceStatusLabel(status: VoiceStatus): string {
  switch (status) {
    case 'ready':
      return 'Поддерживается'
    case 'listening':
      return 'Запись'
    case 'unsupported':
      return 'Недоступно'
    case 'error':
      return 'Ошибка'
    default:
      return 'Ожидание'
  }
}

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className={`comment-composer__toggle-group comment-composer__toggle-group--${options.length}`} role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`comment-composer__toggle ${value === option.value ? 'comment-composer__toggle--active' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function CommentComposer({ value, onChange, onBlur }: CommentComposerProps) {
  const VOICE_SILENCE_MS = 3000
  const [composerState, setComposerState] = useState(() => createComposerState(value))
  const [inputMethod, setInputMethod] = useState<InputMethod>('text')
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceError, setVoiceError] = useState('')
  const [voiceDraft, setVoiceDraft] = useState('')
  const textareaId = useId()
  const composerStateRef = useRef(composerState)
  const inputMethodRef = useRef(inputMethod)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const lastFinalTranscriptRef = useRef('')
  const pendingVoiceTranscriptRef = useRef('')
  const silenceTimerRef = useRef<number | null>(null)

  const currentComposerState = resolveComposerState(composerState, value)

  useEffect(() => {
    composerStateRef.current = currentComposerState
  }, [currentComposerState])

  useEffect(() => {
    inputMethodRef.current = inputMethod
  }, [inputMethod])

  const selectedPhrases = getSelectedPhrases(currentComposerState)
  const showRewritePreview =
    currentComposerState.mode === 'rewrite'
    && !currentComposerState.rewriteStarted
    && Boolean(currentComposerState.originalComment)

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  const commitPendingVoiceDraft = () => {
    const transcript = normalizeTranscript(pendingVoiceTranscriptRef.current)
    if (!transcript) return
    if (transcript === lastFinalTranscriptRef.current) {
      pendingVoiceTranscriptRef.current = ''
      return
    }

    const currentState = composerStateRef.current
    const nextValue = commitState(applyVoiceTranscript(currentState, buildChunk(currentState, transcript)))
    onBlur?.(nextValue)
    lastFinalTranscriptRef.current = transcript
    pendingVoiceTranscriptRef.current = ''
    setVoiceDraft('')
    setVoiceError('')
  }

  const scheduleSilenceCommit = () => {
    clearSilenceTimer()
    silenceTimerRef.current = window.setTimeout(() => {
      commitPendingVoiceDraft()
      stopRecognition('ready')
    }, VOICE_SILENCE_MS)
  }

  const stopRecognition = (nextStatus: VoiceStatus = 'ready', options?: { commitDraft?: boolean }) => {
    clearSilenceTimer()
    if (options?.commitDraft) {
      commitPendingVoiceDraft()
    }
    const recognition = recognitionRef.current
    if (!recognition) {
      setVoiceStatus(nextStatus)
      return
    }

    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.stop()
    recognitionRef.current = null
    setVoiceStatus(nextStatus)
  }

  const startRecognition = () => {
    const recognition = createConfiguredRecognition(window as typeof window & SpeechRecognitionSource)
    recognitionRef.current = recognition

    if (!recognition) {
      setVoiceStatus('unsupported')
      setVoiceError('')
      return
    }

    recognition.onresult = (event) => handleVoiceResult(recognition, event)
    recognition.onerror = (event) => handleVoiceError(recognition, event)
    recognition.onend = () => handleVoiceEnd(recognition)

    try {
      recognition.start()
      setVoiceStatus('listening')
      setVoiceError('')
      setVoiceDraft('')
    } catch (error) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognitionRef.current = null
      setVoiceStatus('error')
      setVoiceDraft('')
      setVoiceError(
        error instanceof Error ? `Ошибка голосового ввода: ${error.message}` : 'Не удалось запустить голосовой ввод.',
      )
    }
  }

  useEffect(() => () => {
    clearSilenceTimer()
    const recognition = recognitionRef.current
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.stop()
    recognitionRef.current = null
  }, [])

  const prepareVoiceInput = () => {
    if (!window.isSecureContext) {
      setVoiceStatus('error')
      setVoiceError('Голосовой ввод работает только на localhost или через https.')
      return false
    }

    if (!createConfiguredRecognition(window as typeof window & SpeechRecognitionSource)) {
      setVoiceStatus('unsupported')
      setVoiceError('')
      return false
    }

    setVoiceStatus((current) => (current === 'listening' || current === 'error' ? current : 'ready'))
    return true
  }

  const resetVoiceState = () => {
    stopRecognition('idle')
    setVoiceStatus('idle')
    setVoiceError('')
    setVoiceDraft('')
    lastFinalTranscriptRef.current = ''
    pendingVoiceTranscriptRef.current = ''
  }

  const commitState = (next: CommentComposerState) => {
    const previous = composerStateRef.current
    setComposerState(next)
    composerStateRef.current = next
    const committedComment = getCommittedComment(next)

    if (committedComment !== getCommittedComment(previous)) {
      onChange(committedComment)
    }

    return committedComment
  }

  const handleModeChange = (mode: CommentEditMode) => {
    commitState(setMode(composerStateRef.current, mode))
  }

  const handleTextChange = (nextValue: string) => {
    commitState(applyTextInput(composerStateRef.current, nextValue))
  }

  const handlePhraseClick = (phrase: string) => {
    const currentState = composerStateRef.current
    if (getSelectedPhrases(currentState).has(phrase)) {
      const nextValue = commitState(removePhraseSelection(currentState, phrase))
      onBlur?.(nextValue)
      return
    }

    const nextValue = commitState(applyPhraseSelection(currentState, buildChunk(currentState, phrase)))
    onBlur?.(nextValue)
  }

  const handleVoiceResult = (recognition: SpeechRecognitionLike, event: SpeechRecognitionEventLike) => {
    if (recognitionRef.current !== recognition) return
    if (inputMethodRef.current !== 'voice') return

    const result = event.results[event.resultIndex]
    const currentState = composerStateRef.current

    const transcript = normalizeTranscript(result[0]?.transcript ?? '')
    if (!transcript) return
    pendingVoiceTranscriptRef.current = transcript
    setVoiceDraft(transcript)
    scheduleSilenceCommit()

    if (!result?.isFinal) return
    if (transcript === lastFinalTranscriptRef.current) return

    clearSilenceTimer()
    lastFinalTranscriptRef.current = transcript
    const nextValue = commitState(applyVoiceTranscript(currentState, buildChunk(currentState, transcript)))
    onBlur?.(nextValue)
    pendingVoiceTranscriptRef.current = ''
    setVoiceError('')
    setVoiceDraft('')
  }

  const handleVoiceError = (recognition: SpeechRecognitionLike, event: SpeechRecognitionErrorEventLike) => {
    if (recognitionRef.current !== recognition) return
    recognitionRef.current = null
    setVoiceStatus('error')
    setVoiceError(getVoiceErrorMessage(event))
    pendingVoiceTranscriptRef.current = ''
    setVoiceDraft('')
  }

  const handleVoiceEnd = (recognition: SpeechRecognitionLike) => {
    if (recognitionRef.current !== recognition) return
    recognitionRef.current = null

    if (inputMethodRef.current !== 'voice') return

    setVoiceStatus((current) => (current === 'listening' ? 'ready' : current))
    pendingVoiceTranscriptRef.current = ''
    setVoiceDraft('')
  }

  const handleVoiceToggle = () => {
    if (voiceStatus === 'listening') {
      stopRecognition('ready', { commitDraft: true })
      setVoiceError('')
      return
    }

    if (voiceStatus === 'unsupported') return
    if (!window.isSecureContext) {
      setVoiceStatus('error')
      setVoiceError('Голосовой ввод работает только на localhost или через https.')
      return
    }

    lastFinalTranscriptRef.current = ''
    pendingVoiceTranscriptRef.current = ''
    startRecognition()
  }

  const handleInputMethodChange = (nextMethod: InputMethod) => {
    setInputMethod(nextMethod)
    inputMethodRef.current = nextMethod

    if (nextMethod !== 'voice') {
      resetVoiceState()
      return
    }

    prepareVoiceInput()
  }

  return (
    <section className="comment-composer">
      <div className="comment-composer__control-grid">
        <div className="comment-composer__panel comment-composer__panel--mode">
          <span className="comment-composer__label">Режим</span>
          <ToggleGroup
            value={composerState.mode}
            onChange={handleModeChange}
            options={[
              { value: 'append', label: 'Дополнить' },
              { value: 'rewrite', label: 'Переписать' },
            ]}
          />
        </div>

        <div className="comment-composer__panel comment-composer__panel--input">
          <span className="comment-composer__label">Способ ввода</span>
          <ToggleGroup
            value={inputMethod}
            onChange={handleInputMethodChange}
            options={[
              { value: 'text', label: 'Текст' },
              { value: 'phrases', label: 'Фразы' },
              { value: 'voice', label: 'Голос' },
            ]}
          />
        </div>
      </div>

      {inputMethod === 'phrases' && (
        <div className="comment-composer__phrases" aria-label="Быстрые фразы">
          {PHRASES.map((phrase) => (
            <button
              key={phrase.label}
              type="button"
              className={`comment-composer__phrase ${phrase.wide ? 'comment-composer__phrase--wide' : ''} ${selectedPhrases.has(phrase.label) ? 'comment-composer__phrase--active' : ''}`}
              aria-pressed={selectedPhrases.has(phrase.label)}
              onClick={() => handlePhraseClick(phrase.label)}
            >
              <span className="comment-composer__phrase-label">{phrase.label}</span>
            </button>
          ))}
        </div>
      )}

      {inputMethod === 'voice' && (
        <div className={`comment-composer__voice comment-composer__voice--${voiceStatus}`}>
          <div className="comment-composer__voice-header">
            <span className={`comment-composer__voice-status comment-composer__voice-status--${voiceStatus}`}>
              {getVoiceStatusLabel(voiceStatus)}
            </span>
            {voiceStatus === 'listening' && (
              <span className="comment-composer__voice-live">
                <span className="comment-composer__voice-dot" />
                Слушаю
              </span>
            )}
          </div>
          <button
            type="button"
            className={voiceStatus === 'listening' ? 'btn-primary' : ''}
            onClick={handleVoiceToggle}
          >
            {voiceStatus === 'listening' ? 'Остановить запись' : 'Начать запись'}
          </button>
          <p className="comment-composer__voice-text">{getVoiceMessage(voiceStatus, voiceError)}</p>
          {voiceDraft && <div className="comment-composer__voice-preview">Слышу: {voiceDraft}</div>}
        </div>
      )}

      <div className="form-group comment-composer__textarea-group">
        <label className="form-label" htmlFor={textareaId}>
          Комментарий
        </label>
        {showRewritePreview && (
          <div className="comment-composer__rewrite-preview">
            <div className="comment-composer__rewrite-preview-label">Текущий комментарий</div>
            <div>{currentComposerState.originalComment}</div>
          </div>
        )}
        <textarea
          id={textareaId}
          className="comment-composer__textarea"
          value={showRewritePreview ? '' : getVisibleComment(currentComposerState)}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={() => onBlur?.(getCommittedComment(composerStateRef.current))}
          placeholder={showRewritePreview ? 'Введите новый комментарий...' : 'Комментарий...'}
        />
      </div>
    </section>
  )
}

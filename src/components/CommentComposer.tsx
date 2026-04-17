import { useEffect, useId, useRef, useState } from 'react'
import {
  applyPhraseSelection,
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
  'Нет стандарта выполнения',
  'Стандарт есть, но не соблюдается',
  'Нет регулярного контроля',
  'Контроль нерегулярный',
  'Нет закреплённой ответственности',
  'Процесс выполняется частично',
  'Сотрудник не знает порядок действий',
  'Данные не фиксируются в системе',
  'Нет доказательств выполнения',
  'Требуется отдельная контр-мера',
] as const

interface CommentComposerProps {
  value: string
  onChange: (nextValue: string) => void
  onBlur?: (nextValue: string) => void
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
  return new Set(PHRASES.filter((phrase) => hasPhrase(source, phrase)))
}

function removePhrase(comment: string, phrase: string): string {
  return comment
    .replace(new RegExp(`(^|,\\s*)${escapeRegExp(phrase)}(?=,\\s*|$)`, 'g'), '$1')
    .replace(/,\s*,+/g, ', ')
    .replace(/^,\s*|\s*,\s*$/g, '')
    .trim()
}

function getVoiceMessage(status: VoiceStatus, errorMessage: string): string {
  switch (status) {
    case 'ready':
      return 'Голосовой ввод доступен. Лучше всего работает в Chrome или Edge. Нажмите «Начать запись».'
    case 'unsupported':
      return 'Голосовой ввод недоступен в этом браузере. Откройте страницу в Chrome или Edge.'
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
  const [composerState, setComposerState] = useState(() => createComposerState(value))
  const [inputMethod, setInputMethod] = useState<InputMethod>('text')
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceError, setVoiceError] = useState('')
  const [voiceDraft, setVoiceDraft] = useState('')
  const textareaId = useId()
  const composerStateRef = useRef(composerState)
  const inputMethodRef = useRef(inputMethod)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const keepListeningRef = useRef(false)

  useEffect(() => {
    setComposerState((current) =>
      value === current.workingComment ? current : createComposerState(value),
    )
  }, [value])

  useEffect(() => {
    composerStateRef.current = composerState
  }, [composerState])

  useEffect(() => {
    inputMethodRef.current = inputMethod
  }, [inputMethod])

  const selectedPhrases = getSelectedPhrases(composerState)
  const showRewritePreview =
    composerState.mode === 'rewrite' && !composerState.rewriteStarted && Boolean(composerState.originalComment)

  const stopRecognition = (nextStatus: VoiceStatus = 'ready') => {
    keepListeningRef.current = false
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
      keepListeningRef.current = false
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
      keepListeningRef.current = false
      setVoiceStatus('error')
      setVoiceDraft('')
      setVoiceError(
        error instanceof Error ? `Ошибка голосового ввода: ${error.message}` : 'Не удалось запустить голосовой ввод.',
      )
    }
  }

  useEffect(() => () => {
    stopRecognition('idle')
  }, [])

  useEffect(() => {
    if (inputMethod !== 'voice') {
      stopRecognition('idle')
      setVoiceStatus('idle')
      setVoiceError('')
      setVoiceDraft('')
      return
    }

    if (!window.isSecureContext) {
      setVoiceStatus('error')
      setVoiceError('Голосовой ввод работает только на localhost или через https.')
      return
    }

    if (!createConfiguredRecognition(window as typeof window & SpeechRecognitionSource)) {
      setVoiceStatus('unsupported')
      setVoiceError('')
      return
    }

    setVoiceStatus((current) => (current === 'listening' || current === 'error' ? current : 'ready'))
  }, [inputMethod])

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
    setComposerState((current) => setMode(current, mode))
  }

  const handleTextChange = (nextValue: string) => {
    commitState(applyTextInput(composerState, nextValue))
  }

  const handlePhraseClick = (phrase: string) => {
    const currentState = composerStateRef.current
    if (getSelectedPhrases(currentState).has(phrase)) {
      const nextValue = commitState(applyTextInput(currentState, removePhrase(getCommittedComment(currentState), phrase)))
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
    setVoiceDraft(transcript)

    if (!result?.isFinal) return

    const nextValue = commitState(applyVoiceTranscript(currentState, buildChunk(currentState, transcript)))
    onBlur?.(nextValue)
    setVoiceError('')
    setVoiceDraft('')
  }

  const handleVoiceError = (recognition: SpeechRecognitionLike, event: SpeechRecognitionErrorEventLike) => {
    if (recognitionRef.current !== recognition) return
    recognitionRef.current = null
    keepListeningRef.current = false
    setVoiceStatus('error')
    setVoiceError(getVoiceErrorMessage(event))
    setVoiceDraft('')
  }

  const handleVoiceEnd = (recognition: SpeechRecognitionLike) => {
    if (recognitionRef.current !== recognition) return
    recognitionRef.current = null

    if (inputMethodRef.current !== 'voice') return
    if (keepListeningRef.current) {
      window.setTimeout(() => {
        if (inputMethodRef.current !== 'voice' || !keepListeningRef.current || recognitionRef.current) return
        startRecognition()
      }, 150)
      return
    }

    setVoiceStatus((current) => (current === 'listening' ? 'ready' : current))
    setVoiceDraft('')
  }

  const handleVoiceToggle = () => {
    if (voiceStatus === 'listening') {
      stopRecognition('ready')
      setVoiceError('')
      setVoiceDraft('')
      return
    }

    if (voiceStatus === 'unsupported') return
    if (!window.isSecureContext) {
      setVoiceStatus('error')
      setVoiceError('Голосовой ввод работает только на localhost или через https.')
      return
    }

    keepListeningRef.current = true
    startRecognition()
  }

  return (
    <section className="comment-composer">
      <div className="comment-composer__section">
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

      <div className="comment-composer__section">
        <span className="comment-composer__label">Способ ввода</span>
        <ToggleGroup
          value={inputMethod}
          onChange={setInputMethod}
          options={[
            { value: 'text', label: 'Текст' },
            { value: 'phrases', label: 'Фразы' },
            { value: 'voice', label: 'Голос' },
          ]}
        />
      </div>

      {inputMethod === 'phrases' && (
        <div className="comment-composer__phrases" aria-label="Быстрые фразы">
          {PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              className={`comment-composer__phrase ${selectedPhrases.has(phrase) ? 'comment-composer__phrase--active' : ''}`}
              aria-pressed={selectedPhrases.has(phrase)}
              onClick={() => handlePhraseClick(phrase)}
            >
              {phrase}
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
            <div>{composerState.originalComment}</div>
          </div>
        )}
        <textarea
          id={textareaId}
          className="comment-composer__textarea"
          value={showRewritePreview ? '' : getVisibleComment(composerState)}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={() => onBlur?.(getCommittedComment(composerStateRef.current))}
          placeholder={showRewritePreview ? 'Введите новый комментарий...' : 'Комментарий...'}
        />
      </div>
    </section>
  )
}

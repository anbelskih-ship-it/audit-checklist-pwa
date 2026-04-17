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
  if (!text) return ''
  if (state.mode === 'rewrite' && !state.rewriteStarted) return text
  if (!state.workingComment) return text
  if (/\s$/.test(state.workingComment)) return text
  return ` ${text}`
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
    <div className="comment-composer__toggle-group" role="group">
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
  const textareaId = useId()
  const composerStateRef = useRef(composerState)
  const inputMethodRef = useRef(inputMethod)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

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

  const stopRecognition = (nextStatus: VoiceStatus = 'ready') => {
    const recognition = recognitionRef.current
    if (!recognition) return

    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.stop()
    recognitionRef.current = null
    setVoiceStatus(nextStatus)
  }

  useEffect(() => () => {
    stopRecognition('idle')
  }, [])

  useEffect(() => {
    if (inputMethod !== 'voice') {
      stopRecognition('idle')
      setVoiceStatus('idle')
      setVoiceError('')
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
    const nextValue = commitState(applyPhraseSelection(composerState, buildChunk(composerState, phrase)))
    onBlur?.(nextValue)
  }

  const handleVoiceResult = (recognition: SpeechRecognitionLike, event: SpeechRecognitionEventLike) => {
    if (recognitionRef.current !== recognition) return
    if (inputMethodRef.current !== 'voice') return

    const result = event.results[event.resultIndex]
    const currentState = composerStateRef.current

    if (!result?.isFinal) return

    const transcript = normalizeTranscript(result[0]?.transcript ?? '')
    if (!transcript) return

    const nextValue = commitState(applyVoiceTranscript(currentState, buildChunk(currentState, transcript)))
    onBlur?.(nextValue)
    setVoiceStatus('ready')
    setVoiceError('')
  }

  const handleVoiceError = (recognition: SpeechRecognitionLike, event: SpeechRecognitionErrorEventLike) => {
    if (recognitionRef.current !== recognition) return
    recognitionRef.current = null
    setVoiceStatus('error')
    setVoiceError(event.message || `Ошибка голосового ввода: ${event.error}`)
  }

  const handleVoiceEnd = (recognition: SpeechRecognitionLike) => {
    if (recognitionRef.current !== recognition) return
    recognitionRef.current = null

    if (inputMethodRef.current !== 'voice') return

    setVoiceStatus((current) => (current === 'listening' ? 'ready' : current))
  }

  const handleVoiceToggle = () => {
    if (voiceStatus === 'listening') {
      stopRecognition('ready')
      setVoiceError('')
      return
    }

    if (voiceStatus === 'unsupported') return

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
    } catch (error) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognitionRef.current = null
      setVoiceStatus('error')
      setVoiceError(
        error instanceof Error ? `Ошибка голосового ввода: ${error.message}` : 'Не удалось запустить голосовой ввод.',
      )
    }
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
              className="comment-composer__phrase"
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
          </div>
          <button
            type="button"
            className={voiceStatus === 'listening' ? 'btn-primary' : ''}
            onClick={handleVoiceToggle}
          >
            {voiceStatus === 'listening' ? 'Остановить запись' : 'Начать запись'}
          </button>
          <p className="comment-composer__voice-text">{getVoiceMessage(voiceStatus, voiceError)}</p>
        </div>
      )}

      <div className="form-group comment-composer__textarea-group">
        <label className="form-label" htmlFor={textareaId}>
          Комментарий
        </label>
        <textarea
          id={textareaId}
          className="comment-composer__textarea"
          value={getVisibleComment(composerState)}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={() => onBlur?.(getCommittedComment(composerStateRef.current))}
          placeholder="Комментарий..."
        />
      </div>
    </section>
  )
}

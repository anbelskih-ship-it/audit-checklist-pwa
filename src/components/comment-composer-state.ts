export type CommentEditMode = 'append' | 'rewrite'

export interface CommentComposerState {
  originalComment: string
  mode: CommentEditMode
  rewriteStarted: boolean
  workingComment: string
}

export function createComposerState(comment: string): CommentComposerState {
  return {
    originalComment: comment,
    mode: 'append',
    rewriteStarted: false,
    workingComment: comment,
  }
}

export function setMode(state: CommentComposerState, mode: CommentEditMode): CommentComposerState {
  if (state.mode === mode) return state
  return {
    ...state,
    mode,
  }
}

function applyChunk(state: CommentComposerState, chunk: string): CommentComposerState {
  if (!chunk) return state

  if (state.mode === 'rewrite' && !state.rewriteStarted) {
    return {
      ...state,
      rewriteStarted: true,
      workingComment: chunk,
    }
  }

  return {
    ...state,
    rewriteStarted: state.rewriteStarted || state.mode === 'rewrite',
    workingComment: state.workingComment + chunk,
  }
}

function removeChunk(source: string, chunk: string): string {
  const trimmedChunk = chunk.trim()
  if (!trimmedChunk) return source

  const escapedChunk = trimmedChunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const nextValue = source
    .replace(new RegExp(`(^|,\\s*)${escapedChunk}(?=,\\s*|$)`), '')
    .replace(/^,\s*/, '')
    .replace(/,\s*,/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/,\s*$/, '')

  return nextValue
}

export function applyTextInput(state: CommentComposerState, nextValue: string): CommentComposerState {
  if (state.workingComment === nextValue) return state

  if (state.mode === 'rewrite' && !state.rewriteStarted) {
    if (nextValue === state.originalComment) return state

    return {
      ...state,
      rewriteStarted: true,
      workingComment: nextValue,
    }
  }

  return {
    ...state,
    rewriteStarted: state.rewriteStarted || state.mode === 'rewrite',
    workingComment: nextValue,
  }
}

export function applyPhraseSelection(state: CommentComposerState, phrase: string): CommentComposerState {
  return applyChunk(state, phrase)
}

export function removePhraseSelection(state: CommentComposerState, phrase: string): CommentComposerState {
  const nextValue = removeChunk(state.workingComment, phrase)
  if (nextValue === state.workingComment) return state

  return {
    ...state,
    workingComment: nextValue,
  }
}

export function applyVoiceTranscript(state: CommentComposerState, transcript: string): CommentComposerState {
  return applyChunk(state, transcript)
}

export function getVisibleComment(state: CommentComposerState): string {
  return state.workingComment
}

export function getCommittedComment(state: CommentComposerState): string {
  return state.workingComment
}

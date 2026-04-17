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

export function applyVoiceTranscript(state: CommentComposerState, transcript: string): CommentComposerState {
  return applyChunk(state, transcript)
}

export function getVisibleComment(state: CommentComposerState): string {
  return state.workingComment
}

export function getCommittedComment(state: CommentComposerState): string {
  return state.workingComment
}

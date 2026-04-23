import { describe, expect, it } from 'vitest'
import {
  applyPhraseSelection,
  applyTextInput,
  applyVoiceTranscript,
  createComposerState,
  getCommittedComment,
  getVisibleComment,
  removePhraseSelection,
  setMode,
} from './comment-composer-state'

describe('comment-composer-state', () => {
  it('updates typed text in append mode from the full textarea value', () => {
    const state = applyTextInput(createComposerState('База'), 'База еще')

    expect(getVisibleComment(state)).toBe('База еще')
    expect(getCommittedComment(state)).toBe('База еще')
  })

  it('appends a selected phrase in append mode', () => {
    const state = applyPhraseSelection(createComposerState('База'), ', фраза')

    expect(getVisibleComment(state)).toBe('База, фраза')
    expect(getCommittedComment(state)).toBe('База, фраза')
  })

  it('appends a voice transcript in append mode', () => {
    const state = applyVoiceTranscript(createComposerState('База'), ', голосом')

    expect(getVisibleComment(state)).toBe('База, голосом')
    expect(getCommittedComment(state)).toBe('База, голосом')
  })

  it('keeps the original comment visible after switching to rewrite mode', () => {
    const state = setMode(createComposerState('База'), 'rewrite')

    expect(getVisibleComment(state)).toBe('База')
    expect(getCommittedComment(state)).toBe('База')
  })

  it('allows rewriting to an empty string as the first meaningful text input', () => {
    const state = applyTextInput(setMode(createComposerState('База'), 'rewrite'), '')

    expect(state.rewriteStarted).toBe(true)
    expect(getVisibleComment(state)).toBe('')
    expect(getCommittedComment(state)).toBe('')
  })

  it('keeps an already empty comment unchanged on the first rewrite input', () => {
    const state = applyTextInput(setMode(createComposerState(''), 'rewrite'), '')

    expect(state.rewriteStarted).toBe(false)
    expect(getVisibleComment(state)).toBe('')
    expect(getCommittedComment(state)).toBe('')
  })

  it('starts a new version on the first rewrite text input', () => {
    const state = applyTextInput(setMode(createComposerState('База'), 'rewrite'), 'Новый текст')

    expect(getVisibleComment(state)).toBe('Новый текст')
    expect(getCommittedComment(state)).toBe('Новый текст')
  })

  it('starts a new version on the first rewrite phrase selection', () => {
    const state = applyPhraseSelection(setMode(createComposerState('База'), 'rewrite'), 'Новая фраза')

    expect(getVisibleComment(state)).toBe('Новая фраза')
    expect(getCommittedComment(state)).toBe('Новая фраза')
  })

  it('starts a new version on the first rewrite voice transcript', () => {
    const state = applyVoiceTranscript(setMode(createComposerState('База'), 'rewrite'), 'Новое голосом')

    expect(getVisibleComment(state)).toBe('Новое голосом')
    expect(getCommittedComment(state)).toBe('Новое голосом')
  })

  it('removes every repeated selected phrase when toggled off', () => {
    const state = removePhraseSelection(createComposerState('Нет контроля, База, Нет контроля'), 'Нет контроля')

    expect(getVisibleComment(state)).toBe('База')
    expect(getCommittedComment(state)).toBe('База')
  })

  it('continues the rewritten version after switching back to append mode and rewriting again', () => {
    const rewritten = applyTextInput(setMode(createComposerState('База'), 'rewrite'), 'Новый')
    const appended = applyTextInput(setMode(rewritten, 'append'), 'Новый текст')
    const rewrittenAgain = applyTextInput(setMode(appended, 'rewrite'), 'Новый текст и ещё')

    expect(getVisibleComment(rewrittenAgain)).toBe('Новый текст и ещё')
    expect(getCommittedComment(rewrittenAgain)).toBe('Новый текст и ещё')
  })
})

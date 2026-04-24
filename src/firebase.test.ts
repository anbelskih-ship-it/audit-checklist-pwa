import { describe, expect, it } from 'vitest'
import { googleProvider } from './firebase'

describe('googleProvider', () => {
  it('requests full Drive write access for shared project exports', () => {
    expect(googleProvider.customParameters).toMatchObject({
      prompt: 'consent select_account',
    })
    expect(googleProvider.scopes).toContain('https://www.googleapis.com/auth/drive')
    expect(googleProvider.scopes).not.toContain('https://www.googleapis.com/auth/drive.file')
  })
})

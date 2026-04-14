import { describe, expect, it } from 'vitest'
import { getLoginStrategy } from './auth-login-strategy'

describe('getLoginStrategy', () => {
  it('uses popup on iPhone Safari', () => {
    expect(getLoginStrategy('Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'))
      .toBe('popup')
  })

  it('uses popup on iPad', () => {
    expect(getLoginStrategy('Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'))
      .toBe('popup')
  })

  it('uses popup on desktop Chrome', () => {
    expect(getLoginStrategy('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'))
      .toBe('popup')
  })

  it('uses redirect on Android', () => {
    expect(getLoginStrategy('Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36'))
      .toBe('redirect')
  })
})

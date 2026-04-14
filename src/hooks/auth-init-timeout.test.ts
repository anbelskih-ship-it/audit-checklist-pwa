import { describe, expect, it } from 'vitest'
import { getAuthInitTimeoutMs } from './auth-init-timeout'

describe('getAuthInitTimeoutMs', () => {
  it('uses shorter timeout on iPhone Safari', () => {
    expect(getAuthInitTimeoutMs('Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'))
      .toBe(4000)
  })

  it('uses default timeout on desktop', () => {
    expect(getAuthInitTimeoutMs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'))
      .toBe(8000)
  })
})

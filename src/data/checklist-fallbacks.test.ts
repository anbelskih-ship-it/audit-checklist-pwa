import { describe, expect, it } from 'vitest'
import { ASP_FALLBACK, NA_FALLBACK } from './checklist-fallbacks'

describe('checklist fallbacks', () => {
  it('contains non-empty ASP structure', () => {
    expect(ASP_FALLBACK.sheets.length).toBeGreaterThan(0)
  })

  it('contains non-empty NA structure', () => {
    expect(NA_FALLBACK.sheets.length).toBeGreaterThan(0)
  })
})

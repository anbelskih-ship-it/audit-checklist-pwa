import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('comment composer touch styles', () => {
  it('resets hover visuals for phrase buttons on touch devices', () => {
    const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')

    expect(css).toContain('@media (hover: none)')
    expect(css).toContain('.comment-composer__phrase:hover')
    expect(css).toContain('background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 96%, var(--color-bg) 4%) 0%, color-mix(in srgb, var(--color-surface) 88%, var(--color-bg) 12%) 100%)')
    expect(css).toContain('border-color: color-mix(in srgb, var(--color-border) 82%, var(--color-primary) 18%)')
  })
})

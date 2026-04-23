import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlobFile } from './file-download'

describe('downloadBlobFile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('attaches a temporary link, clicks it, and revokes the object URL later', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlobFile(blob, 'report.pdf')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    vi.runAllTimers()

    expect(removeSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})

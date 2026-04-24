import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAccessTokenMock = vi.fn()

vi.mock('./auth', () => ({
  getAccessToken: () => getAccessTokenMock(),
}))

describe('downloadFile', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('downloads a public spreadsheet export when Drive token is missing', async () => {
    getAccessTokenMock.mockResolvedValue(null)

    const arrayBuffer = new TextEncoder().encode('xlsx').buffer
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => arrayBuffer,
    })

    vi.stubGlobal('fetch', fetchMock)

    const { downloadFile } = await import('./drive-api')
    const result = await downloadFile('sheet123')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/sheet123/export?format=xlsx'
    )
    expect(result).toBe(arrayBuffer)
  })
})

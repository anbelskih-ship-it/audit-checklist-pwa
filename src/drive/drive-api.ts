import { getAccessToken } from './auth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const API_KEY = 'AIzaSyCrwBoqSBQDVFq5qf43WNBhoyA5NkboXQE'
const XLSX_EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const GOOGLE_SHEETS_MIME = 'application/vnd.google-apps.spreadsheet'

function getPublicSpreadsheetExportUrl(fileId: string): string {
  return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  return fetch(`${DRIVE_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
}

/** Read-only request using API Key (no OAuth needed) */
function drivePublicRequest(path: string): Promise<Response> {
  const separator = path.includes('?') ? '&' : '?'
  return fetch(`${DRIVE_API}${path}${separator}key=${API_KEY}`)
}

async function readErrorDetails(resp: Response): Promise<string> {
  try {
    const text = await resp.text()
    if (!text) return ''
    try {
      const data = JSON.parse(text)
      const message = data?.error?.message || data?.error_description || text
      return String(message)
    } catch {
      return text
    }
  } catch {
    return ''
  }
}

export async function getFileMetadata(
  fileId: string
): Promise<{ modifiedTime: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean }> {
  const token = await getAccessToken()
  const resp = token
    ? await driveRequest(`/files/${fileId}?fields=modifiedTime,name,mimeType,parents,trashed`)
    : await drivePublicRequest(`/files/${fileId}?fields=modifiedTime,name,mimeType,parents,trashed`)
  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Metadata failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
  return resp.json()
}

export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const token = await getAccessToken()
  if (!token) {
    const publicResp = await fetch(getPublicSpreadsheetExportUrl(fileId))
    if (!publicResp.ok) {
      const details = await readErrorDetails(publicResp)
      throw new Error(`Template export failed: ${publicResp.status}${details ? ` - ${details}` : ''}`)
    }
    return publicResp.arrayBuffer()
  }
  const exportPath = `/files/${fileId}/export?mimeType=${encodeURIComponent(XLSX_EXPORT_MIME)}`
  const resp = await driveRequest(exportPath)

  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Template export failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
  return resp.arrayBuffer()
}

export async function listFilesInFolder(
  folderId: string
): Promise<{ id: string; name: string; modifiedTime: string; mimeType: string }[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const resp = await driveRequest(`/files?q=${q}&fields=files(id,name,modifiedTime,mimeType)`)
  const data = await resp.json()
  return data.files || []
}

export async function uploadFile(
  folderId: string,
  fileName: string,
  content: Blob,
  mimeType: string
): Promise<string> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const metadata = { name: fileName, parents: [folderId], mimeType }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', content)

  const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Upload failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
  const data = await resp.json()
  return data.id
}

export async function copySpreadsheetFile(
  sourceFileId: string,
  folderId: string,
  fileName: string
): Promise<string> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const resp = await fetch(`${DRIVE_API}/files/${sourceFileId}/copy?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: fileName,
      parents: [folderId],
    }),
  })

  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Copy failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }

  const data = await resp.json()
  return data.id
}

export async function deleteFile(fileId: string): Promise<void> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const resp = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Delete failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
}

export async function updateFile(
  fileId: string,
  fileName: string,
  content: Blob,
  mimeType: string
): Promise<void> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const boundary = `audit-boundary-${Date.now()}`
  const metadata = { name: fileName, mimeType }
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ])

  const resp = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })

  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Update failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
}

export function isGoogleSpreadsheetMime(mimeType?: string): boolean {
  return mimeType === GOOGLE_SHEETS_MIME
}

export interface SpreadsheetValueUpdate {
  range: string
  values: (string | number)[][]
}

export async function clearSpreadsheetRanges(spreadsheetId: string, ranges: string[]): Promise<void> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  if (!ranges.length) return

  const resp = await fetch(`${SHEETS_API}/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ranges }),
  })

  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Batch clear failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
}

export async function updateSpreadsheetValues(
  spreadsheetId: string,
  data: SpreadsheetValueUpdate[]
): Promise<void> {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')
  if (!data.length) return

  const resp = await fetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data,
    }),
  })

  if (!resp.ok) {
    const details = await readErrorDetails(resp)
    throw new Error(`Batch update failed: ${resp.status}${details ? ` - ${details}` : ''}`)
  }
}

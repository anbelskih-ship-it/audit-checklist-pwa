import { getAccessToken } from './auth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const API_KEY = 'AIzaSyCrwBoqSBQDVFq5qf43WNBhoyA5NkboXQE'

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

export async function getFileMetadata(fileId: string): Promise<{ modifiedTime: string; name: string }> {
  const token = await getAccessToken()
  const resp = token
    ? await driveRequest(`/files/${fileId}?fields=modifiedTime,name`)
    : await drivePublicRequest(`/files/${fileId}?fields=modifiedTime,name`)
  return resp.json()
}

export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const token = await getAccessToken()
  if (token) {
    const resp = await driveRequest(`/files/${fileId}?alt=media`)
    return resp.arrayBuffer()
  }
  // Google Sheets: export as xlsx via API Key
  const resp = await drivePublicRequest(
    `/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  )
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
  return resp.arrayBuffer()
}

export async function listFilesInFolder(folderId: string): Promise<{ id: string; name: string; modifiedTime: string }[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const resp = await driveRequest(`/files?q=${q}&fields=files(id,name,modifiedTime)`)
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
  const data = await resp.json()
  return data.id
}

const CLOUD_FUNCTION_URL = import.meta.env.VITE_AUTH_FUNCTION_URL || ''
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
const REDIRECT_URI = `${window.location.origin}/login`

interface Tokens {
  access_token: string
  refresh_token?: string
  expires_at: number
}

const STORAGE_KEY = 'audit_auth_tokens'

export function getStoredTokens(): Tokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

function storeTokens(tokens: Tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string): Promise<Tokens> {
  const resp = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'exchange', code, redirect_uri: REDIRECT_URI }),
  })
  const data = await resp.json()
  if (data.error) throw new Error(data.error)
  const tokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }
  storeTokens(tokens)
  return tokens
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) return null

  if (Date.now() < tokens.expires_at) return tokens.access_token

  if (!tokens.refresh_token) return null

  try {
    const resp = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh', refresh_token: tokens.refresh_token }),
    })
    const data = await resp.json()
    if (data.error) { clearTokens(); return null }
    tokens.access_token = data.access_token
    tokens.expires_at = Date.now() + (data.expires_in - 60) * 1000
    storeTokens(tokens)
    return tokens.access_token
  } catch {
    return null
  }
}

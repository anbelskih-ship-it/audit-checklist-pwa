const CLOUD_FUNCTION_URL = import.meta.env.VITE_AUTH_FUNCTION_URL || ''

interface Tokens {
  access_token: string
  refresh_token?: string
  expires_at: number
}

const STORAGE_KEY = 'audit_auth_tokens'

function getStoredTokens(): Tokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function storeTokens(tokens: Tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
}

export function storeAccessToken(accessToken: string, expiresInSeconds = 3600) {
  storeTokens({
    access_token: accessToken,
    expires_at: Date.now() + Math.max(expiresInSeconds - 60, 60) * 1000,
  })
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) return null

  if (Date.now() < tokens.expires_at) return tokens.access_token

  if (!tokens.refresh_token) {
    clearTokens()
    return null
  }

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

export function hasValidAccessToken(): boolean {
  const tokens = getStoredTokens()
  return Boolean(tokens && Date.now() < tokens.expires_at)
}

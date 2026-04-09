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

function storeTokens(tokens: Tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
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

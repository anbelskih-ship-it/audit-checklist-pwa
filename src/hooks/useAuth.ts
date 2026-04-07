import { useState, useEffect } from 'react'
import { getStoredTokens, getAccessToken, clearTokens } from '../drive/auth'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getStoredTokens())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAccessToken().then(token => {
      setIsLoggedIn(!!token)
      setLoading(false)
    })
  }, [])

  const logout = () => { clearTokens(); setIsLoggedIn(false) }

  return { isLoggedIn, loading, logout }
}

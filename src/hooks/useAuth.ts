import { useState, useEffect } from 'react'
import {
  onAuthStateChanged, signInWithRedirect, signInWithPopup,
  getRedirectResult, signOut, type User, GoogleAuthProvider, type UserCredential,
  setPersistence, browserLocalPersistence, type AuthError,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { clearTokens, storeAccessToken } from '../drive/auth'
import { getLoginStrategy } from './auth-login-strategy'

function saveDriveTokenFromCredential(result: UserCredential) {
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (credential?.accessToken) {
    storeAccessToken(credential.accessToken)
  }
}

function formatAuthError(error: unknown): string {
  const code = (error as AuthError | undefined)?.code
  if (code === 'auth/popup-blocked') return 'Safari заблокировал окно входа. Откройте ссылку напрямую в Safari и повторите попытку.'
  if (code === 'auth/popup-closed-by-user') return 'Окно входа было закрыто до завершения авторизации.'
  if (code === 'auth/cancelled-popup-request') return 'Запрос входа был отменен. Попробуйте еще раз.'
  if (code === 'auth/unauthorized-domain') return 'Домен не разрешен в настройках Firebase Auth.'
  return 'Не удалось выполнить вход через Google. Попробуйте еще раз.'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Check redirect result first (mobile flow)
    getRedirectResult(auth)
      .then(result => {
        if (result) saveDriveTokenFromCredential(result)
      })
      .catch(error => {
        setAuthError(formatAuthError(error))
      })

    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = async () => {
    setAuthError(null)
    await setPersistence(auth, browserLocalPersistence)

    try {
      const strategy = getLoginStrategy(window.navigator.userAgent)

      if (strategy === 'popup') {
        const result = await signInWithPopup(auth, googleProvider)
        saveDriveTokenFromCredential(result)
        return
      }

      await signInWithRedirect(auth, googleProvider)
    } catch (error) {
      setAuthError(formatAuthError(error))
    }
  }

  const logout = () => {
    clearTokens()
    return signOut(auth)
  }

  return { user, loading, login, logout, authError }
}

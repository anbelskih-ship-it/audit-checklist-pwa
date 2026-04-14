import { useState, useEffect } from 'react'
import {
  onAuthStateChanged, signInWithRedirect, signInWithPopup,
  getRedirectResult, signOut, type User, GoogleAuthProvider, type UserCredential,
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check redirect result first (mobile flow)
    getRedirectResult(auth)
      .then(result => {
        if (result) saveDriveTokenFromCredential(result)
      })
      .catch(() => {})

    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = async () => {
    const strategy = getLoginStrategy(window.navigator.userAgent)

    if (strategy === 'popup') {
      const result = await signInWithPopup(auth, googleProvider)
      saveDriveTokenFromCredential(result)
      return
    }

    await signInWithRedirect(auth, googleProvider)
  }

  const logout = () => {
    clearTokens()
    return signOut(auth)
  }

  return { user, loading, login, logout }
}

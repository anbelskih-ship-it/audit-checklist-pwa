import { useState, useEffect } from 'react'
import {
  onAuthStateChanged, signInWithRedirect, signInWithPopup,
  getRedirectResult, signOut, type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check redirect result first (mobile flow)
    getRedirectResult(auth).catch(() => {})

    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = async () => {
    try {
      // Try popup first (works on desktop)
      await signInWithPopup(auth, googleProvider)
    } catch {
      // Fallback to redirect (works on mobile)
      await signInWithRedirect(auth, googleProvider)
    }
  }

  const logout = () => signOut(auth)

  return { user, loading, login, logout }
}

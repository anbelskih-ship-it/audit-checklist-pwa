import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'auto'
const STORAGE_KEY = 'theme-preference'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || 'auto',
  )

  const effectiveTheme = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') {
      root.removeAttribute('data-theme')
      localStorage.removeItem(STORAGE_KEY)
    } else {
      root.setAttribute('data-theme', theme)
      localStorage.setItem(STORAGE_KEY, theme)
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', effectiveTheme === 'dark' ? '#121212' : '#1976d2')
    }
  }, [theme, effectiveTheme])

  const toggle = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'dark') return 'light'
      return 'dark'
    })
  }, [])

  return { theme, effectiveTheme, setTheme: setThemeState, toggle }
}

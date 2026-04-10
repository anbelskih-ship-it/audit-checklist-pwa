import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const { effectiveTheme, toggle } = useTheme()
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={effectiveTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      {effectiveTheme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  )
}
